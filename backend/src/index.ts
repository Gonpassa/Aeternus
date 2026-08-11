import { createApp } from './app';
import { connectDB } from './db';
import config from './config/default';

const start = async (): Promise<void> => {
  await connectDB();
  const app = createApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on port ${config.port}`);
  });
};

start();
