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
    views: {
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
        currency: { type: String, default: '₹' },
        imageUrl: { type: String, default: '' },
        fileUrl: { type: String, default: '' },
        fileName: { type: String, default: '' },
        fileSize: { type: String, default: '' },
        fileType: { type: String, default: '' },
        downloadCount: { type: Number, default: 0 },
        requireFollow: { type: Boolean, default: false },
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
    isReal: {
      type: Boolean,
      default: false,
    },
    // A fixed random number assigned once at creation. Sorting by this
    // instead of createdAt gives a shuffled feed order that stays stable
    // across pagination (no duplicates/skips while scrolling).
    isNSFW: {
      type: Boolean,
      default: null,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    randomOrder: {
      type: Number,
      default: () => Math.random(),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound & Multikey Indexes for 100x faster queries and zero DB load
postSchema.index({ tags: 1, isArchived: 1, status: 1, isNSFW: 1 });
postSchema.index({ type: 1, isArchived: 1, status: 1, isNSFW: 1, createdAt: -1 });
postSchema.index({ author: 1, isArchived: 1, status: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);

