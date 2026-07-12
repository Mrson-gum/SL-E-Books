# E-Book Salon - Security Specification

This document details the Zero-Trust security invariants, access control design, and threat modeling for the E-Book Salon Firestore database.

## Data Invariants

1. **Independent Book Access**: Native preset books are read-only for all users and cannot be updated or deleted.
2. **Access Hierarchy**: Only the explicit owner (`ownerId == request.auth.uid`) of a custom book can modify its metadata, chapters, or delete it.
3. **Identity Verification**: To prevent fraud, any book created with custom labels must have its `ownerId` set to the writing user's authentic `uid` and require a verified authentication token (`request.auth.token.email_verified == true`).
4. **No ID Poisoning**: Document IDs for books and chapters must be restricted to standard alpha-numeric slugs or base64 keys to prevent wallet exhaustion with long unicode injects.
5. **PII Isolation**: Reading progress belongs strictly to the individual reader. Progress records cannot be read, listed, or edited by other users.

## The "Dirty Dozen" Payloads

The following attack vectors are mitigated by the rules:

1. **Anonymous Modification**: Unauthenticated user attempts to delete a classic default book (`books/def-1`).
2. **Identity Theft**: Authenticated user attempts to create a book with an arbitrary `ownerId` of another user.
3. **Privilege Escalation**: Attempting to set or update `custom: false` on a custom book to bypass deletion protections.
4. **ID Poisoning**: Attempt to write a book using an exceptionally large 1MB character string as the document ID.
5. **Title Injection**: Attempt to create a book with a 2MB title string.
6. **Chapter Ransomware**: Non-owner attempts to write empty or corrupted content in a custom book's subcollection `/books/{bookId}/chapters/{chapterId}`.
7. **Progress Snooping**: Attempt to read the progression logs under `users/attacker_uid/progress/any_book` of another reader.
8. **State Desynchronization**: Attempting to update a book and change its immutable `createdAt` field.
9. **Fake Email Account**: Attempt to write a custom book using an unverified or spoofed email auth token.
10. **Orphaned progress logging**: Attempting to write progress logs for a non-existent `bookId`.
11. **Spoofed Rating or Stats**: Arbitrary modification of metadata using custom keys not present in the white-listed schema.
12. **Blanket Collection Scrapes**: Attempt to query all user reading progress documents in one broad query without filter bounds.

## Rules Verification Test Runner

The tests are modeled as follows:
- Unauthenticated reads of preset list: ALLOW.
- Writing to global `books/def-1`: DENY.
- Creating a custom book with verified matching UID: ALLOW.
- Editing someone else's book or chapters: DENY.
- Reading someone else's private progress: DENY.
