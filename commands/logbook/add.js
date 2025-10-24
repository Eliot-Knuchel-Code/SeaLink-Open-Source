const { SlashCommandBuilder } = require('discord.js');
const { Logbook } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logbook-add')
        .setDescription('Ajoute une phrase dans ton journal de bord')
        .addStringOption(option => option.setName('content').setDescription('Texte à ajouter').setRequired(true)),
    async execute(interaction) {
        const content = interaction.options.getString('content');
        await Logbook.create({ userId: interaction.user.id, content });
        await interaction.reply({ content: '✅ Phrase ajoutée à ton journal de bord !', ephemeral: true });
    }
};
