# Dream Tales V2 — security hold

The legacy `/api/upload_audio` endpoint is intentionally disabled (HTTP 503). Its previous implementation accepted untrusted `userId` values and called `makePublic()` on uploaded audio. This is unsafe for a child-oriented product.

**Do not remove the hold** until all of the following are implemented:
- Verify Firebase ID tokens on the server using `firebase-admin`; do not trust `userId` or `role` from request bodies or unsigned cookies.
- Verify ownership of the story and parent/child relationship using trusted Firestore records, and enforce these permissions in Firestore/Storage rules.
- Enforce body-size and audio-type limits, private storage, signed or authenticated playback, quotas, and abuse protection.
- Add integration tests for anonymous users, different families, child accounts and malformed or oversized audio.
- Audit previously publicly shared audio objects and revoke public access where appropriate.

This hold does not disable the existing direct client-to-Storage upload used by `useTextToSpeech`. **That separate path must be audited for effective Firebase Storage rules before any public beta.**

Source of truth for appearance remains the Figma-approved final vision, not CP03. 
