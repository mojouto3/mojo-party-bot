const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../database/db');
const { ensureServer } = require('../database/helpers');
const { setChannelForServer, activateActivityForServer } = require('../utils/serverSetup');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up Mojo Party Bot for this server (owners/admins only)')
        .setDescriptionLocalizations({
            el: 'Ρύθμιση του Mojo Party Bot για αυτό το server (μόνο για owners/admins)',
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
            option.setName('activity')
                .setDescription('Which activity to activate first (start typing to search)')
                .setDescriptionLocalizations({
                    el: 'Ποιο activity να ενεργοποιηθεί πρώτο (γράψε για αναζήτηση)',
                })
                .setRequired(true)
                .setAutocomplete(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();

        const result = await db.query(
            `SELECT slug, display_name FROM activities
             WHERE is_active = true AND LOWER(display_name) LIKE $1
             ORDER BY display_name
             LIMIT 25`,
            [`%${focused}%`]
        );

        await interaction.respond(
            result.rows.map(row => ({ name: row.display_name, value: row.slug }))
        );
    },

    async execute(interaction) {
        const locale = interaction.locale;
        const channel = interaction.options.getChannel('channel');
        const activitySlug = interaction.options.getString('activity');

        const server = await ensureServer(interaction.guild);
        const isForum = await setChannelForServer(channel, server);

        const activityResult = await db.query(
            `SELECT * FROM activities WHERE slug = $1`,
            [activitySlug]
        );

        if (activityResult.rows.length === 0) {
            return interaction.reply({
                content: t('setup.activity_not_found', locale, { slug: activitySlug }),
                flags: MessageFlags.Ephemeral,
            });
        }

        const activity = activityResult.rows[0];
        await activateActivityForServer(channel, server, activity, isForum);

        await interaction.reply({
            content: t('setup.success', locale, { channel: `${channel}`, activity: activity.display_name }),
            flags: MessageFlags.Ephemeral,
        });
    },
};
