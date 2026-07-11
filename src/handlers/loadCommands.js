const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

function loadCommands(client) {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`Command file ${file} is missing "data" or "execute" - skipping.`);
        }
    }

    console.log(`Loaded ${client.commands.size} commands.`);
}

module.exports = { loadCommands };
