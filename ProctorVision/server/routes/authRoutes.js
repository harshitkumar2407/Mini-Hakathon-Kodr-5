import argon2 from 'argon2'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import AuthSession from '../models/AuthSession.js'
import User from '../models/User.js'
import requireAuth from '../middleware/requireAuth.js'

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000
const sessionCookieName = 'proctorvision_session'
const dummyPasswordHash = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id })
const userSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(10).max(128),
  inviteCode: z.string().max(256).optional(),
}).strict()
const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
  role: z.enum(['student', 'teacher']),
}).strict()

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  }
}

function clearCookieOptions(config) {
  const options = cookieOptions(config)
  delete options.maxAge
  return options
}

function publicUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
  }
}

function createAuthRouter(getEnv) {
  const router = Router()
  const authenticate = requireAuth(getEnv)

  async function register(role, req, res, next) {
    const parsed = userSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Check the name, email, and password fields.' })
    }

    const config = getEnv()
    if (role === 'teacher') {
      const inviteCode = parsed.data.inviteCode ?? ''
      if (!constantTimeEquals(inviteCode, config.teacherInviteCode)) {
        return res.status(403).json({ error: 'A valid teacher invitation code is required.' })
      }
    }

    try {
      const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id })
      const user = await User.create({
        displayName: parsed.data.displayName,
        email: parsed.data.email,
        passwordHash,
        role,
      })
      return await createSession(user, config, res, 201)
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ error: 'An account with those details already exists.' })
      }
      return next(error)
    }
  }

  async function createSession(user, config, res, statusCode = 200) {
    const sid = randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    await AuthSession.create({ sid, userId: user._id, expiresAt })
    const token = jwt.sign({ sid }, config.jwtSecret, {
      algorithm: 'HS256',
      subject: user.id,
      issuer: 'proctorvision-api',
      audience: 'proctorvision-client',
      expiresIn: Math.floor(SESSION_DURATION_MS / 1000),
    })
    res.cookie(sessionCookieName, token, cookieOptions(config))
    return res.status(statusCode).json({ user: publicUser(user) })
  }

  router.post('/register/student', async (req, res, next) => register('student', req, res, next))
  router.post('/register/teacher', async (req, res, next) => register('teacher', req, res, next))

  router.post('/login', async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Enter a valid email and password.' })
    }

    try {
      const config = getEnv()
      const user = await User.findOne({ email: parsed.data.email, isActive: true }).select('+passwordHash')
      const validPassword = await argon2.verify(
        user?.passwordHash ?? dummyPasswordHash,
        parsed.data.password,
      )

      if (!user || !validPassword || user.role !== parsed.data.role) {
        return res.status(401).json({ error: 'Email or password is incorrect for this account type.' })
      }
      return await createSession(user, config, res)
    } catch (error) {
      return next(error)
    }
  })

  router.get('/me', authenticate, (req, res) => res.json({ user: req.user }))

  router.post('/logout', async (req, res, next) => {
    const config = getEnv()
    const token = req.cookies?.[sessionCookieName]
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret, {
          algorithms: ['HS256'],
          issuer: 'proctorvision-api',
          audience: 'proctorvision-client',
        })
        if (typeof payload === 'object' && typeof payload.sid === 'string') {
          await AuthSession.updateOne({ sid: payload.sid, revokedAt: null }, { revokedAt: new Date() })
        }
      } catch (error) {
        if (!(error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError)) {
          return next(error)
        }
      }
    }
    res.clearCookie(sessionCookieName, clearCookieOptions(config))
    return res.status(204).end()
  })

  return router
}

export default createAuthRouter
