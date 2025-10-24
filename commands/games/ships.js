const { SlashCommandBuilder } = require('discord.js');
const { Ship } = require('../../database/migrations');
const paginate = require('../../utils/paginator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ships')
        .setDescription('Liste tous les bateaux disponibles'),
    async execute(interaction) {
        const allShips = await Ship.findAll();
        if(!allShips.length) return interaction.reply('Aucun bateau n\'est disponible.');
        const pages = allShips.map(ship => `**${ship.id}** - ${ship.name} | Prix: ${ship.price} | Propriétaire: ${ship.ownerId ? `<@${ship.ownerId}>` : 'Disponible'}`);
        await paginate(interaction, pages);
    }
};
