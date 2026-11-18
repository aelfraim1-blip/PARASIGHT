# PARASIGHT Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Source of Truth

1. **Default-Deny Catch-All**: All paths not explicitly matched (`/{document=**}`) deny all `read` and `write` operations.
2. **Verified Identity & PII Isolation**:
   - Every write operation requires an authenticated user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
   - Raw PII (such as email addresses or phone numbers) is never stored in `/users/{userId}` documents, and access to `/users/{userId}` is strictly limited to `request.auth.uid == userId`.
3. **Master Gate for Subcollections (`/users/{userId}/analyses/{analysisId}`)**:
   - An `AnalysisRecord` can only be read, created, updated, or deleted if `request.auth.uid == userId` AND the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`) and is owned by `request.auth.uid`.
4. **Strict Blueprint & Anti-Update-Gap**:
   - `isValidUserProfile(data)` and `isValidAnalysisRecord(data)` validate exact allowed keys (`hasAll` and `hasOnly`), field types, regex patterns, string length bounds, and numeric bounds on both `create` and `update`.
   - Updates must use action-based `affectedKeys().hasOnly(...)` and preserve immutable fields (`uid`, `ownerId`, `createdAt`) while enforcing `updatedAt == request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Unauthenticated Write)**: Creating `/users/user_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Spoof)**: Creating `/users/user_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Payload 3 (Cross-User Profile Hijack)**: Authenticated `user_2` creating `/users/user_1` or setting `uid: "user_1"` -> `PERMISSION_DENIED`.
4. **Payload 4 (Self-Assigned Admin Role Escalation)**: Authenticated `user_1` creating `/users/user_1` with `role: "admin"` -> `PERMISSION_DENIED` (only `"researcher"` is allowed).
5. **Payload 5 (Shadow / Ghost Field Injection)**: Authenticated `user_1` creating `/users/user_1` with extra field `isSuperAdmin: true` -> `PERMISSION_DENIED`.
6. **Payload 6 (Denial-of-Wallet Oversized String)**: Authenticated `user_1` creating `/users/user_1` with a 500-char `displayName` (exceeds `maxLength: 80`) -> `PERMISSION_DENIED`.
7. **Payload 7 (ID Poisoning Attack)**: Creating `/users/user_1/analyses/bad$id!@#` with invalid characters -> `PERMISSION_DENIED`.
8. **Payload 8 (Orphaned Subcollection Write Bypassing Master Gate)**: Creating `/users/user_1/analyses/rec_1` when parent `/users/user_1` does not exist -> `PERMISSION_DENIED`.
9. **Payload 9 (Cross-User PII / Profile Read)**: Authenticated `user_2` reading `/users/user_1` -> `PERMISSION_DENIED`.
10. **Payload 10 (Unconstrained List Scraping)**: Authenticated `user_2` listing `/users/user_1/analyses` -> `PERMISSION_DENIED`.
11. **Payload 11 (Immutable Field Tampering on Update)**: Authenticated `user_1` updating `createdAt` or `ownerId` on `/users/user_1/analyses/rec_1` -> `PERMISSION_DENIED`.
12. **Payload 12 (Client Timestamp Forgery)**: Authenticated `user_1` creating `/users/user_1` with a past/future `createdAt != request.time` -> `PERMISSION_DENIED`.
