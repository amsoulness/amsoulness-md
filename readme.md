# Amsoulness-MD / ASLNS

<p align="center">
  <a href="https://aslns.online/session"><img src="assets/readme/banner.svg" alt="Amsoulness bot — ASLNS WhatsApp framework" width="420" /></a>
</p>

A lightweight WhatsApp bot framework with multi-session support and extensive configuration options.

Inspired by and based on [Raganork-MD](https://github.com/souravkl11/raganork-md) by Sourav K.

## Where to start

| Your task | Open |
| --- | --- |
| Configure a first installation | [Configuration template](config.env.example) |
| Explore a command before changing it | [Command plugins](plugins/) |
| Trace how messages reach plugins | [Processing pipeline](core/pipeline/) |
| Understand the session service | [Service source](session-service/) · [Service Dockerfile](Dockerfile.session) |
| Review deployment settings | [Render blueprint](render.yaml) · [Bot Dockerfile](Dockerfile) |

[Read the Amsoulness Wiki](https://github.com/amsoulness/amsoulness-md/wiki) — plugin development, advanced commands and AI plugin guides.

## Updated to 7.4.1

Synced with upstream commit `0aa5750644a890189371583af428ce6fa8e5b73b` on 26 November 2026. Amsoulness keeps its own menu artwork, owner defaults, portable `ASLNS~` sessions, Render updater and project links. LICENSE is unchanged. Upstream notices are in [NOTICE](NOTICE).

New features and fixes:
- `.hatch` adds another bot by QR or pairing code from chat; `.hatch list` and `.hatch remove <n>` manage saved bots.
- `.alias` manages command aliases; use the command without arguments for its help.
- Local logins support `SESSION=qr:personal,pair:work` and `PAIRING_NUMBER` for pair logins. Existing ASLNS session strings still work and can be mixed with local sessions.
- Added Indonesian, Brazilian Portuguese, Hinglish, Chinese and Spanish, alongside English, Manglish and Turkish.
- Channel support, custom status-reaction emoji and `DISABLE_EVAL` configuration.
- `FORCE_STICKER_DATA` applies your configured sticker pack consistently.
- Audio/video sticker conversion, YouTube/media processing, ghost-message and hatch pairing fixes.

To apply this release on Render, use **Manual Deploy → Clear build cache & deploy**. After it is live, `.menu` should display `7.4.1`.

## Get Started

#### 1. Get Your Session String

<p align="center">
  <a href="https://aslns.online/session"><img src="assets/readme/get-session.svg" alt="Get Session" width="240" /></a>
</p>

[Get your Amsoulness session](https://aslns.online/session). Choose a QR code or phone pairing code, then copy the complete `ASLNS~` session into your private `SESSION` setting. The pairing server is independent of the upstream session provider.

**Important for Cloud Deployments:** If you're deploying on platforms like Render, Koyeb, Railway, or similar cloud services, you'll need a `DATABASE_URL` (PostgreSQL) for persistent storage. VPS deployments can use local file storage.

#### 2. Deploy and setup your bot

<p align="center">
  <a href="https://aslns.online/session/deploy"><img src="assets/readme/deploy-bot.svg" alt="Deploy bot" width="240" /></a>
</p>

Use the [guided Render deployer](https://aslns.online/session/deploy/render), or choose Koyeb, VPS or a hosting panel in the [deployment hub](https://aslns.online/session/deploy). Manual installation is documented below.

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
BOT_INFO=Amsoulness;Amsoulness;default
AUTO_UPDATE=false
HANDLERS=.,!
SUDO=919876543210

# Database (Required for cloud platforms)
DATABASE_URL=your_database_url

# Localization
LANGUAGE=english
TZ=Asia/Kolkata
```

#### All Variables

Set these in `config.env`, or from WhatsApp with `.setvar KEY=VALUE` (no restart needed except for `LANGUAGE`). `.settings` shows most of them as a menu. Booleans take `true` or `false`.

**General**

| Variable | Default | What it does |
| --- | --- | --- |
| `MODE` | `private` | `public` lets everyone use commands; `private` limits them to you and sudo users |
| `HANDLERS` | `.,` | characters that start a command |
| `MULTI_HANDLERS` | `false` | commands work with or without a prefix |
| `SUDO` | | numbers allowed to use the bot like the owner (manage with `.setsudo`) |
| `LANGUAGE` | `english` | `english`, `manglish` or `turkish` (restart needed) |
| `BOT_NAME` | `amsoulness` | bot name |
| `BOT_INFO` | `Amsoulness;Amsoulness;default` | `name;owner;image url`, also set with `.setinfo` |
| `ALIVE` | | reply for `.alive` (see `.setalive help`) |
| `BUTTONS` | `false` | interactive buttons, experimental |
| `DISABLED_COMMANDS` | | comma-separated commands to turn off |
| `BLOCK_CHAT` | | comma-separated chat ids the bot ignores |

**Presence and reading**

| Variable | Default | What it does |
| --- | --- | --- |
| `ALWAYS_ONLINE` | `false` | always show online |
| `READ_MESSAGES` | `false` | mark every message as read |
| `READ_COMMAND` | `true` | mark commands as read |
| `CMD_REACTION` | `false` | react to commands while they run |
| `AUTO_READ_STATUS` | `false` | view statuses automatically |
| `AUTO_LIKE_STATUS` | `false` | like statuses automatically |

**Private chats and calls**

| Variable | Default | What it does |
| --- | --- | --- |
| `DIS_PM` | `false` | ignore private messages from people who aren't you or sudo |
| `PMB_VAR` | `false` | block people (except sudo) who message you privately |
| `PMB` | `_Personal messages not allowed, BLOCKED!_` | message sent before blocking |
| `PM_ANTISPAM` | `false` | block people who spam you privately |
| `ANTISPAM_COUNT` | `6/10` | spam limit as messages/seconds |
| `REJECT_CALLS` | `false` | reject incoming calls |
| `CALL_REJECT_MESSAGE` | | message sent after rejecting a call |
| `ALLOWED_CALLS` | | comma-separated numbers whose calls are never rejected |

**Groups**

| Variable | Default | What it does |
| --- | --- | --- |
| `ADMIN_ACCESS` | `false` | group admins can use group commands |
| `ANTI_DELETE` | `off` | resend deleted messages: `chat` (same chat) or `sudo` (to you); `.antidelete <jid>` for another chat |
| `WARN` | `4` | warnings before a user is removed |
| `ALLOWED` | `91,94,2` | country codes antifake lets in |
| `AUTOMUTE_MSG` | `_Group automuted!_` | message when a group is auto muted |
| `AUTOUNMUTE_MSG` | `_Group auto unmuted!_` | message when a group is auto unmuted |

**Media**

| Variable | Default | What it does |
| --- | --- | --- |
| `STICKER_DATA` | `amsoulness` | `packname;author;emoji` for stickers (`.sticker` uses the sender's name as pack name) |
| `AUDIO_DATA` | `default` | `title;artist;image url` for `.take` on audio |

**System**

| Variable | Default | What it does |
| --- | --- | --- |
| `AUTO_UPDATE` | `false` | update automatically |
| `DISABLE_START_MESSAGE` | `false` | don't send the message on start |
| `NOLOG` | `false` | don't log command errors or reply with them |
| `SUPPORT_GROUP` | — | link shown in update notices |

Some variables are changed through their commands rather than by hand: `CHATBOT` (`.chatbot`), `ANTIWORD_WARN` (`.antiword`) and `ANTI_DELETE_JID` (`.antidelete`). Performance and hosting variables are listed below; they only work in `config.env` or your platform's environment settings, as do `SESSION` and `DATABASE_URL`.

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

149 JavaScript files passed syntax checks; six root tests and four pairing API tests passed. Yarn dependency linking was checked with native scripts skipped. Live QR generation was verified against the Railway deployment. Full account login, exported-session login and media commands still require an account-owner test. See [test results](TEST-RESULTS.txt) and [source review](REVIEW.txt).

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

- [Official website and session generator](https://aslns.online/session)
- [Plugin catalog](https://aslns.online/session/plugins)
- [Repository](https://github.com/amsoulness/amsoulness-md)
- [Issues](https://github.com/amsoulness/amsoulness-md/issues)

## Legal Notice

⚠️ **Use at your own risk.** This bot uses unofficial WhatsApp Web API methods and may result in temporary or permanent account bans.

- This code is in no way affiliated, authorized, maintained, sponsored or endorsed by WhatsApp or any of its affiliates.
- WhatsApp is a trademark of WhatsApp Inc., registered in the U.S. and other countries.
- This software is provided for educational and research purposes only
- Powered by [Baileys](https://github.com/WhiskeySockets/Baileys)

## License

GPL-3.0-or-later. See [LICENSE](LICENSE), [NOTICE](NOTICE), and [CREDITS.txt](CREDITS.txt).

---

**Note:** `core/private.js` is obfuscated because it contains the maintainer's private backend endpoints and keys. Everything else is regular source.

Session examples are placeholders. Never commit your session string or config.env. The obfuscated upstream private service module remains unchanged for compatibility and its internals have not been audited.

## Independent pairing service

The session page lives in the portfolio at [aslns.online/session](https://aslns.online/session). Its Node backend uses `Dockerfile.session` and the `session-service/` directory. See [service setup](session-service/README.md). Run its API tests with `node --test session-service/test/*.test.js`. New ASLNS sessions import locally; legacy upstream session strings retain their original provider behavior.

## Deployment hub

Open [aslns.online/session/deploy](https://aslns.online/session/deploy) for all hosting options:

- **Render:** [the guided deployer](https://aslns.online/session/deploy/render) connects GitHub, verifies your Render key, creates a public deployment repository, provisions PostgreSQL (or uses your existing database), creates the bot service and tracks deployment status. An official Blueprint is also available. Free PostgreSQL expires after 30 days; review Render plans before approving.
- **Koyeb:** a prefilled deployment link builds this repository using its Dockerfile. Supply SESSION, DATABASE_URL, and SUDO in Koyeb.
- **VPS:** the Debian/Ubuntu installer at [deploy/install.sh](deploy/install.sh) uses Docker and a persistent SQLite volume. It refuses to overwrite an existing installation, container, or data volume.
- **Panel:** download a start.js launcher from the hub, or use [deploy/start.cjs](deploy/start.cjs) as a template. Use a supported Node.js egg with Git and FFmpeg. SESSION can be supplied as a panel variable or optionally embedded in the generated file; keep that file private.

The [plugin browser](https://aslns.online/session/plugins) includes six optional owner-only plugins. They live in extras/plugins and are installed into plugins by the bot's .install command. Do not run them directly from the extras directory. Contributions can be submitted through GitHub issues and appear after review.

Deployment verification: the Render Blueprint passes its official JSON Schema; shell syntax, panel generation and restart behavior, and plugin command behavior have automated checks. No real Render/Koyeb bot deployment or VPS/panel installation was performed during these checks.

### Private Amsoulness reminders

Each linked bot sends its own account two private website/bot promotions daily at **10:00 AM and 6:00 PM Asia/Kolkata (IST)** while online. They never target groups, contacts or the SUDO list. Slot claims are saved in the database before sending to prevent duplicates on reconnect/restart; missed times are not replayed. Sending is best effort, so a failed request is not retried for that slot.

Disable per account with `.setvar PROMO_MESSAGES=false`; enable with `.setvar PROMO_MESSAGES=true`. This also appears in `.settings`.

### Amsoulness command centre

`.menu` shows a compact Amsoulness dashboard with account details, shortcuts and category previews. `.list` opens the detailed command directory; `.list media` filters it by category. Descriptions, usage and warnings remain available, and long directories are split into readable messages. Hidden commands are omitted. Installed plugins appear automatically.

`.menu` and `.list` include a lightweight four-second looping Amsoulness header with violet/cyan waves and drifting particles. Command text is sent separately so it remains selectable. Custom menu images keep their existing behavior. Disable the animation through `.settings` or `.setvar MENU_ANIMATIONS=false`. If video delivery fails, the commands retain their image/text fallback.

### Interactive arcade commands

- `.mariorun` — play the bundled three-world Amsoulness runner directly in compatible WhatsApp chats.
- `.beatstudio` — open the bundled drum-pad and sequencer app. `.beststuido` and `.beatstuido` also work.
- `.mariorun file` / `.beatstudio file` — get the HTML document for browser use.

Commands use the bot's normal public/private permissions and send only to the chat where they were invoked. Interactive HTML uses an experimental WhatsApp rich-response format; support varies by recipient client. If sending fails, the bot sends the HTML document instead. A successful send cannot confirm that the recipient rendered it. These apps are bundled locally; they do not download external scripts or audio.

### Configure Render updates from WhatsApp

After deploying this release, open your linked account's **Message yourself** chat:

- `.renderkey <your Render API key>` verifies access to the running Render service, then saves the key in the account's bot database settings. It is not echoed; deletion of the original message is attempted but not guaranteed.
- `.renderkey status` reports whether a key is configured without showing its value.
- `.renderkey remove` removes the key stored for this account. A key configured in Render's environment must be removed in Render separately.

Only messages sent by the linked account in its own self-chat can use this command. Groups and other sudo accounts are rejected. The key survives redeploys when the bot database persists. It is a private database setting, not a Render environment-variable edit. `.update` checks for changes; `.update start` applies a release and `.update beta` applies same-version commits by triggering the existing Render service's deployment. This does not create a new service. You need one manual deployment to install the new command.

### Two Render keys during guided setup

The [Render deployment wizard](https://aslns.online/session/deploy/render) configures updates during the first deployment:

1. Create **Amsoulness Deploy** and **Amsoulness Updates** as two separate Render API keys in your account settings, with access to the selected workspace and the permissions their tasks require.
2. Use the deployment key to connect Render and create the resources.
3. Enter the separate update key in the configuration form and approve storing it privately on your new Render bot service.
4. The wizard validates the second key's workspace access before creating resources, then installs it as `RENDER_API_KEY`. Neither key is committed to the public deployment repository or returned in status responses. Setup memory is cleared when the job ends; the update key remains on your own service until removed or revoked.

After the bot starts, `.update` checks for changes and shows whether to use `.update start` or `.update beta`. No later `.renderkey` setup is required. Existing deployments are not modified by this website change; use `.renderkey` or Render environment settings for them. The alternative Render Blueprint also prompts for `RENDER_API_KEY` during setup.

### Guided Koyeb and Heroku deployment

Choose [Koyeb](https://aslns.online/session/deploy/koyeb) or [Heroku](https://aslns.online/session/deploy/heroku) in the website host chooser. Both flows ask for two separate API credentials from the same host account/organization, your session, owner number and an existing PostgreSQL URL. The deployment credential is temporary; the update credential is stored privately on your own host, never in GitHub.

Koyeb uses one Free web instance only, subject to capacity and inactivity sleep. Heroku starts one **paid Basic dyno** only after explicit billing confirmation. No database add-ons are purchased. Monitor resources and build logs in your host dashboard; failed deployments do not automatically delete resources.

After launch, the connected WhatsApp account can send `.redeploy`, `.update start` or `.update beta` to request a fresh host build of the latest main branch. These commands confirm build acceptance; completion is shown by your hosting provider. The saved variables are `KOYEB_API_KEY` (Koyeb injects `KOYEB_SERVICE_ID`) or `HEROKU_API_KEY` plus `HEROKU_APP_NAME`.

### Automatic official upstream sync

GitHub Actions checks the original repository approximately every six hours. Compatible bot changes are merged into Amsoulness, tested, and published to this repository automatically. LICENSE, NOTICE, documentation, automation, session-service code and custom-only files are preserved. Overlapping custom edits or failed tests stop publication; review the failed run in [Actions](https://github.com/amsoulness/amsoulness-md/actions/workflows/upstream-sync.yml). The workflow can also be run manually from that page.

Repository sync and a running bot's update setting are separate. On your bot, use `.setvar AUTO_UPDATE=true` to enable automatic stable-version updates from **Amsoulness**, not directly from the original repository. Render needs its saved `RENDER_API_KEY` for a rebuild. Koyeb/Heroku can be rebuilt with `.redeploy`; host-side automatic deployment settings still apply. Conflicts require review rather than overwriting custom features.

Last manually reviewed upstream baseline: **v7.4.6** (`5eb0cf2207faef5144e8bfe60f80a609530b6750`).

### Amsoulness release numbering

Amsoulness uses its own version series beginning at **8.0.0**. Compatible automatic upstream syncs increment the Amsoulness patch version (8.0.1, 8.0.2, and so on), including upstream changes without an original version bump. The original version and commit are tracked separately in `.upstream-sync.json`. Bot menus, startup messages and `.ping` show the Amsoulness release number.

## Amsoulness Personal Workspace — v8.1.0

An Amsoulness-specific command set for your own linked account, in **Message yourself**. Incoming users, sudo users from another account and group chats cannot open your workspace.

| Command | What it does |
| --- | --- |
| `.desk` | Dashboard with open tasks, saved notes and focus progress |
| `.todo add Finish my assignment` | Save a task with a stable ID |
| `.todo list` / `.todo done 1` | View tasks or mark one complete |
| `.todo reopen 1` / `.todo remove 1` | Reopen or remove a task |
| `.notes add Useful idea` | Save a note; also accepts replied text |
| `.notes list` / `.notes show 1` | Browse previews or read a full note |
| `.notes search idea` / `.notes remove 1` | Search or remove a note |
| `.focus 25 Study` | Start a 25-minute focus session |
| `.focus status` / `.focus cancel` | Check or cancel your session |

Tasks, notes and timers are saved per linked account in your bot database. Timer completion is checked approximately every 30 seconds while connected, including after a restart. The completion is claimed before sending to avoid duplicate reminders; delivery can fail if WhatsApp disconnects at that moment. Limits: 100 tasks, 50 notes (2,000 characters each), and one 1–180 minute focus session per account. Data survives redeployment when your database is persistent; it is not a separate end-to-end encrypted notes service.

## Amsoulness 9 — a new conversation design

Amsoulness 9 keeps the full bot toolkit and introduces an independent presentation layer: a violet/cyan motion identity, a compact launch menu, searchable help, category browsing, and consistent bot-authored replies and edited messages. The engine and upstream attribution remain truthful; this is a modified distribution, not a claim that the shared code was written from scratch.

- `.menu` opens the new launch screen.
- `.list` shows categories; `.list group` opens a category; `.list all` retains the full directory.
- `.help sticker` explains a command; `.help music` searches names and descriptions.
- `.about` introduces the bot; `.ping` shows the new Signal card and running release.
- Text and media captions sent through the bot socket receive the shared design. Rich interactive envelopes retain their native WhatsApp controls.
- Forwarded messages, status/channel posts, file bytes, reactions, deletes and explicit custom-message flows stay unmodified. Existing custom alive messages remain yours; `.setalive del` restores the new default status card.

The shared UI changes presentation, not command permissions. Private workspace, owner-only configuration, translations, mentions, quoted-message IDs and media processing remain supported.
