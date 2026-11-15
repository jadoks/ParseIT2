// One-time cleanup: capitalize firstName / lastName of existing accounts.
//   node fix-names.js            -> dry run (only shows what would change)
//   node fix-names.js --apply    -> actually saves the changes
// Needs the same credentials as server.js: FIREBASE_SERVICE_ACCOUNT_KEY env var,
// or ./serviceAccountKey.json next to this file.
import dotenv from "dotenv";
import admin from "firebase-admin";
import { createRequire } from "module";

dotenv.config();
const APPLY = process.argv.includes("--apply");

const toTitleCase = (value) =>
  String(value == null ? "" : value)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'’.])([a-zà-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase());

const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : createRequire(import.meta.url)("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(credentials) });
const db = admin.firestore();

let changed = 0;
let checked = 0;

for (const collection of ["students", "teachers", "admins"]) {
  const snap = await db.collection(collection).get();
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    checked++;
    const data = doc.data();
    const updates = {};

    if (typeof data.firstName === "string" && data.firstName.trim()) {
      const fixed = toTitleCase(data.firstName);
      if (fixed !== data.firstName) updates.firstName = fixed;
    }
    if (typeof data.lastName === "string" && data.lastName.trim()) {
      const fixed = toTitleCase(data.lastName);
      if (fixed !== data.lastName) updates.lastName = fixed;
    }
    if (!Object.keys(updates).length) continue;

    changed++;
    console.log(
      `[${collection}/${doc.id}] "${data.firstName} ${data.lastName}" -> ` +
        `"${updates.firstName ?? data.firstName} ${updates.lastName ?? data.lastName}"`
    );

    if (APPLY) {
      batch.update(doc.ref, updates);
      pending++;
      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }

      // keep the Firebase Auth display name in step (best effort)
      if (data.authUid) {
        const first = updates.firstName ?? data.firstName ?? "";
        const last = updates.lastName ?? data.lastName ?? "";
        try {
          await admin.auth().updateUser(data.authUid, { displayName: `${first} ${last}`.trim() });
        } catch (e) {
          console.warn(`  (auth displayName not updated for ${doc.id}: ${e.message})`);
        }
      }
    }
  }
  if (APPLY && pending) await batch.commit();
}

console.log(
  `\n${APPLY ? "Updated" : "Would update"} ${changed} of ${checked} accounts.` +
    (APPLY ? "" : "  Run again with --apply to save.")
);
process.exit(0);