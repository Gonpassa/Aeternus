import mongoose from 'mongoose';
import config from './default';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoURI);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
};
