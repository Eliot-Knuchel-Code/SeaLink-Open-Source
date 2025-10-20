const fs = require('fs');
const path = require('path');
const AUTO_PATH = path.join(__dirname, '..', 'data', 'automod.json');

if (!fs.existsSync(AUTO_PATH)) fs.writeFileSync(AUTO_PATH, '{}');
let automodData = JSON.parse(fs.readFileSync(AUTO_PATH, 'utf8'));

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const guildId = message.guild.id;
        const userId = message.author.id;

        if (!automodData[guildId]) automodData[guildId] = { config: {}, users: {} };
        const guildData = automodData[guildId];
        const config = guildData.config;
        if (!guildData.users[userId]) guildData.users[userId] = { messages: [], warnings: 0 };
        const userData = guildData.users[userId];

        // ---------------- Anti-Spam ----------------
        const now = Date.now();
        userData.messages.push(now);

        // Filtrer les messages hors intervalle
        const interval = config.timeLimit || 10000;
        userData.messages = userData.messages.filter(ts => now - ts <= interval);

        const limit = config.spamLimit || 5;
        if (userData.messages.length > limit) {
            userData.warnings += 1;
            message.reply(`⚠️ Attention ${message.author}, spam détecté ! Avertissement ${userData.warnings}`);
            userData.messages = []; // Reset compteur
        }

        // ---------------- Mots interdits ----------------
        if (config.bannedWords) {
            const msgLower = message.content.toLowerCase();
            const foundWord = config.bannedWords.find(word => msgLower.includes(word));
            if (foundWord) {
                userData.warnings += 1;
                await message.delete();
                message.channel.send(`❌ ${message.author}, tu as utilisé un mot interdit : ${foundWord}. Avertissement ${userData.warnings}`);
            }
        }

        // ---------------- Kick si trop de warnings ----------------
        const maxWarnings = config.maxWarnings || 3;
        if (userData.warnings >= maxWarnings) {
            const member = message.guild.members.cache.get(userId);
            if (member.kickable) {
                await member.kick(`AutoMod: trop d'avertissements (${userData.warnings})`);
                message.channel.send(`🚨 ${message.author} a été expulsé pour trop d'avertissements !`);
                delete guildData.users[userId]; // reset warnings
            }
        }

        // ---------------- Save ----------------
        fs.writeFileSync(AUTO_PATH, JSON.stringify(automodData, null, 2));
    }
};
