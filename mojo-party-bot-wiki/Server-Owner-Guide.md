# Server Owner Guide

## Recommended channel setup

Two dedicated channels, outside any specific game category:

- A **Forum channel** (e.g. `party-finder`) where the bot posts session requests as threads. Forum channels support tags, which the bot manages automatically per activity.
- A **Text channel** (e.g. `start-here`) for the pinned hub message with the Create / Browse / Profile buttons.

## Commands

### `/setup`

Activates a single activity and sets the posting channel.

```
/setup channel:#party-finder activity:EuroTruck Simulator 2 - Convoy
```

### `/setup-game`

Activates every activity under a game at once. Start typing the game name for autocomplete suggestions.

```
/setup-game channel:#party-finder game:Star Citizen
```

### `/post-hub`

Posts the permanent, pinned message with the Create / Browse / Profile buttons. Run this once per channel where you want it to appear.

## Recommended permissions

**Forum channel**, `@everyone`: View Channel, Read Message History, Send Messages in Threads. Deny Create Posts (only the bot should create posts, via the buttons). Allow Use Application Commands.

**Forum channel**, bot's role: everything needed to post, manage threads and tags.

**Text (hub) channel**, `@everyone`: View Channel, Read Message History, Use Application Commands. Deny Send Messages (nothing to type there, only buttons to click).

**Text (hub) channel**, bot's role: Send Messages, Manage Messages (for pinning), Read Message History, Use Application Commands.

## How posts close

- **Full**: once a session reaches its configured slot limit, it closes automatically and the Join button disables.
- **Completed**: the creator can click "Mark as done" at any time to close it manually and trigger reputation rating DMs for everyone involved.
- **Expired**: session posts are automatically deleted from Discord 7 days after creation if never closed manually.
