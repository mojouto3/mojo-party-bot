const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
} = require('discord.js');
const db = require('../database/db');
const { ensureUser } = require('../database/helpers');
const { getUserReputation } = require('./reputation');
const { t } = require('../i18n');

async function buildProfileContainer(discordUser, locale) {
    const user = await ensureUser(discordUser);

    const activitiesResult = await db.query(
        `SELECT a.display_name, a.accent_color, uap.field_data
         FROM user_activity_profiles uap
         JOIN activities a ON a.id = uap.activity_id
         WHERE uap.user_id = $1`,
        [user.id]
    );

    const rep = await getUserReputation(user.id);

    const container = new ContainerBuilder().setAccentColor(0x7F77DD);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ${discordUser.globalName || discordUser.username}\n` +
            t('profile.header', locale, { score: Number(rep.score).toFixed(1), sessions: rep.total_sessions })
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (activitiesResult.rows.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(t('profile.no_activities', locale))
        );
    } else {
        const lines = activitiesResult.rows
            .map(row => `**${row.display_name}** — ${JSON.stringify(row.field_data)}`)
            .join('\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
    }

    return container;
}

module.exports = { buildProfileContainer };
