import 'dotenv/config';
import { MongoClient } from 'mongodb';

const checkConnection = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is required');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    // eslint-disable-next-line no-console
    console.log('✓ MongoDB connection successful:', pingResult);

    const db = client.db();

    const userCount = await db.collection('users').estimatedDocumentCount();
    const entryCount = await db.collection('entries').estimatedDocumentCount();

    // eslint-disable-next-line no-console
    console.log(`\n✓ Collection counts:`);
    // eslint-disable-next-line no-console
    console.log(`  - users: ${userCount}`);
    // eslint-disable-next-line no-console
    console.log(`  - entries: ${entryCount}`);
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  checkConnection().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('✗ Connection check failed:', err.message);
    process.exitCode = 1;
  });
}

export { checkConnection };
