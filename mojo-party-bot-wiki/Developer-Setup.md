# Developer Setup

This mirrors the README's setup steps, with more detail on common issues.

## Prerequisites

- Node.js 18+
- PostgreSQL (local install, or a hosted instance)
- A Discord Application with a Bot user

## Environment variables (`.env`)

| Variable | Required | Notes |
|---|---|---|
| `DISCORD_TOKEN` | Yes | From the Bot tab of the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | The application's Client ID (OAuth2 -> General) |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `DISCORD_DEV_GUILD_ID` | No | Set this to your test server's ID for instant slash command updates during development. Without it, commands are registered globally and can take up to an hour to propagate the first time. |
| `NODE_ENV` | No | `development` or `production` |

## Common issues

**"This command is outdated, please try again in a few minutes"**
Discord's client cached the old command definition. Wait a bit and refresh Discord (Ctrl+R), or fully restart the client.

**Bot responds in the wrong language / old behavior after an update**
A previous `node src/index.js` process is likely still running in the background. Stop all Node processes before restarting:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Windows Defender flags a `.js` file as a Trojan**
This is a known false positive pattern (`Trojan:Script/ObfuscScript.A!ml`) for freshly downloaded, unsigned JavaScript files. Restore it from quarantine and add the project folder to Defender's exclusions.

**`Invalid URL` error when running `npm run db:migrate`**
Check the `DATABASE_URL` format carefully: `postgresql://user:password@host:port/database`. A common mistake is missing the `@host` segment.
