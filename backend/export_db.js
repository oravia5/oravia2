import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wisp';
const EXPORT_DIR = path.join(process.cwd(), '..', 'db_export');

async function exportDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    // Create export directory if it doesn't exist
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections. Starting export...`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      console.log(`Exporting collection: ${colName}...`);
      
      const documents = await db.collection(colName).find({}).toArray();
      const filePath = path.join(EXPORT_DIR, `${colName}.json`);
      
      // Write pretty-printed JSON to file
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf-8');
      console.log(`Successfully exported ${documents.length} documents from "${colName}" to ${filePath}`);
    }

    console.log(`\n🎉 All collections successfully exported to directory: ${EXPORT_DIR}`);
  } catch (error) {
    console.error('Error exporting database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

exportDatabase();
