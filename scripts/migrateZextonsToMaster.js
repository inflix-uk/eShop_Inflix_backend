/**
 * One-off migration: copy all collections from the Zextons Atlas cluster
 * (source DB `zextonsnew`) into the local Inflix master MongoDB.
 *
 * Usage:
 *   node scripts/migrateZextonsToMaster.js
 *
 * The destination DB name is taken from the last path segment of
 * MASTER_MONGODB_URI, or defaults to `zextonsnew` if none is present.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const SOURCE_URI =
  'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/zextonsnew';
const SOURCE_DB = 'zextonsnew';

const DEST_URI =
  process.env.MASTER_MONGODB_URI ||
  'mongodb://admin_inflix_root:kqcFAj9aVV6GsjtOkPH9icOlqIkWw16e@153.92.211.241:32770/?authSource=admin';

function parseDbName(uri, fallback) {
  try {
    const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
    const afterHost = withoutScheme.split('/')[1] || '';
    const dbPart = afterHost.split('?')[0];
    return dbPart && dbPart.length > 0 ? dbPart : fallback;
  } catch (_) {
    return fallback;
  }
}

const DEST_DB = parseDbName(DEST_URI, 'zextonsnew');

const BATCH_SIZE = 500;

async function main() {
  console.log('Source:', SOURCE_URI);
  console.log('Source DB:', SOURCE_DB);
  console.log('Dest:', DEST_URI);
  console.log('Dest DB:', DEST_DB);

  const srcClient = new MongoClient(SOURCE_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  const dstClient = new MongoClient(DEST_URI, {
    serverSelectionTimeoutMS: 30000,
  });

  try {
    console.log('\nConnecting to source...');
    await srcClient.connect();
    console.log('Source connected.');

    console.log('Connecting to destination...');
    await dstClient.connect();
    console.log('Destination connected.');

    const srcDb = srcClient.db(SOURCE_DB);
    const dstDb = dstClient.db(DEST_DB);

    const collections = await srcDb.listCollections({}, { nameOnly: true }).toArray();
    console.log(`\nFound ${collections.length} collection(s) in ${SOURCE_DB}.`);

    const summary = [];

    for (const { name } of collections) {
      if (name.startsWith('system.')) {
        console.log(`\nSkipping system collection: ${name}`);
        continue;
      }

      console.log(`\n--- Copying collection: ${name} ---`);
      const srcColl = srcDb.collection(name);
      const dstColl = dstDb.collection(name);

      const totalInSource = await srcColl.estimatedDocumentCount();
      console.log(`Source docs (estimate): ${totalInSource}`);

      const cursor = srcColl.find({}, { batchSize: BATCH_SIZE });

      let batch = [];
      let copied = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
          await dstColl.insertMany(batch, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
            console.warn(`  (some duplicates skipped in batch of ${batch.length})`);
          });
          copied += batch.length;
          process.stdout.write(`  copied ${copied}\r`);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await dstColl.insertMany(batch, { ordered: false }).catch((err) => {
          if (err.code !== 11000) throw err;
          console.warn(`  (some duplicates skipped in final batch of ${batch.length})`);
        });
        copied += batch.length;
      }

      await cursor.close();

      try {
        const srcIndexes = await srcColl.indexes();
        for (const idx of srcIndexes) {
          if (idx.name === '_id_') continue;
          const { v, ns, key, name: idxName, ...opts } = idx;
          try {
            await dstColl.createIndex(key, { name: idxName, ...opts });
          } catch (e) {
            console.warn(`  index '${idxName}' create failed: ${e.message}`);
          }
        }
      } catch (e) {
        console.warn(`  index copy failed: ${e.message}`);
      }

      const destCount = await dstColl.countDocuments();
      console.log(`Done. Copied: ${copied}. Dest total now: ${destCount}`);
      summary.push({ collection: name, copied, destTotal: destCount });
    }

    console.log('\n=== Migration Summary ===');
    console.table(summary);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await srcClient.close().catch(() => {});
    await dstClient.close().catch(() => {});
  }
}

main();
