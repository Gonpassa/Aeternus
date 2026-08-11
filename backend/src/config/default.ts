import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

export default {
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/nee3',
  port: process.env.PORT || 3000,
  sessionSecret,
  nodeEnv: process.env.NODE_ENV || 'development',
};
