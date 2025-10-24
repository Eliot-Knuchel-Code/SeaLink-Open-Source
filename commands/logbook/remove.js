const { SlashCommandBuilder } = require('discord.js');
const { Logbook } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logbook-remove')
        .setDescription('Supprime une phrase de ton journal de bord')
        .addIntegerOption(option => option.setName('id').setDescription('ID de la phrase').setRequired(true)),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        const entry = await Logbook.findOne({ where: { id, userId: interaction.user.id } });
        if(!entry) return interaction.reply({ content: '❌ Phrase introuvable', ephemeral: true });
        await entry.destroy();
        interaction.reply({ content: '✅ Phrase supprimée', ephemeral: true });
    }
};
