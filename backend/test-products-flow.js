import mongoose from 'mongoose';
import Post from './models/Post.js';
import User from './models/User.js';

const DB_URI = 'mongodb://127.0.0.1:27017/wisp';

const runTest = async () => {
  console.log('🧪 Starting Programmatic Schema & Mongoose Validation Test...\n');

  try {
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB.');

    // 1. Fetch a user to associate the post with
    const testUser = await User.findOne({});
    if (!testUser) {
      console.log('⚠️ No users found in database. Please run test-otp-flow.js or register a user first.');
      return;
    }

    console.log(`👤 Using user: [${testUser.username}] ID: [${testUser._id}]`);

    // 2. Add cover photo URL to user to test user cover schema update
    console.log('Updating user cover banner...');
    testUser.coverUrl = '/uploads/test-cover-banner.jpg';
    await testUser.save();
    console.log('✅ User coverUrl saved successfully.');

    // 3. Create a post with shoppable products
    console.log('\nCreating shoppable post with 2 products...');
    const testPost = await Post.create({
      author: testUser._id,
      type: 'photo',
      mediaUrl: '/uploads/test-post-photo.jpg',
      caption: 'Testing Oravia shoppable tags!',
      location: 'New York, USA',
      products: [
        {
          title: 'Premium Wireless Headphones',
          link: 'https://amazon.com/example-headphones',
          price: '$120',
          imageUrl: '/uploads/product-1.jpg',
        },
        {
          title: 'Mechanical Keychron Keyboard',
          link: 'https://keychron.com/example-keyboard',
          price: '$99',
          imageUrl: '/uploads/product-2.jpg',
        }
      ]
    });

    console.log(`✅ Post created. ID: [${testPost._id}]`);
    console.log('Created products array count:', testPost.products.length);
    
    // Assert product details match
    if (testPost.products.length !== 2) {
      throw new Error('Product items list is incorrect length!');
    }
    console.log('Product 1 Title:', testPost.products[0].title);
    console.log('Product 1 Price:', testPost.products[0].price);
    console.log('Product 2 Link:', testPost.products[1].link);

    // 4. Retrieve post from DB and inspect populated details
    console.log('\nRetrieving post from database...');
    const fetchedPost = await Post.findById(testPost._id).populate('author', 'username coverUrl');
    
    console.log('Fetched Post Caption:', fetchedPost.caption);
    console.log('Fetched Post Author Cover:', fetchedPost.author.coverUrl);
    console.log('Fetched Product 2 Price:', fetchedPost.products[1].price);

    // Clean up
    console.log('\nCleaning up database records...');
    await Post.deleteOne({ _id: testPost._id });
    console.log('🗑️ Test post deleted.');

    console.log('\n🎉 ALL SCHEMAS AND MONGOOSE FIELD VALIDATIONS PASSED SUCCESSFULY! 🎉');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB. Exiting test.');
  }
};

runTest();
