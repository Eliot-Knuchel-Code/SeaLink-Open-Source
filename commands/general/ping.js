const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifie la latence du bot avec un style maritime'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: '⚓ Calcul de la vitesse du navire...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setTitle('🌊 Ping Maritime')
            .setDescription(`Le navire a parcouru le canal en \`${latency}ms\``)
            .addFields(
                { name: 'API Latency', value: `\`${Math.round(interaction.client.ws.ping)}ms\``, inline: true },
                { name: 'Statut du navire', value: latency < 100 ? '🚤 Rapide comme un yacht' : latency < 200 ? '⛴️ Bonne vitesse' : '🛳️ Lent comme un cargo', inline: true }
            )
            .setColor('Aqua')
            .setTimestamp();

        interaction.editReply({ content: null, embeds: [embed] });
    }
};
