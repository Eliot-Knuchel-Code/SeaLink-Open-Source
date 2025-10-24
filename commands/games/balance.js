const { SlashCommandBuilder } = require('discord.js');
const { User } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Affiche ton compte en banque maritime'),
    async execute(interaction) {
        let user = await User.findByPk(interaction.user.id);
        if(!user) user = await User.create({ id: interaction.user.id });
        interaction.reply(`💰 ${interaction.user.tag}, tu as ${user.balance} crédits.`);
    }
};
