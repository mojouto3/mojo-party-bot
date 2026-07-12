const { ChannelType } = require('discord.js');
const db = require('../database/db');

function isForumChannel(channel) {
    return channel.type === ChannelType.GuildForum;
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
 * Activates a single activity for a server, storing which channel THIS
 * activity posts to (not a server-wide channel - each activity can have
 * its own). If the channel is a forum, ensures a matching tag exists.
 */
async function activateActivityForServer(channel, server, activity, isForum) {
    await db.query(
        `INSERT INTO server_activities (server_id, activity_id, channel_id, is_forum)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (server_id, activity_id)
         DO UPDATE SET channel_id = EXCLUDED.channel_id, is_forum = EXCLUDED.is_forum`,
        [server.id, activity.id, channel.id, isForum]
    );

    if (isForum) {
        await ensureForumTag(channel, server, activity);
    }
}

module.exports = { isForumChannel, ensureForumTag, activateActivityForServer };
