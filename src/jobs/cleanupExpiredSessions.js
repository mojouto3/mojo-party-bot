const db = require('../database/db');

/**
 * Deletes expired session request posts from Discord and marks them
 * 'expired' in the database (we never hard-delete the row, since
 * matches.session_request_id references it and other tables trace
 * reputation history through matches - deleting would either break
 * that FK or silently lose audit history).
 */
async function cleanupExpiredSessions(client) {
    const result = await db.query(
        `SELECT sr.id, sr.discord_thread_id,
                sa.channel_id, sa.is_forum
         FROM session_requests sr
         JOIN server_activities sa ON sa.server_id = sr.server_id AND sa.activity_id = sr.activity_id
         WHERE sr.status IN ('open', 'full', 'completed')
           AND sr.expires_at IS NOT NULL
           AND sr.expires_at < now()`
    );

    if (result.rows.length === 0) return;

    console.log(`Cleanup: ${result.rows.length} expired session request(s) to remove.`);

    for (const row of result.rows) {
        if (row.channel_id && row.discord_thread_id) {
            try {
                const channel = await client.channels.fetch(row.channel_id);

                if (row.is_forum) {
                    const thread = await channel.threads.fetch(row.discord_thread_id);
                    if (thread) await thread.delete();
                } else {
                    const message = await channel.messages.fetch(row.discord_thread_id);
                    if (message) await message.delete();
                }
            } catch (err) {
                // Already deleted, channel gone, missing permissions, etc. - not fatal,
                // we still mark it expired below so we stop retrying it forever.
                console.warn(`Could not delete Discord content for session request ${row.id}: ${err.message}`);
            }
        }

        await db.query(`UPDATE session_requests SET status = 'expired' WHERE id = $1`, [row.id]);
    }
}

module.exports = { cleanupExpiredSessions };
