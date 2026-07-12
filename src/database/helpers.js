const db = require('./db');

/**
 * Finds the user in the database by Discord ID.
 * Creates them if they don't exist yet (upsert).
 */
async function ensureUser(discordUser) {
    const displayName = discordUser.globalName || discordUser.username;

    const result = await db.query(
        `INSERT INTO users (discord_id, username)
         VALUES ($1, $2)
         ON CONFLICT (discord_id)
         DO UPDATE SET username = EXCLUDED.username
         RETURNING *`,
        [discordUser.id, displayName]
    );
    return result.rows[0];
}

/**
 * Finds or creates the server record in the database.
 */
async function ensureServer(guild) {
    const result = await db.query(
        `INSERT INTO servers (discord_guild_id, name, owner_discord_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (discord_guild_id)
         DO UPDATE SET name = EXCLUDED.name, owner_discord_id = EXCLUDED.owner_discord_id
         RETURNING *`,
        [guild.id, guild.name, guild.ownerId]
    );
    return result.rows[0];
}

module.exports = { ensureUser, ensureServer };
