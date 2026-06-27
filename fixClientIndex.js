/**
 * One-time migration: drop stale global email index on clients collection.
 * Run ONCE: node fixClientIndex.js
 * Then restart your server — Mongoose will recreate the correct { email, owner } unique index.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

async function fixIndex() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const collection = mongoose.connection.collection("clients");

  // List existing indexes
  const indexes = await collection.indexes();
  console.log("Current indexes:", indexes.map(i => i.name));

  // Drop global email-only unique index if it exists
  for (const idx of indexes) {
    const keys = Object.keys(idx.key);
    // Drop if index is ONLY on email (no owner) — this is the bad one
    if (keys.length === 1 && keys[0] === "email" && idx.unique) {
      console.log(`Dropping bad index: ${idx.name}`);
      await collection.dropIndex(idx.name);
    }
  }

  console.log("Done. Restart your server — Mongoose will recreate the correct { email, owner } index.");
  await mongoose.disconnect();
}

fixIndex().catch(err => {
  console.error(err);
  process.exit(1);
});