# Amsoulness / ASLNS

**Your WhatsApp, reimagined.** A full WhatsApp bot for media, groups, automation, games and your private personal workspace.

<p align="center"><a href="https://aslns.online/session"><img src="plugins/utils/images/default.png" alt="Amsoulness — make it yours" width="800" /></a></p>

[Get a session](https://aslns.online/session) · [Deploy](https://aslns.online/session/deploy) · [Plugins](https://aslns.online/session/plugins) · [Wiki](https://github.com/amsoulness/amsoulness-md/wiki) · [Website](https://aslns.online)

Inspired by and based on [Raganork-MD](https://github.com/souravkl11/raganork-md) by Sourav K. Amsoulness is an independently branded, modified distribution with its own features, presentation and release numbering.

## Amsoulness 9.2 — one conversation design

The shared ASLNS presentation system covers bot-authored text, edited messages, media captions, native buttons, lists, plain-text fallbacks, directly relayed message envelopes and automatic replies. Startup messages, updates, preferences, status, reminders and workspace commands use the same identity.

Forwarded content, user-authored custom alive/broadcast text, rich HTML app payloads, file contents, reaction/delete packets and status/channel posts retain their authored content. Button actions, copy codes, mentions, message IDs and quoted content stay intact. WhatsApp controls native fonts and control appearance; Amsoulness uses supported formatting and its own violet/cyan artwork. Interactive rendering varies by client and can fall back to text.

## Start with the conversation

| Send | What happens |
| --- | --- |
| `.menu` | Open the animated launch menu |
| `.list` | Choose a command category |
| `.list group` | Browse one category |
| `.list all` | Read the full directory |
| `.help sticker` | Understand a command |
| `.help music` | Search names and descriptions by purpose |
| `.info ping` | Open detailed command help |
| `.ping` | Check connection latency and the running release |
| `.alive` | Show the status card or your custom alive message |
| `.about` | Meet the bot and its toolkit |
| `.settings` | Change preferences with owner access |
| `.desk` | Open your private workspace in Message yourself |

Examples use `.`. Your configured command prefix also works. Help reads the live command registry; permissions and installed plugins determine availability.

## Unified menu and emoji design — 9.2.1

The looping menu animation and its compact navigation caption are delivered as **one message**. With animation disabled, the still-image menu also stays together. Large command directories remain paginated text; a short category chooser can use a single animated card. Shared headings, categories and guide sections use consistent emojis and lightweight divider lines, while copyable commands, credentials, links and user-authored content stay intact.

## Detailed command guides — 9.2

Use `.help <command>` or `.info <command>` for a structured card: **what it does**, numbered steps, syntax, examples when reviewed, access rules, expected results when documented, and warnings. `.list <category>` links each command to its detailed guide.

The guide combines the live command registry, reviewed everyday examples and matching usage/help text published by the plugin. Unknown or installed plugins still appear; missing argument documentation is stated explicitly, not guessed. Owner/sudo access follows the current mode; private workspace and Render-key commands additionally require the linked account’s self-chat.

Examples: `.help sticker`, `.help todo`, `.help focus`, `.help update`, `.help mute`. Topic searches such as `.help music` still return matching commands. WhatsApp bold uses `*text*`, italics use `_text_`, and examples use inline code, keeping instructions and commands easy to distinguish.

## Full bot toolkit

- **Media and remixing:** stickers, audio/video conversion, text-to-speech, image tools, PDFs and album processing.
- **Downloads and discovery:** music, video and social-media utilities. Provider availability can change.
- **Group room:** moderation, warnings, filters, link controls, welcomes, group settings and scheduling.
- **Automation:** auto-download/status options, call handling, mentions, AFK and profile utilities.
- **Your desk:** private tasks, searchable notes and focus sessions that persist through restarts.
- **Play room:** Mario Run and Beat Studio with experimental rich HTML rendering and file fallback.
- **Extensibility:** community plugins, aliases and multi-session operation.
- **Operations:** owner controls, logs, health/status endpoints and supported host rebuild commands.

The redesign does not grant owner access or enable experimental controls by itself.

## Connect WhatsApp

1. Open [Get a session](https://aslns.online/session).
2. Scan the QR code, or select your country and request a phone pairing code.
3. Finish linking under WhatsApp → Settings → Linked devices.
4. Copy the complete `ASLNS~` session into your private deployment configuration.

The pairing service also attempts to send the session to the newly linked account's own number. Website success is retained if this private message cannot be delivered. Keep session strings and API credentials private.

Local login and multiple sessions are supported:

```env
# Website-generated session
SESSION=ASLNS~YOUR_COMPLETE_SESSION

# Or QR login from runtime logs
SESSION=qr

# Or phone pairing
SESSION=pair
PAIRING_NUMBER=919876543210

# Named sessions can be combined
SESSION=qr:personal,pair:work
```

For multiple pair sessions, list their phone numbers in matching order. Existing portable session formats remain supported. Use `.hatch` on the main bot for instructions on adding and managing linked sessions.

## Choose a host

Start at the [deployment hub](https://aslns.online/session/deploy).

| Host | Initial setup | Important details |
| --- | --- | --- |
| [Render](https://aslns.online/session/deploy/render) | GitHub connection, two Render keys, session and owner | Public Docker deployment wrapper without committed secrets. Bring PostgreSQL or create the supported free database, which expires after 30 days. |
| [Koyeb](https://aslns.online/session/deploy/koyeb) | Two Koyeb credentials, session, owner and existing PostgreSQL URL | Free web instance only, subject to capacity and inactivity sleep. No automatic paid fallback. |
| [Heroku](https://aslns.online/session/deploy/heroku) | Two authorizations, session, owner and existing PostgreSQL URL | One paid Basic web dyno after explicit pricing confirmation. No database add-ons are purchased. |
| VPS | Hub installer or manual installation below | Persistent local SQLite storage is supported. |
| Hosting panel | Download `start.js` from the hub | Supported Node.js egg, Git, FFmpeg and persistent storage or PostgreSQL required. |
| Other Docker hosts | Repository Dockerfile and environment variables | Use PostgreSQL when the container filesystem is ephemeral. |

Guided deployments use separate credentials: the temporary **deployment key** creates resources; the **update key** is saved privately in your own host account. Both need access to the chosen account or organization. Private values are not committed to GitHub. Inspect existing resources before retrying a failed deployment; resources are not automatically deleted.

### Manual installation

Use Node.js **24.15+ (24.x) or 26+**, Git, FFmpeg and Yarn. Media features also use WebP command-line tools. The provided Docker image installs its system dependencies.

```sh
git clone https://github.com/amsoulness/amsoulness-md.git
cd amsoulness-md
npm install --global yarn@1.22.22
yarn install --frozen-lockfile
cp config.env.example config.env
# Edit config.env before starting
npm start
```

Minimal configuration:

```env
SESSION=YOUR_COMPLETE_SESSION
BOT_NAME=Amsoulness
BOT_INFO=Amsoulness;Your Name;default
HANDLERS=.
MODE=private
SUDO=919876543210
LANGUAGE=english
TZ=Asia/Kolkata
AUTO_UPDATE=false
MENU_ANIMATIONS=true
USE_SERVER=true
PORT=3000
# Required for persistence on ephemeral cloud hosts
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE
```

Keep `config.env` out of source control. `npm start` runs Node directly; use your host process manager or PM2 for standalone supervision.

## Your private workspace

Use **Message yourself** from the linked account. Other accounts, incoming sudo users and groups cannot open it.

| Command | Action |
| --- | --- |
| `.desk` | Dashboard with tasks, notes and focus progress |
| `.todo add Finish assignment` | Save a task with a stable ID |
| `.todo list` | Read tasks |
| `.todo done 1` / `.todo reopen 1` | Complete or reopen a task |
| `.todo remove 1` | Remove a task |
| `.notes add My idea` | Save text; also accepts replied text |
| `.notes list` / `.notes show 1` | Browse previews or read a note |
| `.notes search idea` / `.notes remove 1` | Search or remove notes |
| `.focus 25 Study` | Start a focus session |
| `.focus status` / `.focus cancel` | Check or cancel the timer |

Limits: 100 tasks, 50 notes of 2,000 characters each and one 1–180 minute focus session per linked account. Data is saved in the bot database. Completion is checked about every 30 seconds while connected, including after restarting. It is claimed before sending to avoid duplicates; a disconnect at that moment can prevent delivery. Persistent storage is required across redeployments. This is database-backed storage, not a separate end-to-end encrypted notes service.

## Interactive apps

Use `.mariorun` or `.beatstudio`. Compatible WhatsApp clients may render the experimental HTML response. Otherwise use `.mariorun file` or `.beatstudio file` and open the downloaded HTML in a browser. Audio starts after a user interaction. Beat Studio's `.beststuido` and `.beatstuido` aliases are retained.

## Automatic updates

### Original source → Amsoulness repository

[GitHub Actions](https://github.com/amsoulness/amsoulness-md/actions/workflows/upstream-sync.yml) checks approximately every six hours. Compatible bot changes are merged, checked and published. Conflicts or failed checks stop publication for review. GitHub schedules may be delayed or disabled after extended repository inactivity.

LICENSE, NOTICE, documentation, automation, session-service code and custom-only files are protected from automatic replacement. Original versions and commits are recorded separately in [the sync checkpoint](.upstream-sync.json). Amsoulness keeps its own version series; compatible syncs increment its patch version even if the original version is unchanged.

### Amsoulness repository → your running bot

Send this as its own WhatsApp message:

```text
.setvar AUTO_UPDATE=true
```

The bot checks about every two minutes while running. Updates require a working host, credentials and successful build. A notification alone does not prove installation completed. Check `.ping` after reconnecting.

Manual commands are `.update`, `.update start` and `.update beta`. The latter can apply new commits without a release bump. Render uses a host rebuild. Guided Koyeb and Heroku bots also support `.redeploy`, `.update start` and `.update beta` through their saved credentials; build acceptance is not build completion. Follow final results in the provider dashboard. Unattended host rebuild support depends on host configuration and is separate from repository sync.

### Render key setup

In the linked account's **Message yourself** chat, send one command at a time:

```text
.renderkey YOUR_RENDER_API_KEY
.renderkey status
.renderkey remove
```

The key is verified against the current service and saved privately for the linked account. The bot attempts to delete the message containing it and does not echo the key. Alternatively set `RENDER_API_KEY` in Render → bot service → Environment. Older builds without `.renderkey` need this environment setting and one manual rebuild. Removing a database override does not remove a host environment key.

## Make it yours

| Setting or command | Purpose |
| --- | --- |
| `.settings` | Browse preferences and their current values |
| `.settings BUTTONS on` | Enable experimental native controls |
| `.setinfo` | Customize bot name, owner and image; read its help first |
| `.setalive` / `.setalive del` | Configure a custom status reply or restore the default card |
| `.setvar MENU_ANIMATIONS=false` | Disable menu animation |
| `.setvar PROMO_MESSAGES=false` | Stop private project reminders at 10:00 and 18:00 IST |
| `.alias` | Manage command aliases |
| `.install` | Install community plugins after reviewing their source |

### Configuration reference

Set supported values with `.settings` or `.setvar KEY=VALUE`. Most changes are immediate; language changes require a restart. Booleans use `true` or `false`. Use the [typed schema](core/config/schema.js), [settings catalog](core/config/) and [configuration example](config.env.example) as the maintained reference.

| Area | Variables |
| --- | --- |
| Identity and access | `BOT_NAME`, `BOT_INFO`, `MODE`, `HANDLERS`, `MULTI_HANDLERS`, `SUDO`, `LANGUAGE`, `ALIVE`, `DISABLED_COMMANDS`, `BLOCK_CHAT` |
| Presence and reading | `ALWAYS_ONLINE`, `READ_MESSAGES`, `READ_COMMAND`, `CMD_REACTION`, `AUTO_READ_STATUS`, `AUTO_LIKE_STATUS` |
| Private chats and calls | `DIS_PM`, `PMB_VAR`, `PMB`, `PM_ANTISPAM`, `ANTISPAM_COUNT`, `REJECT_CALLS`, `CALL_REJECT_MESSAGE`, `ALLOWED_CALLS` |
| Groups | `ADMIN_ACCESS`, `ANTI_DELETE`, `WARN`, `ALLOWED`, `AUTOMUTE_MSG`, `AUTOUNMUTE_MSG` |
| Media | `STICKER_DATA`, `AUDIO_DATA`, `FORCE_STICKER_DATA` |
| Presentation and operations | `BUTTONS`, `MENU_ANIMATIONS`, `PROMO_MESSAGES`, `AUTO_UPDATE`, `DISABLE_START_MESSAGE`, `NOLOG` |

Languages include English, Manglish, Turkish, Indonesian, Brazilian Portuguese, Hinglish, Chinese and Spanish. Missing translations fall back to English.

Use the dedicated `.chatbot`, `.antiword` and `.antidelete` commands for their managed settings. `SESSION`, `PAIRING_NUMBER`, `DATABASE_URL` and host configuration belong in the environment/configuration file.

Optional runtime configuration:

```env
NODE_OPTIONS=--max-old-space-size=512
FFMPEG_CONCURRENCY=2
FFMPEG_TIMEOUT=600
MAX_RECONNECT_ATTEMPTS=10
CMD_CONCURRENCY=8
CMD_TIMEOUT=300
LOG_LEVEL=warn
BAILEYS_LOG_LEVEL=silent
DATABASE_SSL=true
SQLITE_PATH=./bot.db
PLUGIN_FETCH_TIMEOUT=15000
TEMP_DIR=temp
USE_SERVER=true
PORT=3000
```

These are examples, not required overrides. `CMD_TIMEOUT` frees a queue slot; it does not kill running work. Use `.mem` for memory information. Host rebuild credentials are `RENDER_API_KEY`; `KOYEB_API_KEY` with `KOYEB_SERVICE_ID`; or `HEROKU_API_KEY` with `HEROKU_APP_NAME`. Keep them private.

## Health and troubleshooting

With `USE_SERVER=true`, `/health` is the liveness endpoint and `/status` reports session state, uptime, memory and queue information without phone numbers or session strings. `.log` provides owner runtime logs; `.restart` restarts the bot. Restart/log controls can bypass a stalled command queue.

For stalled updates, inspect build logs, verify credentials and `AUTO_UPDATE`, and check the installed version after reconnecting. Sleeping hosts or expired databases can interrupt the bot independently of updates. Share only redacted logs in support requests.

## Development and verification

```sh
npm run test:syntax
npm test
npm ci --prefix session-service
npm test --prefix session-service
```

Tests cover presentation, message routing, private workspaces, sessions, key handling, updates and mocked deployment flows. They do not prove live behavior on every WhatsApp client or successful paid host provisioning.

| Source | Purpose |
| --- | --- |
| `plugins/` | Commands and automated features |
| `core/presentation.js` | Shared text, caption, interactive and relay styling |
| `core/menu-design.js` | Launch menu, directory and searchable help |
| `core/services/workspace.js` | Scoped database-backed tasks, notes and focus |
| `core/pipeline/` | Normalization, permissions and dispatch |
| `core/session/` | WhatsApp connection and messaging features |
| `session-service/` | QR/pairing and guided deployment APIs |
| `scripts/sync-upstream.cjs` | Conflict-aware source synchronization |
| `assets/interactive/` | Bundled HTML apps |
| `Dockerfile` / `Dockerfile.session` | Bot and session-service images |

Normal message helpers receive the shared presentation. Plugin authors can send explicit authored content unchanged with `aslnsRaw: true` on socket send/relay options. Do not alter message IDs, action IDs, copy codes, mentions or quotes when customizing presentation.

## Support and license

[Wiki](https://github.com/amsoulness/amsoulness-md/wiki) · [Issues](https://github.com/amsoulness/amsoulness-md/issues) · [Website](https://aslns.online). Include the running version and a redacted description of the issue.

This software uses unofficial WhatsApp Web methods and may result in account restrictions or bans. It is not affiliated with or endorsed by WhatsApp. Use only accounts and groups you are authorized to manage.

The [LICENSE](LICENSE) is unchanged. The retained [NOTICE](NOTICE) contains copyright and attribution terms. Amsoulness modifications are documented above.
