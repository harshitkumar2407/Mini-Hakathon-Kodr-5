import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'

function createRoleRouter(role, getEnv) {
  const router = Router()
  router.use(requireAuth(getEnv), requireRole(role))
  router.get('/access', (req, res) => {
    res.json({ user: req.user, role })
  })
  return router
}

export default createRoleRouter
