const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post-hub')
        .setDescription('Posts the permanent hub message with buttons in this channel (owner-only)')
        .setDescriptionLocalizations({
            el: 'Ποστάρει το μόνιμο μήνυμα με τα κουμπιά σε αυτό το κανάλι (owner-only)',
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const locale = interaction.locale;
        const container = new ContainerBuilder().setAccentColor(0x1D9E75);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${t('hub.title', locale)}\n${t('hub.description', locale)}`
            )
        );

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mpb_create_session')
                .setLabel(t('hub.button_create', locale))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('mpb_browse_sessions')
                .setLabel(t('hub.button_browse', locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mpb_my_profile')
                .setLabel(t('hub.button_profile', locale))
                .setStyle(ButtonStyle.Secondary)
        );

        container.addActionRowComponents(buttons);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        const sentMessage = await interaction.fetchReply();
        await sentMessage.pin().catch(() => {});
    },
};
