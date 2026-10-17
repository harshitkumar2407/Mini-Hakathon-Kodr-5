import jwt from 'jsonwebtoken'
import AuthSession from '../models/AuthSession.js'
import User from '../models/User.js'

function requireAuth(getEnv) {
  return async function authenticateRequest(req, res, next) {
    const token = req.cookies?.proctorvision_session
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' })
    }

    try {
      const { jwtSecret } = getEnv()
      const payload = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'proctorvision-api',
        audience: 'proctorvision-client',
      })

      if (
        typeof payload !== 'object'
        || typeof payload.sub !== 'string'
        || typeof payload.sid !== 'string'
      ) {
        return res.status(401).json({ error: 'Authentication required.' })
      }

      const session = await AuthSession.findOne({
        sid: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      if (!session) {
        return res.status(401).json({ error: 'Authentication required.' })
      }

      const user = await User.findOne({ _id: payload.sub, isActive: true })
        .select('_id displayName email role')
      if (!user) {
        return res.status(401).json({ error: 'Authentication required.' })
      }

      req.user = {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      }
      req.authSession = session
      return next()
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Authentication required.' })
      }
      return next(error)
    }
  }
}

export default requireAuth
