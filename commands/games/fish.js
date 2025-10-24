const { SlashCommandBuilder } = require('discord.js');
const { User } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Va pêcher et gagne des crédits !'),
    async execute(interaction) {
        let user = await User.findByPk(interaction.user.id);
        if(!user) user = await User.create({ id: interaction.user.id });

        const fishSizes = ['Petit poisson', 'Poisson moyen', 'Gros poisson', 'Poisson légendaire'];
        const rewards = [50, 100, 200, 500];
        const index = Math.floor(Math.random() * fishSizes.length);

        const reward = rewards[index];
        user.balance += reward;
        await user.save();

        interaction.reply(`🎣 Tu as pêché un **${fishSizes[index]}** et gagné **${reward} crédits** !`);
    }
};
