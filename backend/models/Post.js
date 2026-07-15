import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author is required'],
    },
    type: {
      type: String,
      enum: ['photo', 'video', 'reel'],
      required: [true, 'Post type must be photo, video, or reel'],
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required'],
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    shareCount: {
      type: Number,
      default: 0,
    },
    products: [
      {
        type: { type: String, default: '' },
        title: { type: String, required: true },
        link: { type: String, default: '' },
        price: { type: String, default: '' },
        originalPrice: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        fileUrl: { type: String, default: '' },
        fileName: { type: String, default: '' },
      }
    ],
    album: {
      type: String,
      default: '',
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      }
    ],
    mediaItems: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['photo', 'video'], required: true },
        thumbnailUrl: { type: String, default: '' },
      }
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['published', 'draft'],
      default: 'published',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Post', postSchema);

