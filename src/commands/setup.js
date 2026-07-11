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
                .setDescription('Which activity to activate first')
                .setDescriptionLocalizations({
                    el: 'Ποιο activity να ενεργοποιηθεί πρώτο',
                })
                .setRequired(true)
                .addChoices(
                    { name: 'EuroTruck Simulator 2 - Convoy', value: 'ets2_convoy' },
                    { name: 'EuroTruck Simulator 2 - VTC.World', value: 'ets2_vtc_world' },
                    { name: 'Star Citizen - Mining', value: 'sc_mining' },
                    { name: 'Star Citizen - Salvage', value: 'sc_salvage' },
                    { name: 'Star Citizen - PvP', value: 'sc_pvp' },
                    { name: 'Star Citizen - Exploration', value: 'sc_exploration' },
                    { name: 'Star Citizen - Bounty Hunting', value: 'sc_bounty_pve' },
                    { name: 'Star Citizen - Bunker Mission', value: 'sc_bunker' },
                    { name: 'Black Desert - PvP / Node War', value: 'bdo_pvp' },
                    { name: 'Black Desert - Farm / Grind', value: 'bdo_farm' },
                    { name: 'Black Desert - Guild Recruitment', value: 'bdo_guild' },
                    { name: 'Valorant - Competitive', value: 'valorant_competitive' },
                    { name: 'Apex Legends - Squad', value: 'apex_squad' },
                    { name: 'Counter-Strike 2 - Competitive', value: 'cs2_competitive' },
                    { name: 'League of Legends - Ranked', value: 'lol_ranked' },
                    { name: 'World of Warcraft - Group Content', value: 'wow_group' },
                    { name: 'D&D 5th Edition', value: 'dnd_5e' },
                    { name: 'Call of Duty - Multiplayer', value: 'cod_multiplayer' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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
