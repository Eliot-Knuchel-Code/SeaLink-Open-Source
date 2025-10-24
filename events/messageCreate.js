const { AutoModConfig } = require('../database/migrations');
const logger = require('../utils/logger');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if(message.author.bot) return;

        const config = await AutoModConfig.findByPk(message.guild.id);
        if(!config) return;

        const contentLower = message.content.toLowerCase();
        const bannedWords = config.bannedWords ? config.bannedWords.split(',') : [];

        // ----------------- MOTS INTERDITS -----------------
        for(const word of bannedWords) {
            if(contentLower.includes(word.trim())) {
                await handleAction(message, config);
                return;
            }
        }

        // ----------------- LIENS -----------------
        if(config.bannedLinks) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            if(urlRegex.test(message.content)) {
                await handleAction(message, config);
                return;
            }
        }
    }
};

async function handleAction(message, config) {
    const action = config.action || 'mute';

    switch(action) {
        case 'mute':
            if(message.member.moderatable) {
                await message.member.timeout(config.muteDuration * 60000, 'Automod');
                message.channel.send(`${message.author} a été mute pour ${config.muteDuration} min`);
                logger.log(`Automod: ${message.author.tag} mute ${config.muteDuration} min`);
            }
            break;
        case 'kick':
            if(message.member.kickable) {
                await message.member.kick('Automod');
                message.channel.send(`${message.author} a été kick`);
                logger.log(`Automod: ${message.author.tag} kick`);
            }
            break;
        case 'ban':
            if(message.member.bannable) {
                await message.member.ban({ reason: 'Automod' });
                message.channel.send(`${message.author} a été banni`);
                logger.log(`Automod: ${message.author.tag} ban`);
            }
            break;
    }

    // Supprimer le message fautif
    await message.delete().catch(() => {});
}
