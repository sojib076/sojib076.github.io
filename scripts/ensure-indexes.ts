/**
 * Applies every index the app expects. The running app does this lazily too,
 * but a deployment pipeline should not wait for the first page view.
 */

import { MongoClient } from 'mongodb';
import { loadEnv, requireEnv } from './env';
import { createIndexes } from '../src/lib/db/indexes';

loadEnv();

const uri = requireEnv('MONGODB_URI');
const dbName = process.env.MONGODB_DB ?? 'shibu_store';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  await createIndexes(client.db(dbName));
  console.info(`Indexes are up to date on "${dbName}".`);

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
