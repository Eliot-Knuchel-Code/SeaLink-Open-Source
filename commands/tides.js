const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tide')
        .setDescription('Affiche la prochaine marée pour un port')
        .addStringOption(option =>
            option.setName('port')
                .setDescription('Nom du port')
                .setRequired(true)),
    async execute(interaction) {
        const port = interaction.options.getString('port');
        const tidesPath = path.join(__dirname, '..', 'data', 'tides.json');

        let tidesData;
        try {
            tidesData = JSON.parse(fs.readFileSync(tidesPath, 'utf8'));
        } catch (err) {
            console.error('Erreur lecture du fichier tides.json', err);
            return interaction.reply({ content: 'Impossible de lire les données des marées.', ephemeral: true });
        }

        if (!tidesData[port]) {
            return interaction.reply({ content: `Aucune donnée de marée trouvée pour le port : ${port}`, ephemeral: true });
        }

        // Heure actuelle en heures et minutes
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // Convertir les horaires des marées en minutes pour comparaison
        const upcomingTides = tidesData[port]
            .map(t => {
                const [hours, minutes] = t.time.split(':').map(Number);
                const tMinutes = hours * 60 + minutes;
                return { ...t, totalMinutes: tMinutes };
            })
            .sort((a, b) => a.totalMinutes - b.totalMinutes);

        // Trouver la prochaine marée
        let nextTide = upcomingTides.find(t => t.totalMinutes > nowMinutes);
        if (!nextTide) nextTide = upcomingTides[0]; // Si toutes passées, prendre la première du lendemain

        const embed = new EmbedBuilder()
            .setTitle(`🌊 Prochaine marée à ${port}`)
            .setDescription(`${nextTide.time} - ${nextTide.type} (${nextTide.height} m)`)
            .addFields(
                { name: 'Marées restantes aujourd\'hui', value: upcomingTides.filter(t => t.totalMinutes > nowMinutes).map(t => `${t.time} - ${t.type} (${t.height} m)`).join('\n') || 'Aucune marée restante aujourd\'hui', inline: false }
            )
            .setColor('#1E90FF')
            .setFooter({ text: 'Données statiques maritimes' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
