const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { hexToInt, formatFieldData } = require('./formatters');
const { t } = require('../i18n');

/**
 * @param {object} params
 * @param {object} params.sessionRequest - row from session_requests
 * @param {object} params.activity - row from activities
 * @param {object} params.creatorDiscordUser - discord.js User object
 * @param {object} params.reputation - { score, total_sessions }
 * @param {string} params.locale - creator's Discord locale, used for the post header text
 * @param {string} params.state - 'open' | 'full' | 'completed'
 */
function buildSessionPostContainer({ sessionRequest, activity, creatorDiscordUser, reputation, locale, state = 'open' }) {
    const container = new ContainerBuilder().setAccentColor(hexToInt(activity.accent_color));

    const rep = reputation || { score: 0, total_sessions: 0 };

    const headerText =
        `## ${t('post.looking_for_group', locale, { username: creatorDiscordUser.username })}\n` +
        `${activity.display_name}\n` +
        `⭐ ${Number(rep.score).toFixed(1)} · ${rep.total_sessions} sessions`;

    if (activity.icon) {
        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(activity.icon)
            );
        container.addSectionComponents(section);
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText));
    }

    const tagsText = formatFieldData(activity.field_schema, sessionRequest.filters || {});
    if (tagsText) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(tagsText));
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const joinButton = new ButtonBuilder()
        .setCustomId(`mpb_join_${sessionRequest.id}`)
        .setLabel(
            state === 'full' ? t('post.button_full', locale) :
            state === 'completed' ? t('post.button_closed', locale) :
            t('post.button_join', locale)
        )
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state !== 'open');

    const completeButton = new ButtonBuilder()
        .setCustomId(`mpb_complete_${sessionRequest.id}`)
        .setLabel(
            state === 'completed' ? t('post.button_completed', locale) : t('post.button_mark_done', locale)
        )
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state === 'completed');

    container.addActionRowComponents(new ActionRowBuilder().addComponents(joinButton, completeButton));

    return container;
}

module.exports = { buildSessionPostContainer };
