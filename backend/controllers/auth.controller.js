import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import StorageService from '../services/storage.service.js';
import { sendOTPEmail } from '../services/email.service.js';

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wisp_secret_token_2026_key_99', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Register new user (sends verification OTP)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, phone, displayName, bio, showNSFW } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, phone, and password',
      });
    }

    // 1. Check if a VERIFIED user already exists
    const verifiedUserExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      isVerified: true,
    });

    if (verifiedUserExists) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    // 2. Delete any existing UNVERIFIED accounts with same username/email to prevent lockout/clashes
    await User.deleteOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      isVerified: false,
    });

    // Set default avatar URL for new users
    const avatarUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

    // 3. Create unverified user
    const user = await User.create({
      username,
      email,
      phone,
      passwordHash: password, // pre-save hook will hash this
      displayName: displayName || username,
      bio: bio || '',
      avatarUrl,
      isVerified: false, // Explicitly unverified until OTP check
      showNSFW: showNSFW === 'true' || showNSFW === true,
    });

    // 4. Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Delete any old registration OTPs for this email
    await OTP.deleteOne({ email: email.toLowerCase(), purpose: 'register' });

    // Store OTP in database
    await OTP.create({
      email: email.toLowerCase(),
      code: otpCode,
      purpose: 'register',
      expiresAt,
    });

    // 5. Send OTP to user's email via Nodemailer
    const emailSent = await sendOTPEmail(email.toLowerCase(), otpCode, 'register');
    
    if (!emailSent) {
      // If email fails, delete unverified user so they can retry
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to email. Please verify to activate your account.',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

/**
 * @desc    Verify registration OTP & activate user account
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyRegisterOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP code',
      });
    }

    // Find the unverified user
    const user = await User.findOne({ email: email.toLowerCase(), isVerified: false });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Account not found or already verified',
      });
    }

    // Validate the OTP code
    const otp = await OTP.findOne({
      email: email.toLowerCase(),
      code: code.trim(),
      purpose: 'register',
    });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    // Activate the user
    user.isVerified = true;
    await user.save();

    // Delete the verified OTP
    await otp.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Email verified and account activated successfully!',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role || 'user',
        isBanned: user.isBanned || false,
        showNSFW: user.showNSFW || false,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
    });
  }
};

/**
 * @desc    Login user & check verification status
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or username and password',
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    });

    if (user && (await user.matchPassword(password))) {
      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been banned.',
        });
      }

      // Block unverified login attempts and signal frontend to show OTP verification
      if (!user.isVerified) {
        // Send a new registration OTP code just in case
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        await OTP.deleteOne({ email: user.email, purpose: 'register' });
        await OTP.create({
          email: user.email,
          code: otpCode,
          purpose: 'register',
          expiresAt,
        });
        await sendOTPEmail(user.email, otpCode, 'register');

        return res.status(403).json({
          success: false,
          isUnverified: true,
          message: 'Your account is not verified yet. A new verification OTP code has been sent to your email.',
          data: {
            email: user.email,
          },
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          role: user.role || 'user',
          isBanned: user.isBanned || false,
          showNSFW: user.showNSFW || false,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

/**
 * @desc    Request forgot password OTP reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isVerified: true });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No verified account found with this email address',
      });
    }

    // Generate 6-digit OTP code for password reset
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any old forgot password OTPs for this email
    await OTP.deleteOne({ email: email.toLowerCase(), purpose: 'forgot_password' });

    // Store in DB
    await OTP.create({
      email: email.toLowerCase(),
      code: otpCode,
      purpose: 'forgot_password',
      expiresAt,
    });

    // Send email via Nodemailer
    const emailSent = await sendOTPEmail(email.toLowerCase(), otpCode, 'forgot_password');
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset OTP code sent to your email.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during forgot password request',
    });
  }
};

/**
 * @desc    Reset password using OTP validation
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP code, and your new password',
      });
    }

    // Find the verified user
    const user = await User.findOne({ email: email.toLowerCase(), isVerified: true });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Validate the OTP
    const otp = await OTP.findOne({
      email: email.toLowerCase(),
      code: code.trim(),
      purpose: 'forgot_password',
    });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
    }

    // Assign the new password (pre-save hook will hash it)
    user.passwordHash = newPassword;
    await user.save();

    // Delete verified OTP
    await otp.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (user) {
      res.json({
        success: true,
        data: user,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
};
