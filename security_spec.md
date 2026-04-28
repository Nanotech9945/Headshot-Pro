# Security Specification for Portrait Studio 3D

## Data Invariants
- A User document can only be created/updated by the authenticated user whose UID matches the document ID.
- A Headshot document must belong to a valid authenticated user.
- A User cannot read another user's PII (private data).

## The "Dirty Dozen" Payloads

1. **Identity Spoofing (User Creation):** Try to create a user profile for a different UID.
   ```json
   { "uid": "victim_uid", "email": "attacker@evil.com" }
   ```
2. **Identity Spoofing (Headshot Creation):** Try to create a headshot for a different `userId`.
   ```json
   { "userId": "victim_uid", "imageUrl": "..." }
   ```
3. **Ghost Field Insertion:** Try to add a restricted field `isAdmin` to a user profile.
   ```json
   { "uid": "attacker_uid", "email": "attacker@gmail.com", "isAdmin": true }
   ```
4. **PII Data Leak:** Unauthorized user tries to `get()` a victim's user profile document containing their email.
5. **Path ID Poisoning:** Injecting a 2KB junk string as a document ID.
6. **State Shortcutting:** Manually setting a `createdAt` timestamp from the client instead of using `request.time`.
7. **Type Poisoning:** Setting `imageUrl` to a Boolean instead of a String.
8. **Resource Exhaustion:** Setting `prompt` to a 5MB string.
9. **Relational Sync Failure:** Creating a headshot in a subcollection of a user that doesn't exist.
10. **Immutable Field Update:** Attempting to change `userId` on an existing headshot record.
11. **Query Scraping:** Listing headshots without a `where` clause filter on `userId`.
12. **Unauthorized Deletion:** Attacker trying to delete a headshot belonging to another user.

## Test Runner Logic
Verified in `firestore.rules.test.ts` (conceptual for AI Studio).
- `PERMISSION_DENIED` for all above.
