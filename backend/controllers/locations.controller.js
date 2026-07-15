import Location from '../models/Location.js';

// Helper to escape special regex characters from user input
const escapeRegex = (string) => {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const upsertLocation = async (name) => {
  if (!name) return;
  const normalized = name.trim();
  if (!normalized) return;
  try {
    const escaped = escapeRegex(normalized);
    await Location.findOneAndUpdate(
      { name: { $regex: `^${escaped}$`, $options: 'i' } },
      { $inc: { count: 1 }, $setOnInsert: { name: normalized } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to upsert location:', err.message);
  }
};

export const searchLocations = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      // Return top 10 popular locations if query is empty
      const popular = await Location.find({}).sort({ count: -1 }).limit(10);
      return res.json({ success: true, data: popular });
    }
    const escapedQuery = escapeRegex(q);
    const matches = await Location.find({
      name: { $regex: escapedQuery, $options: 'i' }
    })
      .sort({ count: -1 })
      .limit(10);

    res.json({ success: true, data: matches });
  } catch (err) {
    console.error('Error searching locations:', err.message);
    res.status(500).json({ success: false, message: 'Server error searching locations' });
  }
};
