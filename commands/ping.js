const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Teste la latence du bot avec style maritime 🌊'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: '⛵ Calcul de la latence...', fetchReply: true });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        let status = 'Normal ⚓';
        if (latency < 100) status = 'Rapide 🐬';
        else if (latency > 300) status = 'Lent 🐢';

        const embed = new EmbedBuilder()
            .setTitle('🏴‍☠️ Ping du bot')
            .addFields(
                { name: 'Latence du bot', value: `${latency} ms`, inline: true },
                { name: 'Latence API Discord', value: `${apiLatency} ms`, inline: true },
                { name: 'État du réseau', value: status, inline: true }
            )
            .setColor('#1E90FF')
            .setFooter({ text: 'Test maritime complet 🌊' })
            .setTimestamp();

        return interaction.editReply({ content: null, embeds: [embed] });
    }
};
