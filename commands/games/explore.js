const { SlashCommandBuilder } = require('discord.js');
const { User } = require('../../database/migrations');

const ports = ['Port de Rotterdam', 'Port de Singapour', 'Port de Barcelone', 'Port de Sydney', 'Port de Tokyo'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('explore')
        .setDescription('Explore la mer et découvre des ports ou ressources'),
    async execute(interaction) {
        let user = await User.findByPk(interaction.user.id);
        if(!user) user = await User.create({ id: interaction.user.id });

        const chance = Math.random();
        if(chance < 0.6) { // 60% chance de gagner des crédits
            const reward = Math.floor(Math.random() * 300) + 50;
            user.balance += reward;
            await user.save();
            interaction.reply(`🗺️ Tu as découvert des ressources et gagné **${reward} crédits** !`);
        } else { // 40% chance de découvrir un port
            const port = ports[Math.floor(Math.random() * ports.length)];
            interaction.reply(`🛳️ Tu as exploré et trouvé le port **${port}** !`);
        }
    }
};
