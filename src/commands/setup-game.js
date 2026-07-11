const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../database/db');
const { ensureServer } = require('../database/helpers');
const { setChannelForServer, activateActivityForServer } = require('../utils/serverSetup');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-game')
        .setDescription('Activate every activity belonging to a game at once (owners/admins only)')
        .setDescriptionLocalizations({
            el: 'Ενεργοποιεί όλα τα activities ενός παιχνιδιού μονομιάς (μόνο για owners/admins)',
        })
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The forum or text channel where session requests will be posted')
                .setDescriptionLocalizations({
                    el: 'Το forum ή text channel όπου θα ποστάρονται οι αναζητήσεις',
                })
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
        )
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Which game to activate (start typing to search)')
                .setDescriptionLocalizations({
                    el: 'Ποιο παιχνίδι να ενεργοποιηθεί (γράψε για αναζήτηση)',
                })
                .setRequired(true)
                .setAutocomplete(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();

        const result = await db.query(
            `SELECT DISTINCT COALESCE(game_group, display_name) AS game
             FROM activities
             WHERE is_active = true
             ORDER BY game`
        );

        const filtered = result.rows
            .map(row => row.game)
            .filter(game => game.toLowerCase().includes(focused))
            .slice(0, 25);

        await interaction.respond(filtered.map(game => ({ name: game, value: game })));
    },

    async execute(interaction) {
        const locale = interaction.locale;
        const channel = interaction.options.getChannel('channel');
        const gameGroup = interaction.options.getString('game');

        const activitiesResult = await db.query(
            `SELECT * FROM activities WHERE COALESCE(game_group, display_name) = $1 AND is_active = true`,
            [gameGroup]
        );

        if (activitiesResult.rows.length === 0) {
            return interaction.reply({
                content: t('setup_game.game_not_found', locale, { game: gameGroup }),
                flags: MessageFlags.Ephemeral,
            });
        }

        const server = await ensureServer(interaction.guild);
        const isForum = await setChannelForServer(channel, server);

        for (const activity of activitiesResult.rows) {
            await activateActivityForServer(channel, server, activity, isForum);
        }

        const activityNames = activitiesResult.rows.map(a => a.display_name).join('\n- ');

        await interaction.reply({
            content: t('setup_game.success', locale, {
                channel: `${channel}`,
                game: gameGroup,
                count: activitiesResult.rows.length,
                list: `- ${activityNames}`,
            }),
            flags: MessageFlags.Ephemeral,
        });
    },
};
