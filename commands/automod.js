const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const AUTO_PATH = path.join(__dirname, '..', 'data', 'automod.json');
if (!fs.existsSync(AUTO_PATH)) fs.writeFileSync(AUTO_PATH, '{}');

let automodData = JSON.parse(fs.readFileSync(AUTO_PATH, 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configurer l’AutoMod du serveur')
        .addSubcommand(sub => sub.setName('setspam')
            .setDescription('Configurer l’anti-spam')
            .addIntegerOption(opt => opt.setName('limit').setDescription('Messages max').setRequired(false))
            .addIntegerOption(opt => opt.setName('interval').setDescription('Intervalle en ms').setRequired(false)))
        .addSubcommand(sub => sub.setName('setwarnings')
            .setDescription('Nombre max d’avertissements avant kick')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Nombre max').setRequired(true)))
        .addSubcommand(sub => sub.setName('addword')
            .setDescription('Ajouter un mot interdit')
            .addStringOption(opt => opt.setName('word').setDescription('Mot à ajouter').setRequired(true)))
        .addSubcommand(sub => sub.setName('removeword')
            .setDescription('Retirer un mot interdit')
            .addStringOption(opt => opt.setName('word').setDescription('Mot à retirer').setRequired(true))),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) 
            return interaction.reply('❌ Tu n\'as pas la permission !');

        const guildId = interaction.guild.id;
        if (!automodData[guildId]) automodData[guildId] = { config: {}, users: {} };

        const config = automodData[guildId].config;
        const sub = interaction.options.getSubcommand();

        if (sub === 'setspam') {
            const limit = interaction.options.getInteger('limit');
            const interval = interaction.options.getInteger('interval');
            if (limit) config.spamLimit = limit;
            if (interval) config.timeLimit = interval;
            fs.writeFileSync(AUTO_PATH, JSON.stringify(automodData, null, 2));
            return interaction.reply(`✅ Configuration anti-spam mise à jour : limit=${config.spamLimit || 'default'}, interval=${config.timeLimit || 'default'}ms`);
        }

        if (sub === 'setwarnings') {
            const amount = interaction.options.getInteger('amount');
            config.maxWarnings = amount;
            fs.writeFileSync(AUTO_PATH, JSON.stringify(automodData, null, 2));
            return interaction.reply(`✅ Max warnings avant kick défini à ${amount}`);
        }

        if (sub === 'addword') {
            const word = interaction.options.getString('word').toLowerCase();
            if (!config.bannedWords) config.bannedWords = [];
            if (!config.bannedWords.includes(word)) config.bannedWords.push(word);
            fs.writeFileSync(AUTO_PATH, JSON.stringify(automodData, null, 2));
            return interaction.reply(`✅ Mot interdit ajouté : ${word}`);
        }

        if (sub === 'removeword') {
            const word = interaction.options.getString('word').toLowerCase();
            if (!config.bannedWords) config.bannedWords = [];
            config.bannedWords = config.bannedWords.filter(w => w !== word);
            fs.writeFileSync(AUTO_PATH, JSON.stringify(automodData, null, 2));
            return interaction.reply(`✅ Mot interdit retiré : ${word}`);
        }
    }
};
