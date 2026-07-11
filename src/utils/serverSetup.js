const { ChannelType } = require('discord.js');
const db = require('../database/db');

/**
 * Stores the target channel on the server record (forum vs fallback text channel).
 * Returns whether the channel is a forum.
 */
async function setChannelForServer(channel, server) {
    const isForum = channel.type === ChannelType.GuildForum;
    const updateField = isForum ? 'forum_channel_id' : 'fallback_channel_id';

    await db.query(
        `UPDATE servers SET ${updateField} = $1 WHERE id = $2`,
        [channel.id, server.id]
    );

    return isForum;
}

/**
 * Makes sure a forum tag matching this activity exists on the forum channel,
 * creating it if needed, and stores its ID on server_activities so future
 * threads can be tagged automatically.
 */
async function ensureForumTag(channel, server, activity) {
    const forumChannel = await channel.guild.channels.fetch(channel.id);
    const tagName = activity.display_name.slice(0, 20);

    let tag = forumChannel.availableTags.find(existing => existing.name === tagName);

    if (!tag) {
        const newTags = [
            ...forumChannel.availableTags.map(existing => ({
                id: existing.id,
                name: existing.name,
                emoji: existing.emoji,
                moderated: existing.moderated,
            })),
            { name: tagName },
        ];

        try {
            const updatedChannel = await forumChannel.setAvailableTags(newTags);
            tag = updatedChannel.availableTags.find(existing => existing.name === tagName);
        } catch (err) {
            console.warn(`Could not create forum tag "${tagName}": ${err.message}`);
            return;
        }
    }

    if (tag) {
        await db.query(
            `UPDATE server_activities SET forum_tag_id = $1 WHERE server_id = $2 AND activity_id = $3`,
            [tag.id, server.id, activity.id]
        );
    }
}

/**
 * Activates a single activity for a server: links it in server_activities
 * and, if the channel is a forum, ensures a matching tag exists.
 */
async function activateActivityForServer(channel, server, activity, isForum) {
    await db.query(
        `INSERT INTO server_activities (server_id, activity_id)
         VALUES ($1, $2)
         ON CONFLICT (server_id, activity_id) DO NOTHING`,
        [server.id, activity.id]
    );

    if (isForum) {
        await ensureForumTag(channel, server, activity);
    }
}

module.exports = { setChannelForServer, ensureForumTag, activateActivityForServer };
