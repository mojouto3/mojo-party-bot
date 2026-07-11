const db = require('./db');

/**
 * Finds the user in the database by Discord ID.
 * Creates them if they don't exist yet (upsert).
 */
async function ensureUser(discordUser) {
    const result = await db.query(
        `INSERT INTO users (discord_id, username)
         VALUES ($1, $2)
         ON CONFLICT (discord_id)
         DO UPDATE SET username = EXCLUDED.username
         RETURNING *`,
        [discordUser.id, discordUser.username]
    );
    return result.rows[0];
}

/**
 * Finds or creates the server record in the database.
 */
async function ensureServer(guild) {
    const result = await db.query(
        `INSERT INTO servers (discord_guild_id, name)
         VALUES ($1, $2)
         ON CONFLICT (discord_guild_id)
         DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [guild.id, guild.name]
    );
    return result.rows[0];
}

module.exports = { ensureUser, ensureServer };
