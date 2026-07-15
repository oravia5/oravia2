import User from '../models/User.js';
import Post from '../models/Post.js';

export const toggleWishlistProduct = async (req, res) => {
  try {
    const { postId, productId } = req.body;
    if (!postId || !productId) {
      return res.status(400).json({ success: false, message: 'postId and productId are required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const productExists = post.products.some(p => p._id.toString() === productId.toString());
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Product not found in this post' });
    }

    const user = await User.findById(req.user._id);
    const existingIndex = user.savedProducts.findIndex(
      item => item.post.toString() === postId.toString() && item.productId.toString() === productId.toString()
    );

    let isSaved = false;
    let message = '';

    if (existingIndex > -1) {
      user.savedProducts.splice(existingIndex, 1);
      isSaved = false;
      message = 'Product removed from wishlist';
    } else {
      user.savedProducts.push({ post: postId, productId });
      isSaved = true;
      message = 'Product saved to wishlist';
    }

    await user.save();
    res.json({ success: true, isSaved, message });
  } catch (err) {
    console.error('Error toggling wishlist:', err);
    res.status(500).json({ success: false, message: 'Server error toggling wishlist' });
  }
};

export const getWishlistProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedProducts.post',
      populate: {
        path: 'author',
        select: '_id username displayName avatarUrl'
      }
    });

    const results = [];
    const validSavedProducts = [];

    for (const item of user.savedProducts) {
      if (item.post) {
        const product = item.post.products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          results.push({
            _id: product._id,
            title: product.title,
            link: product.link,
            price: product.price,
            originalPrice: product.originalPrice || '',
            imageUrl: product.imageUrl,
            fileUrl: product.fileUrl || '',
            fileName: product.fileName || '',
            post: {
              _id: item.post._id,
              author: item.post.author
            }
          });
          validSavedProducts.push(item);
        }
      }
    }

    // Auto-clean any dangling or deleted post/product wishlist items
    if (validSavedProducts.length !== user.savedProducts.length) {
      user.savedProducts = validSavedProducts;
      await user.save();
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching wishlist products:', err);
    res.status(500).json({ success: false, message: 'Server error fetching wishlist products' });
  }
};
