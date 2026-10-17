import mongoose from 'mongoose'

const authSessionSchema = new mongoose.Schema({
  sid: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true, strict: 'throw' })

export default mongoose.model('AuthSession', authSessionSchema)
