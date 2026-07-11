const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildProfileContainer } = require('../utils/renderProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your Mojo Party Bot profile')
        .setDescriptionLocalizations({
            el: 'Δες το προφίλ σου στο Mojo Party Bot',
        }),

    async execute(interaction) {
        const container = await buildProfileContainer(interaction.user, interaction.locale);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
    },
};
