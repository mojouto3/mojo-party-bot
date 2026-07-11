const { MessageFlags, ChannelType } = require('discord.js');
const db = require('../database/db');
const { ensureUser, ensureServer } = require('../database/helpers');
const { buildSessionPostContainer } = require('../utils/renderSessionPost');
const { getUserReputation } = require('../utils/reputation');
const { t } = require('../i18n');

async function handleModalSubmit(interaction) {
    if (!interaction.customId.startsWith('mpb_session_modal_')) return;

    const locale = interaction.locale;
    const activityId = interaction.customId.replace('mpb_session_modal_', '');

    const activityResult = await db.query('SELECT * FROM activities WHERE id = $1', [activityId]);
    if (activityResult.rows.length === 0) {
        return interaction.reply({ content: t('modal.activity_not_found', locale), flags: MessageFlags.Ephemeral });
    }
    const activity = activityResult.rows[0];

    const user = await ensureUser(interaction.user);
    const server = await ensureServer(interaction.guild);

    const fieldData = {};
    for (const field of activity.field_schema.fields || []) {
        const value = interaction.fields.getTextInputValue(field.key);
        if (value) fieldData[field.key] = value;
    }

    const sessionResult = await db.query(
        `INSERT INTO session_requests (creator_id, activity_id, server_id, filters, status, expires_at)
         VALUES ($1, $2, $3, $4, 'open', now() + interval '7 days')
         RETURNING *`,
        [user.id, activity.id, server.id, JSON.stringify(fieldData)]
    );
    const sessionRequest = sessionResult.rows[0];

    const reputation = await getUserReputation(user.id);

    const container = buildSessionPostContainer({
        sessionRequest,
        activity,
        creatorDiscordUser: interaction.user,
        reputation,
        locale,
    });

    const targetChannelId = server.forum_channel_id || server.fallback_channel_id;

    if (!targetChannelId) {
        return interaction.reply({
            content: t('modal.no_channel_configured', locale),
            flags: MessageFlags.Ephemeral,
        });
    }

    const channel = await interaction.client.channels.fetch(targetChannelId);
    let sentMessageId = null;

    if (channel.type === ChannelType.GuildForum) {
        const tagResult = await db.query(
            `SELECT forum_tag_id FROM server_activities WHERE server_id = $1 AND activity_id = $2`,
            [server.id, activity.id]
        );
        const forumTagId = tagResult.rows[0]?.forum_tag_id;

        const thread = await channel.threads.create({
            name: `${interaction.user.globalName || interaction.user.username} · ${activity.display_name}`.slice(0, 90),
            message: { components: [container], flags: MessageFlags.IsComponentsV2 },
            appliedTags: forumTagId ? [forumTagId] : [],
        });
        sentMessageId = thread.id;
    } else {
        const sent = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        sentMessageId = sent.id;
    }

    await db.query(
        `UPDATE session_requests SET discord_thread_id = $1 WHERE id = $2`,
        [sentMessageId, sessionRequest.id]
    );

    await interaction.reply({
        content: t('modal.published', locale, { channel: `${channel}` }),
        flags: MessageFlags.Ephemeral,
    });
}

module.exports = { handleModalSubmit };
