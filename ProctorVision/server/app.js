import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import createAuthRouter from './routes/authRoutes.js'
import createRoleRouter from './routes/roleRoutes.js'

function requireSameOrigin(frontendOrigin) {
  return function checkOrigin(req, res, next) {
    if (req.get('origin') !== frontendOrigin) {
      return res.status(403).json({ error: 'Request origin is not allowed.' })
    }
    return next()
  }
}

function createApp(getEnv) {
  const config = getEnv()
  const app = express()
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Try again later.' },
  })

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    origin: config.frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }))
  app.use(express.json({ limit: '16kb', strict: true }))
  app.use(cookieParser())

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

  const originCheck = requireSameOrigin(config.frontendOrigin)
  app.use('/api/auth/register', originCheck, authLimiter)
  app.use('/api/auth/login', originCheck, authLimiter)
  app.use('/api/auth/logout', originCheck)
  app.use('/api/auth', createAuthRouter(getEnv))
  app.use('/api/student', createRoleRouter('student', getEnv))
  app.use('/api/teacher', createRoleRouter('teacher', getEnv))

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error)
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must contain valid JSON.' })
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' })
    }
    console.error(`API request failed (${req.method} ${req.path}):`, error.name)
    return res.status(500).json({ error: 'An unexpected server error occurred.' })
  })

  return app
}

export default createApp
