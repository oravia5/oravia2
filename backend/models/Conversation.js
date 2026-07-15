import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageText: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup by participant
conversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', conversationSchema);
