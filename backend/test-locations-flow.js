import mongoose from 'mongoose';
import Location from './models/Location.js';
import { upsertLocation } from './controllers/locations.controller.js';

const DB_URI = 'mongodb://127.0.0.1:27017/wisp';

const runTest = async () => {
  console.log('🧪 Starting Locations Database Integration Test...\n');

  try {
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB.');

    // Clean any prior residues
    await Location.deleteMany({ name: 'Kolkata, West Bengal, India' });

    console.log('1. Upserting "Kolkata, West Bengal, India" (Run 1)...');
    await upsertLocation('Kolkata, West Bengal, India');

    let loc = await Location.findOne({ name: 'Kolkata, West Bengal, India' });
    if (!loc || loc.count !== 1) {
      throw new Error(`Upsert Run 1 failed. Loc: ${JSON.stringify(loc)}`);
    }
    console.log('✅ Count is 1.');

    console.log('2. Upserting "Kolkata, West Bengal, India" (Run 2)...');
    await upsertLocation('Kolkata, West Bengal, India');

    loc = await Location.findOne({ name: 'Kolkata, West Bengal, India' });
    if (!loc || loc.count !== 2) {
      throw new Error(`Upsert Run 2 failed. Loc: ${JSON.stringify(loc)}`);
    }
    console.log('✅ Count is 2.');

    console.log('3. Searching for "kol"...');
    const matches = await Location.find({
      name: { $regex: 'kol', $options: 'i' }
    }).sort({ count: -1 });

    if (matches.length === 0 || matches[0].name !== 'Kolkata, West Bengal, India') {
      throw new Error(`Search failed. Matches: ${JSON.stringify(matches)}`);
    }
    console.log('✅ Found match:', matches[0].name, 'Count:', matches[0].count);

    // Clean up
    await Location.deleteMany({ name: 'Kolkata, West Bengal, India' });
    console.log('🗑️ Test location deleted.');

    console.log('\n🎉 ALL LOCATION FLOW INTEGRATIONS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB. Exiting test.');
  }
};

runTest();
