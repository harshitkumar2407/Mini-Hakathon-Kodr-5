import argon2 from 'argon2'
import mongoose from 'mongoose'
import getEnv from '../config/env.js'
import User from '../models/User.js'

const accounts = [
  {
    displayName: 'Default Student',
    email: 'student@gmail.com',
    role: 'student',
    password: process.env.DEFAULT_STUDENT_PASSWORD,
  },
  {
    displayName: 'Default Teacher',
    email: 'teacher@gmail.com',
    role: 'teacher',
    password: process.env.DEFAULT_TEACHER_PASSWORD,
  },
]

async function seedAccount({ displayName, email, role, password }) {
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    if (existingUser.role !== role) {
      throw new Error(`Cannot seed ${email}: an account with a different role already exists.`)
    }
    console.log(`${role} account already exists: ${email}`)
    return
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  try {
    await User.create({ displayName, email, role, passwordHash })
    console.log(`Created ${role} account: ${email}`)
  } catch (error) {
    if (error?.code !== 11000) throw error

    const racedUser = await User.findOne({ email })
    if (racedUser?.role !== role) {
      throw new Error(`Cannot seed ${email}: an account with a different role already exists.`)
    }
    console.log(`${role} account already exists: ${email}`)
  }
}

async function main() {
  const config = getEnv()
  if (config.isProduction) {
    throw new Error('Default accounts may only be seeded outside production.')
  }

  for (const account of accounts) {
    if (!account.password || account.password.length < 10 || account.password.length > 128) {
      throw new Error(`Set a password of 10-128 characters for ${account.email} in .env.`)
    }
  }

  await mongoose.connect(config.mongoUri)
  try {
    for (const account of accounts) {
      await seedAccount(account)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error('Unable to seed default accounts:', error.message)
  process.exitCode = 1
})
