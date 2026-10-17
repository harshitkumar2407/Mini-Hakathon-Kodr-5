import 'dotenv/config'

function getEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'TEACHER_INVITE_CODE']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`)
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.')
  }

  return {
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    teacherInviteCode: process.env.TEACHER_INVITE_CODE,
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    port: Number(process.env.PORT ?? 3000),
    isProduction: process.env.NODE_ENV === 'production',
  }
}

export default getEnv
