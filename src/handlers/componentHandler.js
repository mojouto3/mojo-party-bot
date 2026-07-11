const {
    MessageFlags,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../database/db');
const { ensureUser, ensureServer } = require('../database/helpers');
const { buildSessionModal } = require('../utils/activityFields');
const { buildProfileContainer } = require('../utils/renderProfile');
const { buildSessionPostContainer } = require('../utils/renderSessionPost');
const { getSlotsNeeded } = require('../utils/formatters');
const { getUserReputation } = require('../utils/reputation');
const { t } = require('../i18n');

const RATE_TAG_CODES = { good: 'good_comms', toxic: 'toxic', again: 'play_again' };

async function getActiveActivitiesForGuild(guildId) {
    const result = await db.query(
        `SELECT a.* FROM activities a
         JOIN server_activities sa ON sa.activity_id = a.id
         JOIN servers s ON s.id = sa.server_id
         WHERE s.discord_guild_id = $1 AND a.is_active = true`,
        [guildId]
    );
    return result.rows;
}

function groupActivitiesByGame(activities) {
    const groups = {};
    for (const activity of activities) {
        const key = activity.game_group || activity.display_name;
        if (!groups[key]) groups[key] = [];
        groups[key].push(activity);
    }
    return groups;
}

function buildActivitySelectPayload(activities, locale) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('mpb_select_activity_for_create')
        .setPlaceholder(t('component.select_activity_placeholder', locale))
        .addOptions(
            activities.map(a => ({
                label: a.display_name,
                value: String(a.id),
                description: a.game_group ? a.game_group.slice(0, 100) : undefined,
            }))
        );

    return {
        content: t('component.select_activity_prompt', locale),
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral,
    };
}

async function handleCreateSession(interaction) {
    const locale = interaction.locale;
    const activities = await getActiveActivitiesForGuild(interaction.guild.id);

    if (activities.length === 0) {
        return interaction.reply({
            content: t('component.no_activity_configured', locale),
            flags: MessageFlags.Ephemeral,
        });
    }

    if (activities.length === 1) {
        return interaction.showModal(buildSessionModal(activities[0]));
    }

    const grouped = groupActivitiesByGame(activities);
    const gameKeys = Object.keys(grouped);

    if (gameKeys.length === 1) {
        return interaction.reply(buildActivitySelectPayload(grouped[gameKeys[0]], locale));
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('mpb_select_game_for_create')
        .setPlaceholder(t('component.select_game_placeholder', locale))
        .addOptions(
            gameKeys.map(key => ({
                label: key,
                value: key,
                description: `${grouped[key].length} activities`.slice(0, 100),
            }))
        );

    await interaction.reply({
        content: t('component.select_game_prompt', locale),
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral,
    });
}

async function handleSelectGameForCreate(interaction) {
    const locale = interaction.locale;
    const gameGroup = interaction.values[0];
    const activities = await getActiveActivitiesForGuild(interaction.guild.id);
    const filtered = activities.filter(a => (a.game_group || a.display_name) === gameGroup);

    if (filtered.length === 1) {
        return interaction.showModal(buildSessionModal(filtered[0]));
    }

    return interaction.update(buildActivitySelectPayload(filtered, locale));
}

async function handleSelectActivityForCreate(interaction) {
    const activityId = interaction.values[0];
    const result = await db.query('SELECT * FROM activities WHERE id = $1', [activityId]);
    if (result.rows.length === 0) {
        return interaction.reply({
            content: t('component.activity_not_found', interaction.locale),
            flags: MessageFlags.Ephemeral,
        });
    }
    return interaction.showModal(buildSessionModal(result.rows[0]));
}

async function handleBrowseSessions(interaction) {
    const locale = interaction.locale;
    const result = await db.query(
        `SELECT sr.id, sr.filters, a.display_name AS activity_name, u.id AS user_pk, u.username
         FROM session_requests sr
         JOIN activities a ON a.id = sr.activity_id
         JOIN users u ON u.id = sr.creator_id
         JOIN servers s ON s.id = sr.server_id
         WHERE s.discord_guild_id = $1 AND sr.status = 'open'
         ORDER BY sr.created_at DESC
         LIMIT 10`,
        [interaction.guild.id]
    );

    if (result.rows.length === 0) {
        return interaction.reply({
            content: t('component.browse_empty', locale),
            flags: MessageFlags.Ephemeral,
        });
    }

    const container = new ContainerBuilder().setAccentColor(0x1D9E75);
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(t('component.browse_title', locale))
    );

    for (const row of result.rows) {
        const rep = await getUserReputation(row.user_pk);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**${row.username}** · ${row.activity_name}\n⭐ ${Number(rep.score).toFixed(1)} · ${rep.total_sessions} sessions`
            )
        );
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mpb_join_${row.id}`)
                    .setLabel('Join')
                    .setStyle(ButtonStyle.Primary)
            )
        );
    }

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
}

async function handleMyProfile(interaction) {
    const container = await buildProfileContainer(interaction.user, interaction.locale);
    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
}

/**
 * Fetches everything needed about a session request to act on it:
 * creator info, activity definition, and the server's posting channel.
 */
async function getSessionContext(sessionRequestId) {
    const result = await db.query(
        `SELECT sr.id, sr.discord_thread_id, sr.creator_id, sr.status, sr.filters,
                a.id AS activity_id, a.display_name AS activity_name, a.field_schema,
                a.accent_color, a.icon,
                u.discord_id AS creator_discord_id,
                s.forum_channel_id, s.fallback_channel_id
         FROM session_requests sr
         JOIN activities a ON a.id = sr.activity_id
         JOIN users u ON u.id = sr.creator_id
         JOIN servers s ON s.id = sr.server_id
         WHERE sr.id = $1`,
        [sessionRequestId]
    );
    return result.rows[0] || null;
}

/**
 * Re-renders the live session post (forum thread starter message, or the
 * plain channel message) to reflect a new state - e.g. disabling the Join
 * button once the session is full or completed.
 *
 * Note: this always renders using the default locale, since we don't have
 * a specific viewer's locale available when editing an existing message
 * (same limitation as the hub message's static button labels).
 */
async function updateLiveSessionPost(client, session, state) {
    const channelId = session.forum_channel_id || session.fallback_channel_id;
    if (!channelId || !session.discord_thread_id) return;

    try {
        const channel = await client.channels.fetch(channelId);
        let message;

        if (channel.type === ChannelType.GuildForum) {
            const thread = await channel.threads.fetch(session.discord_thread_id);
            message = await thread.fetchStarterMessage();
        } else {
            message = await channel.messages.fetch(session.discord_thread_id);
        }

        const creatorDiscordUser = await client.users.fetch(session.creator_discord_id);
        const reputation = await getUserReputation(session.creator_id);

        const container = buildSessionPostContainer({
            sessionRequest: { id: session.id, filters: session.filters },
            activity: {
                display_name: session.activity_name,
                accent_color: session.accent_color,
                icon: session.icon,
                field_schema: session.field_schema,
            },
            creatorDiscordUser,
            reputation,
            locale: null,
            state,
        });

        await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
        console.warn(`Could not update live session post: ${err.message}`);
    }
}

async function handleJoinSession(interaction, sessionRequestId) {
    const locale = interaction.locale;
    const user = await ensureUser(interaction.user);

    const session = await getSessionContext(sessionRequestId);
    if (!session) {
        return interaction.reply({ content: t('component.join_not_found', locale), flags: MessageFlags.Ephemeral });
    }

    if (session.status !== 'open') {
        const key = session.status === 'full' ? 'component.join_session_full' : 'component.join_session_closed';
        return interaction.reply({ content: t(key, locale), flags: MessageFlags.Ephemeral });
    }

    const isOwnSession = session.creator_discord_id === interaction.user.id;

    let matchResult = await db.query(
        `SELECT * FROM matches WHERE session_request_id = $1 AND status = 'pending' LIMIT 1`,
        [sessionRequestId]
    );

    let match;
    if (matchResult.rows.length === 0) {
        const created = await db.query(
            `INSERT INTO matches (session_request_id, status) VALUES ($1, 'pending') RETURNING *`,
            [sessionRequestId]
        );
        match = created.rows[0];
    } else {
        match = matchResult.rows[0];
    }

    const alreadyJoined = await db.query(
        `SELECT 1 FROM match_participants WHERE match_id = $1 AND user_id = $2`,
        [match.id, user.id]
    );

    if (alreadyJoined.rows.length > 0 && !isOwnSession) {
        return interaction.reply({ content: t('component.join_already_joined', locale), flags: MessageFlags.Ephemeral });
    }

    const slotsNeeded = getSlotsNeeded(session.field_schema, session.filters || {});

    if (!isOwnSession && slotsNeeded) {
        const countResult = await db.query(
            `SELECT COUNT(*)::int AS count FROM match_participants WHERE match_id = $1`,
            [match.id]
        );
        if (countResult.rows[0].count >= slotsNeeded) {
            return interaction.reply({ content: t('component.join_session_full', locale), flags: MessageFlags.Ephemeral });
        }
    }

    await db.query(
        `INSERT INTO match_participants (match_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (match_id, user_id) DO NOTHING`,
        [match.id, user.id]
    );

    let becameFull = false;
    if (!isOwnSession && slotsNeeded) {
        const afterCount = await db.query(
            `SELECT COUNT(*)::int AS count FROM match_participants WHERE match_id = $1`,
            [match.id]
        );
        if (afterCount.rows[0].count >= slotsNeeded) {
            await db.query(`UPDATE session_requests SET status = 'full' WHERE id = $1`, [sessionRequestId]);
            becameFull = true;
        }
    }

    let notificationSent = false;

    if (!isOwnSession) {
        try {
            const creatorDiscordUser = await interaction.client.users.fetch(session.creator_discord_id);
            const threadMention = session.discord_thread_id ? `<#${session.discord_thread_id}>` : '';
            await creatorDiscordUser.send(
                t('component.dm_notification', null, {
                    joiner: `<@${interaction.user.id}>`,
                    activity: session.activity_name,
                    thread: threadMention,
                })
            );
            notificationSent = true;
        } catch (err) {
            console.warn(`Could not send DM to session creator: ${err.message}`);
        }
    }

    if (becameFull) {
        await updateLiveSessionPost(interaction.client, session, 'full');
    }

    await interaction.reply({
        content: isOwnSession
            ? t('component.join_own_session', locale)
            : notificationSent
                ? t('component.join_notified', locale)
                : t('component.join_no_dm', locale),
        flags: MessageFlags.Ephemeral,
    });
}

async function handleMarkComplete(interaction, sessionRequestId) {
    const locale = interaction.locale;
    const session = await getSessionContext(sessionRequestId);

    if (!session) {
        return interaction.reply({ content: t('component.join_not_found', locale), flags: MessageFlags.Ephemeral });
    }
    if (interaction.user.id !== session.creator_discord_id) {
        return interaction.reply({ content: t('component.complete_not_creator', locale), flags: MessageFlags.Ephemeral });
    }
    if (session.status === 'completed') {
        return interaction.reply({ content: t('component.complete_already', locale), flags: MessageFlags.Ephemeral });
    }

    await db.query(`UPDATE session_requests SET status = 'completed' WHERE id = $1`, [sessionRequestId]);
    await updateLiveSessionPost(interaction.client, session, 'completed');

    const matchResult = await db.query(
        `SELECT * FROM matches WHERE session_request_id = $1 LIMIT 1`,
        [sessionRequestId]
    );

    if (matchResult.rows.length === 0) {
        return interaction.reply({ content: t('component.complete_no_participants', locale), flags: MessageFlags.Ephemeral });
    }
    const match = matchResult.rows[0];

    const participantsResult = await db.query(
        `SELECT u.id AS user_id, u.discord_id, u.username
         FROM match_participants mp
         JOIN users u ON u.id = mp.user_id
         WHERE mp.match_id = $1 AND u.discord_id != $2`,
        [match.id, session.creator_discord_id]
    );
    const guests = participantsResult.rows;

    if (guests.length === 0) {
        return interaction.reply({ content: t('component.complete_no_participants', locale), flags: MessageFlags.Ephemeral });
    }

    // DM the creator: one row of 3 rating buttons per guest (up to 5, Discord's row limit)
    try {
        const creatorDiscordUser = await interaction.client.users.fetch(session.creator_discord_id);
        const rows = guests.slice(0, 5).map(guest =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mpb_rate_${match.id}_${guest.discord_id}_good`)
                    .setLabel(`👍 ${guest.username}`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`mpb_rate_${match.id}_${guest.discord_id}_toxic`)
                    .setLabel(`👎 ${guest.username}`)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`mpb_rate_${match.id}_${guest.discord_id}_again`)
                    .setLabel(`🤝 ${guest.username}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        );
        await creatorDiscordUser.send({
            content: t('rate.creator_prompt', null, {
                activity: session.activity_name,
                participants: guests.map(g => `<@${g.discord_id}>`).join(', '),
            }),
            components: rows,
        });
    } catch (err) {
        console.warn(`Could not send rating DM to creator: ${err.message}`);
    }

    // DM each guest: rate the creator
    for (const guest of guests) {
        try {
            const guestDiscordUser = await interaction.client.users.fetch(guest.discord_id);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mpb_rate_${match.id}_${session.creator_discord_id}_good`)
                    .setLabel(`👍 ${t('rate.tag_good_comms', null)}`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`mpb_rate_${match.id}_${session.creator_discord_id}_toxic`)
                    .setLabel(`👎 ${t('rate.tag_toxic', null)}`)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`mpb_rate_${match.id}_${session.creator_discord_id}_again`)
                    .setLabel(`🤝 ${t('rate.tag_play_again', null)}`)
                    .setStyle(ButtonStyle.Secondary)
            );
            await guestDiscordUser.send({
                content: t('rate.guest_prompt', null, {
                    activity: session.activity_name,
                    creator: `<@${session.creator_discord_id}>`,
                }),
                components: [row],
            });
        } catch (err) {
            console.warn(`Could not send rating DM to guest ${guest.discord_id}: ${err.message}`);
        }
    }

    await interaction.reply({ content: t('component.complete_success', locale), flags: MessageFlags.Ephemeral });
}

async function handleRateParticipant(interaction) {
    const locale = interaction.locale;
    const rest = interaction.customId.replace('mpb_rate_', '');
    const [matchId, toDiscordId, code] = rest.split('_');
    const tag = RATE_TAG_CODES[code];
    if (!tag) return;

    const fromUser = await ensureUser(interaction.user);

    let toUserResult = await db.query('SELECT * FROM users WHERE discord_id = $1', [toDiscordId]);
    let toUser;
    if (toUserResult.rows.length === 0) {
        const discordUser = await interaction.client.users.fetch(toDiscordId).catch(() => null);
        if (!discordUser) {
            return interaction.reply({ content: t('common.generic_error', locale), flags: MessageFlags.Ephemeral });
        }
        toUser = await ensureUser(discordUser);
    } else {
        toUser = toUserResult.rows[0];
    }

    const inserted = await db.query(
        `INSERT INTO endorsements (match_id, from_user_id, to_user_id, tag)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (match_id, from_user_id, to_user_id, tag) DO NOTHING
         RETURNING id`,
        [matchId, fromUser.id, toUser.id, tag]
    );

    if (inserted.rows.length === 0) {
        return interaction.reply({ content: t('rate.already_recorded', locale), flags: MessageFlags.Ephemeral });
    }

    // Disable just the row of buttons for this participant, leaving any other
    // participants' rows (in a multi-guest DM to the creator) still clickable.
    const updatedRows = interaction.message.components.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components.forEach(button => {
            if (button.data.custom_id && button.data.custom_id.includes(`_${toDiscordId}_`)) {
                button.setDisabled(true);
            }
        });
        return newRow;
    });

    await interaction.update({ components: updatedRows });
    await interaction.followUp({ content: t('rate.recorded', locale), flags: MessageFlags.Ephemeral });
}

async function handleButtonInteraction(interaction) {
    if (interaction.guild) {
        await ensureServer(interaction.guild);
    }
    await ensureUser(interaction.user);

    if (interaction.customId === 'mpb_create_session') {
        return handleCreateSession(interaction);
    }
    if (interaction.customId === 'mpb_browse_sessions') {
        return handleBrowseSessions(interaction);
    }
    if (interaction.customId === 'mpb_my_profile') {
        return handleMyProfile(interaction);
    }
    if (interaction.customId.startsWith('mpb_join_')) {
        return handleJoinSession(interaction, interaction.customId.replace('mpb_join_', ''));
    }
    if (interaction.customId.startsWith('mpb_complete_')) {
        return handleMarkComplete(interaction, interaction.customId.replace('mpb_complete_', ''));
    }
    if (interaction.customId.startsWith('mpb_rate_')) {
        return handleRateParticipant(interaction);
    }
}

async function handleSelectMenuInteraction(interaction) {
    if (interaction.customId === 'mpb_select_game_for_create') {
        return handleSelectGameForCreate(interaction);
    }
    if (interaction.customId === 'mpb_select_activity_for_create') {
        return handleSelectActivityForCreate(interaction);
    }
}

module.exports = { handleButtonInteraction, handleSelectMenuInteraction };
