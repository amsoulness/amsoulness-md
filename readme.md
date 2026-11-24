# Amsoulness-MD / ASLNS



A lightweight WhatsApp bot framework with multi-session support and extensive configuration options. Amsoulness / ASLNS is a standalone, rebranded distribution based on Raganork-MD. See CREDITS.txt for attribution.

## Get Started

#### 1. Get Your Session String

[Get an upstream-compatible session](https://raganork.site). This is a third-party provider; Amsoulness does not operate a separate pairing service.



**Important for Cloud Deployments:** If you're deploying on platforms like Render, Koyeb, Railway, or similar cloud services, you'll need a `DATABASE_URL` (PostgreSQL) for persistent storage. VPS deployments can use local file storage.

#### 2. Deploy and setup your bot

Follow the installation instructions below. [View your repository](https://github.com/amsoulness/amsoulness-md).



## Features

- Lightweight and fast performance
- Single and multi-session capabilities
- Extensive plugin system
- Group management tools
- Media download functionality
- Excellent caching and session management

## Prerequisites

- Node.js matching package.json: ^22.22.2, ^24.15.0, or >=26.0.0
- Git
- FFmpeg
- Yarn package manager
- PM2 (optional, for process management)
- Database URL (postgreSQL - for cloud deployments)

## Installation

### Clone Repository

```bash
npm install -g yarn pm2
git clone https://github.com/amsoulness/amsoulness-md.git
cd amsoulness-md
```

### Install Dependencies

```bash
yarn install --frozen-lockfile
```

### Configuration

Create a `config.env` file in the root directory (on hosting platforms, set the same names as environment variables):

#### Session Configuration

Single session:

```
SESSION=YOUR_VALID_SESSION_STRING
```

Multi-session:

```
SESSION=YOUR_FIRST_VALID_SESSION,YOUR_SECOND_VALID_SESSION
```

#### Required Variables

```
# Bot Configuration
BOT_NAME=Amsoulness
STICKER_DATA=Amsoulness ASLNS
BOT_INFO=Amsoulness;ASLNS;default
AUTO_UPDATE=false
HANDLERS=.,!
SUDO=919876543210

# Database (Required for cloud platforms)
DATABASE_URL=your_database_url

# Localization
LANGUAGE=english
TZ=Asia/Kolkata
```

## Running the Bot

```bash
npm start
```

## Process Management

```bash
# Optional: start under PM2
pm2 start index.js --name amsoulness-md

# Stop bot
pm2 stop amsoulness-md

# Restart bot
pm2 restart amsoulness-md
```

## Performance Tuning (optional)

```
NODE_OPTIONS=--max-old-space-size=512 # optional Node heap cap in MB
FFMPEG_CONCURRENCY=2      # max ffmpeg jobs at once
FFMPEG_TIMEOUT=600        # seconds before a stuck ffmpeg job is killed
MAX_RECONNECT_ATTEMPTS=10 # fast reconnects (with backoff) before switching to one retry every ~10 min
CMD_CONCURRENCY=8         # chats that may run a command at the same time (commands of one chat run in order)
CMD_TIMEOUT=300           # seconds before a running command stops holding its queue slot (it is not killed)
LOG_LEVEL=warn            # bot log level (silent|error|warn|info|debug), default warn
BAILEYS_LOG_LEVEL=silent  # WhatsApp library log level, separate from LOG_LEVEL, default silent
SELF_RESTART=false        # without pm2 or a hosting platform, true makes .restart/.update start a new copy itself
WA_VERSION=2.3000.x       # pin a WhatsApp web version (default: latest published)
```

#### Other optional settings

```
DATABASE_SSL=true         # set false for a PostgreSQL server without SSL (default true)
SQLITE_PATH=./bot.db      # where the SQLite file lives when DATABASE_URL is not set
PLUGIN_FETCH_TIMEOUT=15000 # milliseconds to wait for each `.install`ed plugin download at start
TEMP_DIR=temp             # folder for temporary files (default: an amsoulness folder in the system temp dir)
USE_SERVER=true           # set false to skip the built-in web server (health and status pages)
PORT=3000                 # port of that web server
RENDER_API_KEY=           # Render only: lets `.update` redeploy the service
```

Use `.mem` to see memory usage. `npm start` runs Node directly. To cap the heap, use `node --max-old-space-size=384 index.js`. Automatic upstream updates default to off for this standalone version.

## Verification and Docker

```bash
npm test
npm run test:syntax
docker build -t amsoulness-md .
docker run --env-file config.env -p 3000:3000 amsoulness-md
```

Persist database storage separately for container deployments. The included Dockerfile builds your local source.

144 JavaScript files passed syntax checks; three packaging checks passed. Yarn dependency linking was checked with native scripts skipped. Live WhatsApp login, media commands and Docker deployment remain unverified. See [test results](TEST-RESULTS.txt) and [source review](REVIEW.txt).

## Health and status

The built-in web server answers on `PORT`:

- `/health` always returns `OK` (liveness probe for hosting platforms).
- `/status` returns JSON with each session's state (`connected`, `lastOpenAt`, `reconnectAttempts`, `loggedOut`), uptime, memory and the message queue length. It shows no phone numbers and no session ids.

## Commands

Default prefix: `.`

- `.list` – Show available commands
- `.ping` – Check response time
- `.restart` – Restart bot (sudo only)
- `.shutdown` – Stop bot (sudo only)
- `.mem` – Show memory usage (sudo only)

## File Structure

```
amsoulness-md/
├── plugins/          # Bot commands, one file each (also where `.install` puts plugins)
│   ├── utils/        # Helpers plugins share (media, downloads, language files)
│   └── sql/          # Plugin installer table
├── core/             # Everything the plugins run on
│   ├── app.js        # Boot sequence and the /health and /status server
│   ├── handler.js    # Entry point for incoming messages
│   ├── pipeline/     # Message pipeline: middleware (antibot, antispam, filters, ...) and the command dispatcher
│   ├── session/      # One WhatsApp session: socket, reconnects, manager, features (albums, anti-delete, calls)
│   ├── plugins/      # Command registry and plugin loader
│   ├── db/           # Sequelize setup, models and per-session scoping
│   ├── config/       # Typed settings: schema, store, derived values
│   ├── services/     # Updater and the Render API client
│   ├── constructors/ # Message objects handed to plugins
│   └── private.js    # Private service layer (obfuscated on deploy)
├── config.js         # Settings object plugins read (config.X)
├── main.js           # Module() and commands, for plugins
├── index.js          # Main entry point
├── temp/             # Temporary files (when TEMP_DIR=temp)
└── package.json      # Dependencies
```

## Support

- [Repository](https://github.com/amsoulness/amsoulness-md)
- [Issues](https://github.com/amsoulness/amsoulness-md/issues)

## Legal Notice

⚠️ **Use at your own risk.** This bot uses unofficial WhatsApp Web API methods and may result in temporary or permanent account bans.

- This code is in no way affiliated, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates.
- WhatsApp is a trademark of WhatsApp Inc., registered in the U.S. and other countries.
- This software is provided for educational and research purposes only
- Powered by [Baileys](https://github.com/WhiskeySockets/Baileys)

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) and [CREDITS.txt](CREDITS.txt). Based on [Raganork-MD](https://github.com/souravkl11/raganork-md) by Sourav K.

---

**Note:** `core/private.js` is obfuscated because it contains the maintainer's private backend endpoints and keys. Everything else is regular source.

Session examples are placeholders. Never commit your session string or config.env. The obfuscated upstream private service module remains unchanged for compatibility and its internals have not been audited.
