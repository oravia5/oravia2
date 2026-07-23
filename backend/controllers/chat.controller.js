import Ably from 'ably';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import storageService from '../services/storage.service.js';
import { sendPushNotification } from '../services/pushNotification.service.js';
import fs from 'fs';
import path from 'path';

let ably;

const getAbly = () => {
  if (!ably) {
    const key = process.env.ABLY_API_KEY;
    if (!key) {
      throw new Error('ABLY_API_KEY environment variable is not set');
    }
    ably = new Ably.Rest({ key });
  }
  return ably;
};

// Helper: build deterministic channelId from two user IDs
function buildChannelId(userA, userB) {
  const ids = [userA.toString(), userB.toString()].sort();
  return `dm:${ids[0]}:${ids[1]}`;
}

// Issue Ably token for the authenticated user
export const issueToken = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const username = req.user.username;

    console.log('[Chat Backend] Token request from user:', userId, username);

    const tokenParams = {
      clientId: userId,
      capability: {
        '*': ['publish', 'subscribe', 'presence', 'history'],
      },
      ttl: 60 * 60 * 1000, // 1 hour
    };

    const client = getAbly();
    const tokenRequest = await client.auth.createTokenRequest(tokenParams);
    console.log('[Chat Backend] TokenRequest created successfully for:', username);

    res.json({
      success: true,
      data: {
        tokenRequest,
        clientId: userId,
        username,
      },
    });
  } catch (error) {
    console.error('[Chat Backend] Ably token error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to issue chat token',
    });
  }
};

// Start or open a conversation — called when user opens a chat
export const startConversation = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'otherUserId is required',
      });
    }

    if (userId === otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start conversation with yourself',
      });
    }

    // Verify the other user exists
    const otherUser = await User.findById(otherUserId)
      .select('username displayName avatarUrl')
      .lean();

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const channelId = buildChannelId(userId, otherUserId);
    const participantIds = [userId, otherUserId].sort();

    // Upsert — create if not exists, update lastMessageAt if exists
    await Conversation.findOneAndUpdate(
      { channelId },
      {
        $setOnInsert: {
          participants: participantIds,
          channelId,
        },
        $set: {
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        channelId,
        user: otherUser,
      },
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start conversation',
    });
  }
};

// Update last message info for a conversation (called after sending a message)
export const updateConversation = async (req, res) => {
  try {
    const { channelId, lastMessageText } = req.body;
    const senderId = req.user._id.toString();

    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'channelId is required',
      });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { channelId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessageText: (lastMessageText || '').substring(0, 100),
        },
      },
      { new: true }
    );

    // ASYNC PUSH NOTIFICATION FOR DIRECT CHAT MESSAGES
    setImmediate(async () => {
      try {
        if (!conversation || !conversation.participants) return;
        const recipientId = conversation.participants.find(
          (p) => p.toString() !== senderId
        );

        if (!recipientId) return;

        const senderUser = req.user;
        const senderName = senderUser.displayName || `@${senderUser.username}`;

        sendPushNotification(recipientId, {
          title: senderName,
          body: lastMessageText || 'Sent you a message 💬',
          icon: senderUser.avatarUrl || 'https://oravia.co.in/icon-192x192.png', // Sender's profile picture
          url: 'https://oravia.co.in/messages',
        });
      } catch (pushErr) {
        console.error('Error sending chat push notification:', pushErr.message);
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation',
    });
  }
};

// Get all conversations for the current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Get conversations from DB, sorted by last activity
    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Get the other user's info for each conversation
    const otherUserIds = conversations.map((conv) => {
      return conv.participants.find((p) => p.toString() !== userId);
    });

    const otherUsers = await User.find({ _id: { $in: otherUserIds } })
      .select('username displayName avatarUrl')
      .lean();

    const usersMap = {};
    otherUsers.forEach((u) => {
      usersMap[u._id.toString()] = u;
    });

    const result = conversations
      .map((conv) => {
        const otherUserId = conv.participants.find(
          (p) => p.toString() !== userId
        );
        const user = usersMap[otherUserId?.toString()];
        if (!user) return null;

        return {
          channelId: conv.channelId,
          lastMessageAt: conv.lastMessageAt,
          lastMessageText: conv.lastMessageText,
          user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
    });
  }
};

// Search users to message
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user._id.toString();

    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username displayName avatarUrl')
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: users.map((u) => {
        return {
          ...u,
          channelId: buildChannelId(userId, u._id),
        };
      }),
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
    });
  }
};

// Upload media (image/video) for chat
export const uploadChatMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const url = await storageService.uploadFile(req.file, 'chat');
    const isVideo = req.file.mimetype.startsWith('video/');

    res.json({
      success: true,
      data: {
        url,
        type: isVideo ? 'video' : 'image',
        name: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Chat media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
    });
  }
};

let stickersCache = null;

// Get all stickers packs and files
export const getStickers = async (req, res) => {
  try {
    const baseUrl = '/stickers';

    if (stickersCache) {
      const mapped = stickersCache.map((pack) => ({
        id: pack.id,
        name: pack.name,
        tray: `${baseUrl}/${pack.id}/${pack.trayFile}`,
        stickers: pack.stickerFiles.map((file) => `${baseUrl}/${pack.id}/${file}`),
      }));
      return res.json({ success: true, data: mapped });
    }

    const stickersPath = path.join(process.cwd(), 'stickers');
    if (!fs.existsSync(stickersPath)) {
      return res.json({ success: true, data: [] });
    }

    const dirs = fs.readdirSync(stickersPath).filter((file) => {
      return fs.statSync(path.join(stickersPath, file)).isDirectory();
    });

    const packs = [];
    for (const dir of dirs) {
      const dirPath = path.join(stickersPath, dir);
      const files = fs.readdirSync(dirPath);

      let trayFile = files.find((f) => f.toLowerCase().startsWith('tray'));
      const stickerFiles = files.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return (
          (ext === '.webp' ||
            ext === '.png' ||
            ext === '.gif' ||
            ext === '.jpg' ||
            ext === '.jpeg') &&
          !f.toLowerCase().startsWith('tray')
        );
      });

      if (stickerFiles.length > 0) {
        if (!trayFile) {
          trayFile = stickerFiles[0];
        }
        packs.push({
          id: dir,
          name: dir.charAt(0).toUpperCase() + dir.slice(1),
          trayFile,
          stickerFiles,
        });
      }
    }

    stickersCache = packs;

    const mapped = packs.map((pack) => ({
      id: pack.id,
      name: pack.name,
      tray: `${baseUrl}/${pack.id}/${pack.trayFile}`,
      stickers: pack.stickerFiles.map((file) => `${baseUrl}/${pack.id}/${file}`),
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Get stickers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stickers',
    });
  }
};

