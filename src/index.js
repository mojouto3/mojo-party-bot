require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/loadCommands');
const { registerInteractionHandler } = require('./handlers/interactionHandler');
const { cleanupExpiredSessions } = require('./jobs/cleanupExpiredSessions');
const { notifyNewActivities } = require('./jobs/notifyNewActivities');

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // check once an hour

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

client.once('clientReady', () => {
    console.log(`Mojo Party Bot connected as ${client.user.tag}`);

    const runBackgroundJobs = () => {
        cleanupExpiredSessions(client).catch(err => console.error('Cleanup job error:', err));
        notifyNewActivities(client).catch(err => console.error('New activity notification job error:', err));
    };

    runBackgroundJobs();
    setInterval(runBackgroundJobs, CLEANUP_INTERVAL_MS);
});

loadCommands(client);
registerInteractionHandler(client);

client.login(process.env.DISCORD_TOKEN);
