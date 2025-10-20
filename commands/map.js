const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Affiche une carte pour un port ou des coordonnées maritimes')
        .addStringOption(option =>
            option.setName('port')
                .setDescription('Nom du port (recherche dans ports.json)')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('lat')
                .setDescription('Latitude (ex: 48.6900)')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('lon')
                .setDescription('Longitude (ex: -4.4800)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const fs = require('fs');
        const path = require('path');

        let lat, lon;

        const portName = interaction.options.getString('port');
        const latOpt = interaction.options.getNumber('lat');
        const lonOpt = interaction.options.getNumber('lon');

        if (latOpt && lonOpt) {
            lat = latOpt;
            lon = lonOpt;
        } else if (portName) {
            try {
                const portsPath = path.join(__dirname, '..', 'data', 'ports.json');
                const portsRaw = fs.readFileSync(portsPath, 'utf8');
                const portsData = JSON.parse(portsRaw);

                const match = Object.keys(portsData).find(k => k.toLowerCase().includes(portName.toLowerCase()));
                if (match) {
                    lat = Number(portsData[match].latitude);
                    lon = Number(portsData[match].longitude);
                } else {
                    return interaction.editReply({ content: `❌ Port introuvable : "${portName}"`, ephemeral: true });
                }
            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '❌ Impossible de lire ports.json', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '❌ Fournis soit un port, soit des coordonnées.', ephemeral: true });
        }

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

        const embed = new EmbedBuilder()
            .setTitle(`🗺 Carte pour ${portName ?? `coordonnées (${lat}, ${lon})`}`)
            .setColor('#00BFFF')
            .addFields({ name: 'Position', value: `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`, inline: false })
            .addFields({ name: 'Lien Google Maps', value: `[Ouvrir la carte](${mapsUrl})`, inline: false })
            .setTimestamp()
            .setFooter({ text: 'Carte générée par SeaBot' });

        return interaction.editReply({ embeds: [embed] });
    }
};
