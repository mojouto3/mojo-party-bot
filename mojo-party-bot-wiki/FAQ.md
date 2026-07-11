# FAQ

**Does the bot work for games it doesn't officially know about?**
Yes, in the sense that adding a new game is just a data entry (see [Activities and Games](Activities-and-Games)). It doesn't work "automatically" for arbitrary games without that entry being added first.

**Can the same server run multiple games?**
Yes. That's the core design. Use `/setup-game` to activate a whole game's activities at once, or `/setup` for one specific activity at a time.

**Why don't all games show a thumbnail image?**
The bot only links to official artwork from the game's own Steam store page (a hotlink, never a copy hosted by the bot). Games not sold on Steam (most Riot and Battle.net titles, and tabletop games) don't get a thumbnail, since there's no safe official source to link to.

**Does the bot support voice channel matchmaking or actual game invites?**
No. Most games don't expose a public API for generating invites, so this isn't something a third-party Discord bot can reliably build. The bot connects people via Discord (clickable mentions, DMs); joining each other in-game happens through the game's own tools.

**What happens to old session request posts?**
They're deleted from Discord automatically 7 days after creation if the session was never marked full or completed manually. The database record is kept (marked `expired`) so reputation history isn't lost.

**Is there a public bot invite link?**
Not yet. Check the repository's README for the current status.
