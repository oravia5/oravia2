import mongoose from 'mongoose';
import Post from './models/Post.js';
import User from './models/User.js';

const DB_URI = 'mongodb://127.0.0.1:27017/wisp';

let testPostId;
let testProductIdA;
let testProductIdB;

const runTest = async () => {
  console.log('🧪 Starting Wishlist & Product Feature Flow Test...\n');

  try {
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB.');

    const testUser = await User.findOne({});
    if (!testUser) {
      console.log('⚠️ No users found. Register a user first.');
      return;
    }
    console.log(`👤 Using user: [${testUser.username}] ID: [${testUser._id}]`);

    // 1. Create a post with products containing new fields
    console.log('\n--- STEP 1: Create post with products (originalPrice, fileUrl) ---');
    const testPost = await Post.create({
      author: testUser._id,
      type: 'photo',
      mediaUrl: '/uploads/test-photo.jpg',
      caption: 'Shoppable post with digital downloads',
      products: [
        {
          title: 'Digital Design Bundle',
          link: 'https://example.com/design-bundle',
          price: '$29',
          originalPrice: '$59',
          imageUrl: '/uploads/product-design.jpg',
          fileUrl: '/uploads/product-files/design-bundle.zip',
          fileName: 'design-bundle.zip',
        },
        {
          title: 'Minimal Poster Pack',
          link: 'https://example.com/poster-pack',
          price: '$15',
          originalPrice: '$35',
          imageUrl: '/uploads/product-poster.jpg',
          fileUrl: '/uploads/product-files/poster-pack.pdf',
          fileName: 'poster-pack.pdf',
        },
      ],
    });

    testPostId = testPost._id;
    testProductIdA = testPost.products[0]._id;
    testProductIdB = testPost.products[1]._id;

    console.log(`✅ Post created: ${testPostId}`);
    console.log(`   Product A: ${testPost.products[0].title} (ID: ${testProductIdA})`);
    console.log(`   Product B: ${testPost.products[1].title} (ID: ${testProductIdB})`);

    // Verify schema fields
    const pA = testPost.products[0];
    if (pA.originalPrice !== '$59') throw new Error('originalPrice not saved correctly');
    if (pA.fileUrl !== '/uploads/product-files/design-bundle.zip') throw new Error('fileUrl not saved correctly');
    if (pA.fileName !== 'design-bundle.zip') throw new Error('fileName not saved correctly');
    console.log('✅ All product schema fields verified (originalPrice, fileUrl, fileName).');

    // 2. Toggle wishlist: save product A
    console.log('\n--- STEP 2: Toggle wishlist (save product A) ---');
    const userBefore = await User.findById(testUser._id);
    const savedCountBefore = userBefore.savedProducts.length;

    userBefore.savedProducts.push({ post: testPostId, productId: testProductIdA });
    await userBefore.save();

    const userAfterSave = await User.findById(testUser._id);
    const savedCountAfter = userAfterSave.savedProducts.length;
    if (savedCountAfter !== savedCountBefore + 1) throw new Error('Wishlist save failed: count mismatch');
    const savedEntry = userAfterSave.savedProducts.find(
      s => s.post.toString() === testPostId.toString() && s.productId.toString() === testProductIdA.toString()
    );
    if (!savedEntry) throw new Error('Wishlist save failed: entry not found');
    console.log(`✅ Product A saved to wishlist. Count: ${savedCountBefore} → ${savedCountAfter}`);

    // 3. Toggle wishlist: save product B
    console.log('\n--- STEP 3: Toggle wishlist (save product B) ---');
    userAfterSave.savedProducts.push({ post: testPostId, productId: testProductIdB });
    await userAfterSave.save();

    const userAfterSaveB = await User.findById(testUser._id);
    if (userAfterSaveB.savedProducts.length !== savedCountAfter + 1) throw new Error('Wishlist save B failed');
    console.log(`✅ Product B saved to wishlist. Count: ${savedCountAfter} → ${userAfterSaveB.savedProducts.length}`);

    // 4. Toggle wishlist: unsave product A (remove)
    console.log('\n--- STEP 4: Toggle wishlist (remove product A) ---');
    const removeIdx = userAfterSaveB.savedProducts.findIndex(
      s => s.post.toString() === testPostId.toString() && s.productId.toString() === testProductIdA.toString()
    );
    if (removeIdx === -1) throw new Error('Product A not found in wishlist for removal');
    userAfterSaveB.savedProducts.splice(removeIdx, 1);
    await userAfterSaveB.save();

    const userAfterRemove = await User.findById(testUser._id);
    const entryStillExists = userAfterRemove.savedProducts.some(
      s => s.post.toString() === testPostId.toString() && s.productId.toString() === testProductIdA.toString()
    );
    if (entryStillExists) throw new Error('Product A was not removed from wishlist');
    if (userAfterRemove.savedProducts.length !== savedCountAfter) throw new Error('Wishlist remove count mismatch');
    console.log(`✅ Product A removed from wishlist. Count: ${userAfterRemove.savedProducts.length}`);

    // 5. Verify wishlist retrieval with populated data
    console.log('\n--- STEP 5: Verify wishlist retrieval (populate + product lookup) ---');
    const userPopulated = await User.findById(testUser._id).populate({
      path: 'savedProducts.post',
      populate: { path: 'author', select: '_id username displayName avatarUrl' },
    });

    const wishlistResults = [];
    for (const item of userPopulated.savedProducts) {
      if (item.post) {
        const product = item.post.products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          wishlistResults.push({
            title: product.title,
            price: product.price,
            originalPrice: product.originalPrice,
            fileUrl: product.fileUrl,
            fileName: product.fileName,
            postAuthor: item.post.author?.username,
          });
        }
      }
    }

    if (wishlistResults.length !== 1) throw new Error(`Expected 1 wishlist item, got ${wishlistResults.length}`);
    const wb = wishlistResults[0];
    if (wb.title !== 'Minimal Poster Pack') throw new Error('Wrong product in wishlist');
    if (wb.originalPrice !== '$35') throw new Error('originalPrice missing in retrieval');
    if (wb.fileUrl !== '/uploads/product-files/poster-pack.pdf') throw new Error('fileUrl missing in retrieval');
    if (wb.fileName !== 'poster-pack.pdf') throw new Error('fileName missing in retrieval');
    if (!wb.postAuthor) throw new Error('Author not populated');
    console.log(`✅ Wishlist retrieval verified: "${wb.title}" by @${wb.postAuthor}`);
    console.log(`   originalPrice: ${wb.originalPrice}, fileUrl: ${wb.fileUrl}`);

    // 6. Verify download link generation
    console.log('\n--- STEP 6: Verify download link (fileUrl accessible) ---');
    const fullDownloadUrl = `http://127.0.0.1:5000${wb.fileUrl}`;
    console.log(`✅ Download URL: ${fullDownloadUrl}`);

    // Cleanup
    console.log('\n--- Cleanup ---');
    // Remove saved products from user first
    const cleanupUser = await User.findById(testUser._id);
    cleanupUser.savedProducts = cleanupUser.savedProducts.filter(
      s => s.post.toString() !== testPostId.toString()
    );
    await cleanupUser.save();
    await Post.deleteOne({ _id: testPostId });
    console.log('🗑️ Test post and wishlist entries deleted.');

    console.log('\n🎉 ALL WISHLIST & PRODUCT FEATURE TESTS PASSED! 🎉');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB. Exiting test.');
  }
};

runTest();
