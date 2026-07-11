# Mojo Party Bot

[![CI](https://github.com/mojouto3/mojo-party-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/mojouto3/mojo-party-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)](https://discord.js.org)

Discord bot for LFG / group finding, activity-agnostic. Works the same way for gaming (Valorant, Black Desert), simulation (EuroTruck Simulator 2), and TTRPGs (D&D) without any code changes per activity.

## What's in this version

- Full activity-agnostic database design (users, activities, servers, session_requests, matches, endorsements)
- `/setup` command (owner-only) to configure the posting channel and activate an activity for a server
- `/profile` command showing a user's profile via Components V2
- `/post-hub` command that posts a permanent, pinned message with buttons (Create / Browse / Profile)
- Button-first UX: creating a session request opens a modal form, no slash command syntax required
- Session requests are posted as Components V2 cards with accent colors per activity, and a Join button
- Slot-limit enforcement: sessions close automatically once full
- "Mark as done" flow: creator closes the session, triggers DM-based reputation tagging (👍/👎/🤝) for creator and all participants
- Expired session posts (7 days by default) are automatically deleted from Discord and marked expired in the database
- Joining a session sends a real DM notification to the creator, with a clickable mention
- Full i18n support: bot replies automatically match each user's Discord client language (currently Greek and English, extensible)

Not yet built: full matching algorithm (currently direct-join), federated cross-server queue.

## Prerequisites

- Node.js 18+ (`node --version` to check)
- PostgreSQL (local or via Docker)
- A Discord Application/Bot from the [Discord Developer Portal](https://discord.com/developers/applications)

## Setup steps (PowerShell)

### 1. Install dependencies

```powershell
cd mojo-party-bot
npm install
```

### 2. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. New Application, name it "Mojo Party Bot"
3. On the "Bot" tab, click "Reset Token" and copy the token
4. On "OAuth2" -> "General", copy the Client ID

### 3. Configure .env

```powershell
copy .env.example .env
```

Open `.env` and fill in:

```
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
DATABASE_URL=postgresql://postgres:password@localhost:5432/mojo_party_bot
```

### 4. Create the database

```powershell
psql -U postgres -c "CREATE DATABASE mojo_party_bot;"
npm run db:migrate
```

`db:migrate` runs `database/schema.sql`, which creates all tables and seeds the first activity type (EuroTruck Simulator 2 - Convoy).

### 5. Invite the bot to your server

Build an invite link (replace CLIENT_ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=277025508352&scope=bot%20applications.commands
```

### 6. Register slash commands

```powershell
npm run deploy-commands
```

Global commands can take up to an hour to propagate the first time. For instant updates during development, set `DISCORD_DEV_GUILD_ID` in `.env` to your test server's ID.

### 7. Start the bot

```powershell
npm start
```

### 8. Try it out

Inside your Discord server:

```
/setup channel:#your-forum-channel activity:EuroTruck Simulator 2 - Convoy
/post-hub
```

Then use the buttons on the hub message to create and browse session requests.

## Project structure

```
mojo-party-bot/
  database/
    schema.sql              -- full schema + seed data
  src/
    commands/                -- one file per slash command
    database/
      db.js                   -- connection pool
      helpers.js               -- ensureUser, ensureServer
      migrate.js                -- runs schema.sql
    handlers/
      loadCommands.js
      interactionHandler.js
      componentHandler.js      -- buttons, select menus
      modalHandler.js           -- session creation form submit
    i18n/
      index.js                  -- t() translation helper
      locales/
        el.json
        en.json
    utils/
      activityFields.js         -- builds modal forms from activity field_schema
      formatters.js
      renderProfile.js
      renderSessionPost.js
    index.js                    -- entry point
    deploy-commands.js          -- registers slash commands with Discord
  package.json
  .env.example
```

## Roadmap

1. Full matching algorithm (beyond direct-join)
2. Federated cross-server queue
3. Additional activity types (Black Desert, D&D)
