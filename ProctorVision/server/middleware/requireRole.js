function requireRole(role) {
  return function authorizeRole(req, res, next) {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' })
    }
    return next()
  }
}

export default requireRole
