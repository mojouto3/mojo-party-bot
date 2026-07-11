# Activities and Games

## The core idea

Mojo Party Bot doesn't hardcode games into its logic. Every game or sub-activity is a row in the `activities` table, with a `field_schema` describing what information a session request for it should capture. The queue, matching, modal forms, and post rendering all work off that schema, unchanged regardless of which activity is selected.

This means adding a new game is a data change (a new `INSERT` in `database/schema.sql`), not a code change.

## Grouping

Activities that belong to the same game share a `game_group` value (e.g. all three Black Desert activities share `game_group = 'Black Desert Online'`). When a server has multiple games active, the "Create session request" button first asks which game, then which specific activity within it. If there's only one game, or only one activity, the extra step is skipped.

## The "slots" field type

Exactly one field per activity can be marked `"type": "slots"` in its schema. This is what slot-limit enforcement reads to know when a session is full, regardless of what that field is actually called (`slots_needed` for most games, `fleet_size` for Star Citizen PvP).

## Currently supported games

| Game | Sub-activities |
|---|---|
| EuroTruck Simulator 2 | Convoy |
| Star Citizen | Mining, Salvage, PvP |
| Black Desert Online | PvP / Node War, Farm / Grind, Guild Recruitment |
| Valorant | Competitive |
| Apex Legends | Squad |
| Counter-Strike 2 | Competitive |
| League of Legends | Ranked |
| World of Warcraft | Group Content (Raid / Mythic+ / PvP) |
| D&D 5th Edition | - |
| Call of Duty | Multiplayer |

## Thumbnails

Where the game is sold on Steam, the post shows the official Steam store artwork via a direct hotlink to Steam's CDN. The bot never hosts or reproduces game logos or artwork itself. Games not on Steam (Riot titles, Battle.net titles, tabletop games) show no thumbnail.

## Adding a new game

See [CONTRIBUTING.md](https://github.com/mojouto3/mojo-party-bot/blob/main/CONTRIBUTING.md#adding-a-new-activity) in the repository, or open a [new activity request](https://github.com/mojouto3/mojo-party-bot/issues/new/choose).
