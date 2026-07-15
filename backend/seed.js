import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Location from './models/Location.js';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wisp';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected successfully!');

  // Clear existing data (optional, but good for clean state)
  console.log('Clearing old data...');
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Location.deleteMany({});
  console.log('Database cleared!');

  // Create Users
  console.log('Creating seed users...');
  
  const usersData = [
    {
      username: 'wisp_coder',
      email: 'coder@oravia.com',
      passwordHash: 'password123', // Will be hashed by pre('save') hook
      displayName: 'Wisp Coder',
      bio: 'Building awesome social media apps with Node.js & React!',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      isVerified: true,
      website: 'https://oravia.com',
      location: 'Silicon Valley',
      profession: 'Software Engineer',
      gender: 'Male',
    },
    {
      username: 'travel_guru',
      email: 'travel@oravia.com',
      passwordHash: 'password123',
      displayName: 'Alex the Traveler',
      bio: 'Exploring the world one city at a time. Wanderlust!',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isVerified: true,
      website: 'https://alextravels.com',
      location: 'Paris, France',
      profession: 'Travel Blogger',
      gender: 'Female',
    },
    {
      username: 'shopper_queen',
      email: 'shop@oravia.com',
      passwordHash: 'password123',
      displayName: 'Sophia Fashion',
      bio: 'Fashion designer and curator of shoppable digital guides.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isVerified: true,
      website: 'https://sophiafashion.store',
      location: 'Milan, Italy',
      profession: 'Fashion Designer',
      gender: 'Female',
    }
  ];

  const createdUsers = await User.create(usersData);
  console.log(`Created ${createdUsers.length} users!`);

  const coder = createdUsers[0];
  const traveler = createdUsers[1];
  const shopper = createdUsers[2];

  // Set following relationships
  coder.following.push(traveler._id);
  coder.followers.push(traveler._id);
  traveler.following.push(coder._id);
  traveler.followers.push(coder._id);
  
  await coder.save();
  await traveler.save();

  // Create Locations
  console.log('Seeding locations...');
  const locations = ['Silicon Valley', 'Paris, France', 'Milan, Italy', 'New York, USA', 'London, UK'];
  for (const loc of locations) {
    await Location.create({ name: loc, count: 1 });
  }

  // Create Posts
  console.log('Seeding posts & reels...');
  const postsData = [
    {
      author: coder._id,
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
      caption: 'Late night coding sessions! #coding #javascript #developerLife',
      location: 'Silicon Valley',
      tags: ['coding', 'javascript', 'developerlife'],
      likes: [traveler._id],
      status: 'published',
    },
    {
      author: traveler._id,
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: 'Sun, sand, and ocean breeze! Summer is finally here. #travel #beach #nature #vacation',
      location: 'Paris, France',
      tags: ['travel', 'beach', 'nature', 'vacation'],
      likes: [coder._id, shopper._id],
      status: 'published',
    },
    {
      author: shopper._id,
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      caption: 'Get my digital styling blueprint guide directly from this post! #fashion #store #design',
      location: 'Milan, Italy',
      tags: ['fashion', 'store', 'design'],
      likes: [traveler._id],
      products: [
        {
          title: 'Summer Fashion Catalog (PDF)',
          link: 'https://oravia-media-storage.s3.ap-south-1.amazonaws.com/example-catalog.pdf',
          price: '$9',
          originalPrice: '$25',
          imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=150',
          fileUrl: 'https://oravia-media-storage.s3.ap-south-1.amazonaws.com/example-catalog.pdf',
          fileName: 'styling-blueprint.pdf',
        }
      ],
      status: 'published',
    },
    {
      author: traveler._id,
      type: 'reel',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-43028-large.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200',
      caption: 'Beautiful waves crash on the shore. Nature is amazing! #reel #nature #waves',
      location: 'Hawaii, USA',
      tags: ['reel', 'nature', 'waves'],
      likes: [coder._id],
      status: 'published',
    }
  ];

  const createdPosts = await Post.create(postsData);
  console.log(`Created ${createdPosts.length} posts and reels!`);

  // Create Comments
  console.log('Seeding comments...');
  const commentsData = [
    {
      post: createdPosts[0]._id, // Coder post
      author: traveler._id,
      text: 'Keep up the great work! JavaScript is the best.',
      likes: [coder._id],
    },
    {
      post: createdPosts[0]._id, // Coder post
      author: shopper._id,
      text: 'Coding is magic! I need to learn this soon.',
    },
    {
      post: createdPosts[1]._id, // Traveler post
      author: coder._id,
      text: 'Amazing view! I want to visit there soon.',
      likes: [traveler._id],
    }
  ];

  const createdComments = await Comment.create(commentsData);
  console.log(`Created ${createdComments.length} comments!`);

  console.log('\n🎉 Database Seeding Completed Successfully! 🎉');
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('Seeding Error:', err);
    mongoose.disconnect();
  });
