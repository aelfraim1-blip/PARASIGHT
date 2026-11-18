import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesContent = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');

test('Phase 0 Dirty Dozen Security Invariants in firestore.rules', () => {
  // 1. Default-deny catch-all
  assert.ok(rulesContent.includes('match /{document=**}'));
  assert.ok(rulesContent.includes('allow read, write: if false;'));

  // 2. Verified email requirement on writes
  assert.ok(rulesContent.includes('request.auth.token.email_verified == true'));

  // 3. Path variable hardening with regex and max length
  assert.ok(rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));

  // 4. Strict validation blueprints on create and update
  assert.ok(rulesContent.includes('isValidUserProfile(incoming())'));
  assert.ok(rulesContent.includes('isValidAnalysisRecord(incoming())'));

  // 5. Master Gate on subcollection /analyses/{analysisId}
  assert.ok(rulesContent.includes('exists(/databases/$(database)/documents/users/$(userId))'));

  // 6. Action-based affectedKeys().hasOnly() on updates
  assert.ok(rulesContent.includes("affectedKeys().hasOnly(['displayName', 'providerId', 'updatedAt'])"));

  // 7. Temporal integrity using request.time
  assert.ok(rulesContent.includes('incoming().createdAt == request.time'));
  assert.ok(rulesContent.includes('incoming().updatedAt == request.time'));
});
