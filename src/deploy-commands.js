require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        const guildId = process.env.DISCORD_DEV_GUILD_ID;

        if (guildId) {
            // Guild-specific commands: update instantly, ideal for development
            console.log(`Registering ${commands.length} slash commands to guild ${guildId} (instant, dev mode)...`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
                { body: commands }
            );
        } else {
            // Global commands: can take up to 1 hour to propagate the first time
            console.log(`Registering ${commands.length} slash commands globally (may take up to 1 hour)...`);
            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commands }
            );
        }

        console.log('Commands registered successfully.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();
