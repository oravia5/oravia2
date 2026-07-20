import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    displayName: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    coverUrl: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    dob: {
      type: Date,
    },
    profession: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: '',
    },
    profileVisibilityControls: {
      showWebsite: {
        type: Boolean,
        default: true,
      },
      showLocation: {
        type: Boolean,
        default: true,
      },
      showJoinedDate: {
        type: Boolean,
        default: true,
      },
      showDob: {
        type: Boolean,
        default: true,
      },
      showProfession: {
        type: Boolean,
        default: true,
      },
      showGender: {
        type: Boolean,
        default: true,
      },
      showPhone: {
        type: Boolean,
        default: true,
      },
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    savedProducts: [
      {
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post',
        },
        productId: {
          type: mongoose.Schema.Types.ObjectId,
        },
      }
    ],
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    showNSFW: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export default mongoose.model('User', userSchema);

