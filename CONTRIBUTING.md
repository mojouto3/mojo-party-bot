# Contributing to Mojo Party Bot

Thanks for your interest in contributing.

## Development setup

See the [README](README.md) for full setup instructions (Node.js, PostgreSQL, Discord Application).

For instant slash command updates during development, set `DISCORD_DEV_GUILD_ID` in your `.env` to a test server's Guild ID.

## Project structure

See the "Project structure" section in the README for an overview of `src/commands`, `src/handlers`, `src/utils`, and `src/i18n`.

## Adding a new activity

Activities are data, not code. To add a new game or sub-activity:

1. Add a new `INSERT INTO activities` block in `database/schema.sql`, following the pattern of existing entries.
2. Define `field_schema.fields` for whatever information that activity needs (route, rank, class, etc). Use `"type": "slots"` on the one field that represents how many players are needed, so slot-limit enforcement works automatically.
3. Add the new activity's slug to the `addChoices()` list in `src/commands/setup.js` if you want it selectable via `/setup` directly (it's always selectable via `/setup-game` regardless, through autocomplete).
4. Run `npm run db:migrate` to apply it.

No changes to matching, modal building, or post rendering are needed. That's the point of the activity-agnostic design.

## Commit and PR conventions

- No em dashes in commit messages, PR titles/descriptions, or any GitHub-facing text.
- No emoji in issue or PR titles.
- Keep commits focused. One logical change per commit where reasonable.
- Reference the issue number in your PR description if applicable (e.g. `Fixes #12`).

## Reporting bugs / requesting features

Please use the issue templates. Include reproduction steps for bugs, and the motivation/use case for feature requests.

## Code style

- Plain, readable Node.js (CommonJS, matching the rest of the codebase).
- All comments, logs, and error messages in English.
- User-facing bot messages go through the i18n system (`src/i18n`), not hardcoded strings.
