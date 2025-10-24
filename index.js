require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ----------------- SQLite / Sequelize -----------------
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/database.sqlite'
});

// ----------------- Modèles -----------------
const BotStatus = sequelize.define('BotStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lastMessageId: { type: DataTypes.STRING },
    channelId: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING }
});

// Sync database
sequelize.sync();

// ----------------- Collections -----------------
client.commands = new Collection();

// ----------------- Charger les commandes -----------------
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach(folder => {
    const folderPath = path.join(commandsPath, folder);
    if(fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] La commande à ${filePath} est invalide`);
            }
        }
    }
});

// ----------------- Charger les events -----------------
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath).forEach(file => {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if(event.once) {
        client.once(event.name, (...args) => event.execute(...args, client, sequelize));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client, sequelize));
    }
});

// ----------------- Interaction -----------------
client.on('interactionCreate', async interaction => {
    if(!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if(!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de l’exécution de la commande', ephemeral: true });
    }
});

// ----------------- Rich Presence dynamique -----------------
const { ActivityType } = require('discord.js');

client.once('ready', async () => {
    console.log(`${client.user.tag} est prêt !`);

    // Vérifie le statut actuel en base
    let statusConfig = await BotStatus.findOne();
    let currentStatus = statusConfig ? statusConfig.status : 'online';

    const activities = {
        online: ['Économie maritime', 'Gestion d’équipage', 'Tracking de bateaux'],
        update: ['Mise à jour en cours...', 'Patientez…'],
        offline: ['Bot arrêté', 'Redémarrage imminent']
    };

    const presenceLoop = async () => {
        const list = activities[currentStatus] || activities['online'];
        for (const act of list) {
            let type = ActivityType.Playing;
            let statusPresence = 'online';

            if(currentStatus === 'update') {
                type = ActivityType.Watching;
                statusPresence = 'idle';
            } else if(currentStatus === 'offline') {
                type = ActivityType.Listening;
                statusPresence = 'dnd';
            }

            await client.user.setPresence({
                activities: [{ name: act, type }],
                status: statusPresence
            });

            await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec
        }
    };

    const loop = async () => {
        while(true) await presenceLoop();
    };

    loop();
});

// ----------------- Login -----------------
client.login(process.env.TOKEN);
