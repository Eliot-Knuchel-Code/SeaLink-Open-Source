const { SlashCommandBuilder } = require('discord.js');
const { Logbook } = require('../../database/migrations');
const paginate = require('../../utils/paginator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logbook-list')
        .setDescription('Affiche ton journal de bord'),
    async execute(interaction) {
        const entries = await Logbook.findAll({ where: { userId: interaction.user.id } });
        if(!entries.length) return interaction.reply({ content: 'Ton journal est vide', ephemeral: true });
        const pages = entries.map(e => `**ID:** ${e.id} | ${e.content}`);
        await paginate(interaction, pages);
    }
};
