import mongoose from 'mongoose';

export const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wisp');
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};
