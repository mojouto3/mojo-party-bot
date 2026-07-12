const db = require('../database/db');
const { t } = require('../i18n');

/**
 * DMs every known server owner when a new activity has been added to
 * the database, then marks it as notified so it's not sent again.
 *
 * This never activates anything automatically - owners still choose via
 * /setup or /setup-game. It's purely a "hey, this exists now" nudge.
 */
async function notifyNewActivities(client) {
    const newActivities = await db.query(
        `SELECT id, display_name, game_group FROM activities
         WHERE notified = false AND is_active = true`
    );

    if (newActivities.rows.length === 0) return;

    const serversResult = await db.query(
        `SELECT DISTINCT owner_discord_id FROM servers WHERE owner_discord_id IS NOT NULL`
    );

    console.log(`Notifying ${serversResult.rows.length} server owner(s) about ${newActivities.rows.length} new activity(ies).`);

    for (const activity of newActivities.rows) {
        const gameGroupSuffix = activity.game_group ? ` (${activity.game_group})` : '';

        for (const server of serversResult.rows) {
            try {
                const owner = await client.users.fetch(server.owner_discord_id);
                await owner.send(
                    t('notify.new_activity', null, {
                        activity: activity.display_name,
                        gameGroup: gameGroupSuffix,
                    })
                );
            } catch (err) {
                // Owner may have DMs closed, left the server, etc. - not fatal.
                console.warn(`Could not notify owner ${server.owner_discord_id}: ${err.message}`);
            }
        }

        await db.query(`UPDATE activities SET notified = true WHERE id = $1`, [activity.id]);
    }
}

module.exports = { notifyNewActivities };
