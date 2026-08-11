import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';

export const runMigrations = async (): Promise<void> => {
  await migrate(db, { migrationsFolder: './src/db/migrations' });
};

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
