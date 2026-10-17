import getEnv from './config/env.js'
import createApp from './app.js'
import mongoose from 'mongoose'

async function main() {
  let stage = 'environment configuration'
  try {
    const config = getEnv()
    stage = 'MongoDB connection'
    await mongoose.connect(config.mongoUri)
    const app = createApp(getEnv)
    app.listen(config.port, () => {
      console.log(`ProctorVision API listening on port ${config.port}`)
    })
  } catch (error) {
    const detail = stage === 'environment configuration'
      ? error.message
      : `${error.name}. Check that MONGODB_URI is valid and the database is reachable.`
    console.error(`Unable to start the ProctorVision API (${stage}): ${detail}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Unexpected API startup failure:', error.name)
  process.exitCode = 1
})
