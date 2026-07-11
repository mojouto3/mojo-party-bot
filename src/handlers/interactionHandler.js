const { MessageFlags } = require('discord.js');
const { handleButtonInteraction, handleSelectMenuInteraction } = require('./componentHandler');
const { handleModalSubmit } = require('./modalHandler');
const { t } = require('../i18n');

function registerInteractionHandler(client) {
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isAutocomplete()) {
                const command = client.commands.get(interaction.commandName);
                if (command && typeof command.autocomplete === 'function') {
                    return await command.autocomplete(interaction);
                }
                return;
            }

            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    console.warn(`Unknown command: ${interaction.commandName}`);
                    return;
                }
                return await command.execute(interaction);
            }

            if (interaction.isButton()) {
                return await handleButtonInteraction(interaction);
            }

            if (interaction.isStringSelectMenu()) {
                return await handleSelectMenuInteraction(interaction);
            }

            if (interaction.isModalSubmit()) {
                return await handleModalSubmit(interaction);
            }
        } catch (error) {
            console.error('Error while handling interaction:', error);

            if (interaction.isAutocomplete()) {
                // Autocomplete interactions can't use reply()/followUp() - just log and move on
                return;
            }

            const errorMessage = {
                content: t('common.generic_error', interaction.locale),
                flags: MessageFlags.Ephemeral,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage).catch(() => {});
            } else {
                await interaction.reply(errorMessage).catch(() => {});
            }
        }
    });
}

module.exports = { registerInteractionHandler };
