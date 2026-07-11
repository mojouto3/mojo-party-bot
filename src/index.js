require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/loadCommands');
const { registerInteractionHandler } = require('./handlers/interactionHandler');
const { cleanupExpiredSessions } = require('./jobs/cleanupExpiredSessions');

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // check once an hour

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

client.once('clientReady', () => {
    console.log(`Mojo Party Bot connected as ${client.user.tag}`);

    cleanupExpiredSessions(client).catch(err => console.error('Cleanup job error:', err));
    setInterval(() => {
        cleanupExpiredSessions(client).catch(err => console.error('Cleanup job error:', err));
    }, CLEANUP_INTERVAL_MS);
});

loadCommands(client);
registerInteractionHandler(client);

client.login(process.env.DISCORD_TOKEN);
