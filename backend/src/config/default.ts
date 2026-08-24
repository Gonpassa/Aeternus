import dotenv from 'dotenv';

const useTestDb = process.env.NODE_ENV === 'test' || process.env.USE_TEST_DB === 'true';

dotenv.config({ path: useTestDb ? '.env.test' : '.env' });

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
