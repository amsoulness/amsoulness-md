# Amsoulness · ASLNS

A standalone, rebranded distribution of Raganork-MD with its existing WhatsApp commands, multi-session support, moderation, scheduling and media utilities.

## Setup

Install a Node.js version supported by package.json, Git, FFmpeg and Yarn.

```sh
yarn install --frozen-lockfile
```

Copy `config.env.example` to `config.env`, supply a valid upstream-compatible SESSION and your SUDO number, then run:

```sh
npm start
```

For cloud persistence, supply DATABASE_URL. Local installations default to SQLite. `.list` lists commands; `.settings` manages settings.

```sh
npm test
npm run test:syntax
docker build -t amsoulness .
docker run --env-file config.env -p 3000:3000 amsoulness
```

Persist database storage separately when using containers. The example session value is a placeholder, not a working login.

## Changes and compatibility

Product branding is Amsoulness / ASLNS. Git history is omitted. Startup runs Node directly and works without Unix shell expansion. Docker builds the included local source. Automatic updates default off to protect this distribution.

External provider addresses and the upstream obfuscated core/private.js remain intact for feature compatibility. They are dependencies on the original service provider, not services owned by Amsoulness. Existing artwork may retain upstream visual branding. No independent pairing backend is included. Upstream copyright and license notices are retained in LICENSE and CREDITS.txt.

## Verification and known issues

See REVIEW.txt for the source assessment and TEST-RESULTS.txt for verification limits. This copy preserves upstream behavior, including known risks. Use a dedicated test WhatsApp account for live validation.
