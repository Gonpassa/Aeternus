import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import config from '../config/default';

export const pool = new Pool({ connectionString: config.databaseUrl });

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export const connectDB = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
};
