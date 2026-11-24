# Amsoulness pairing service

This Node service powers [aslns.online/session](https://aslns.online/session). It supports WhatsApp QR pairing and phone-number pairing through Baileys.

## Run locally

```sh
cd session-service
npm ci
npm start
```

Set `PORT` if needed (default 3000). `ALLOWED_ORIGINS` is a comma-separated list of permitted browser origins; the defaults include the portfolio and localhost:5173. Run one service replica: active pairing sessions are deliberately held only in memory.

## Deployment

Use the repository-root `Dockerfile.session` on Railway, health path `/health`, and port 3000. The service is independent of the bot process and needs no database. Do not run the bot's root Dockerfile for the pairing service.

## Session format

Successful pairing exports an `ASLNS~v1_…` value. Paste the complete value into the updated bot's private `SESSION` environment setting. The bot validates and imports the credentials, then persists them in its existing database layout. These sessions do not use the upstream private session provider.

The exported value is compressed, not encrypted: it is a credential. Never put it in source control or public logs. The API uses random bearer capabilities kept out of URLs. API responses prohibit caching. Pairing data stays in server memory for up to five minutes; expiry, cancellation, and shutdown remove it. It is not saved to disk. Browser state is held in memory and cleared on leaving the page. A server restart interrupts pending pairings.

The server limits active pairings and creation attempts by source IP. Only link accounts you own. Logging out the linked device in WhatsApp revokes access. QR generation can be verified without completing account login; a full account-link test requires the owner to scan or approve the code.

## Checks

```sh
node --test test/*.test.js
```

These tests use synthetic state, not a WhatsApp account.
