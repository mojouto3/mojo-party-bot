# Changelog

All notable changes to Mojo Party Bot are documented here.

Note: versions 0.1.0 through 0.7.0 were developed before the GitHub repository existed, so they don't have individual tags or releases. They're listed here as a historical record only. Starting with 0.8.0, every version gets a real tag and release.

## [0.8.0]

### Added
- Nine additional games as seed activities: Black Desert Online (PvP/Node War, Farm/Grind, Guild Recruitment), Valorant, Apex Legends, Counter-Strike 2, League of Legends, World of Warcraft, D&D 5th Edition, Call of Duty.
- Official Steam artwork thumbnails for games available on Steam.

## 0.7.0

### Added
- Automatic cleanup job: session request posts expire after 7 days and are removed from Discord, with the database row marked `expired` (not deleted, to preserve reputation history).

## 0.6.0

### Added
- Slot-limit enforcement. Sessions close automatically once full, based on a generic `"type": "slots"` field in each activity's schema.
- "Mark as done" flow. The creator can close a session, triggering DM-based reputation tagging (good comms / toxic / play again) for the creator and all participants.
- Live reputation computed directly from endorsements instead of a cached summary table (fixes a Postgres `UNIQUE` constraint issue with `NULL` `activity_id` values).

## 0.5.1

### Fixed
- Join notification DMs now use a clickable Discord mention instead of plain text.

## 0.5.0

### Added
- `/setup-game` command: activates every activity under a game at once, with autocomplete.
- Shared `src/utils/serverSetup.js` helper used by both `/setup` and `/setup-game`.

## 0.4.0

### Added
- Two-step activity selection when a server has multiple games active: pick the game, then the specific activity within it.
- Star Citizen seed activities (Mining, Salvage, PvP) used to validate the grouping logic.

## 0.3.0

### Added
- Official game artwork as a post thumbnail (Steam CDN hotlink, not hosted by the bot).
- Forum tags: `/setup` creates and applies a matching tag per activity automatically.

## 0.2.0

### Changed
- Full pass converting all code comments, logs, and documentation to English. User-facing bot replies remain translatable via `src/i18n`.

## 0.1.0

### Added
- Initial activity-agnostic schema: users, activities, servers, session_requests, matches, endorsements.
- `/setup`, `/profile`, `/post-hub` commands.
- Button-first UX: hub message with Create/Browse/Profile buttons, modal-based session creation.
- Components V2 rendering for all bot messages.
- DM notification to the session creator when someone joins.
- i18n system with automatic locale detection from each user's Discord client (Greek, English).

[0.8.0]: https://github.com/mojouto3/mojo-party-bot/releases/tag/v0.8.0
