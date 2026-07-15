import mongoose from 'mongoose';
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required for OTP mapping'],
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: [true, 'OTP code is required'],
    },
    purpose: {
      type: String,
      enum: ['register', 'forgot_password'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '10m' },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model('OTP', otpSchema);
