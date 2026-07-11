const db = require('../database/db');

/**
 * Computes a user's reputation live from the endorsements table.
 *
 * Note: we don't rely on the reputation_summary cache table for now,
 * since its UNIQUE(user_id, activity_id) constraint doesn't correctly
 * dedupe rows where activity_id is NULL (global reputation) - Postgres
 * treats every NULL as distinct for uniqueness purposes. Computing live
 * is correct and fast enough at this scale; a proper cache/recompute
 * job can replace this later if needed.
 */
async function getUserReputation(userId) {
    const result = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE tag IN ('good_comms', 'play_again')) AS positive_tags,
            COUNT(*) FILTER (WHERE tag = 'toxic') AS negative_tags,
            COUNT(DISTINCT match_id) AS total_sessions
         FROM endorsements
         WHERE to_user_id = $1`,
        [userId]
    );

    const row = result.rows[0];
    const positive = Number(row.positive_tags);
    const negative = Number(row.negative_tags);
    const total = Number(row.total_sessions);

    const score = positive + negative > 0 ? Math.round((5 * positive / (positive + negative)) * 10) / 10 : 0;

    return { score, total_sessions: total };
}

module.exports = { getUserReputation };
