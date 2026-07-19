// db.js
//
// This defines the local, on-device database. Everything lives in the
// browser's IndexedDB storage — nothing leaves the phone in Phase 1.
//
// Two tables:
//   meta      - one row per setting: the encryption salt, the PIN-check
//               value, and your encrypted profile summary
//   messages  - every message ever sent, each one individually encrypted

import Dexie from 'dexie';

export const db = new Dexie('CompanionAppDB');

db.version(1).stores({
  meta: 'key',
  messages: '++id, sessionId, timestamp',
});

export default db;
