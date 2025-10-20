const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // npm install node-fetch@2

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Affiche les alertes météo maritimes pour un port ou coordonnées')
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

        const OPENWEATHER_API = process.env.OPENWEATHER_API;
        if (!OPENWEATHER_API) return interaction.editReply({ content: '❌ Clé API OpenWeather non définie.', ephemeral: true });

        let lat, lon, portName;
        const portOpt = interaction.options.getString('port');
        const latOpt = interaction.options.getNumber('lat');
        const lonOpt = interaction.options.getNumber('lon');

        if (latOpt && lonOpt) {
            lat = latOpt;
            lon = lonOpt;
            portName = null;
        } else if (portOpt) {
            portName = portOpt;
            try {
                const portsPath = path.join(__dirname, '..', 'data', 'ports.json');
                const portsRaw = fs.readFileSync(portsPath, 'utf8');
                const portsData = JSON.parse(portsRaw);

                const match = Object.keys(portsData).find(k => k.toLowerCase().includes(portOpt.toLowerCase()));
                if (match) {
                    lat = Number(portsData[match].latitude);
                    lon = Number(portsData[match].longitude);
                } else {
                    return interaction.editReply({ content: `❌ Port introuvable : "${portOpt}"`, ephemeral: true });
                }
            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: '❌ Impossible de lire ports.json', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '❌ Fournis soit un port, soit des coordonnées.', ephemeral: true });
        }

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API}&units=metric`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.cod !== 200) return interaction.editReply({ content: `❌ Erreur API : ${data.message}`, ephemeral: true });

            // Détection des alertes météo
            const alertTypes = [];
            data.weather.forEach(w => {
                const desc = w.description.toLowerCase();
                if (desc.includes('storm') || desc.includes('tempête')) alertTypes.push('🌩 Tempête / Orage');
                else if (desc.includes('rain') || desc.includes('pluie')) alertTypes.push('🌧 Pluie forte');
                else if (desc.includes('snow') || desc.includes('neige')) alertTypes.push('❄ Neige');
                else if (desc.includes('fog') || desc.includes('brouillard')) alertTypes.push('🌫 Brouillard');
                else if (desc.includes('wind') || desc.includes('vent')) alertTypes.push('💨 Vent fort');
            });

            // Si aucune alerte, mettre normal
            if (alertTypes.length === 0) alertTypes.push('✅ Conditions normales');

            const embed = new EmbedBuilder()
                .setTitle(`🚨 Alertes météo pour ${portName ?? `coordonnées (${lat}, ${lon})`}`)
                .setColor('#FF4500')
                .addFields(
                    { name: '🌡 Température', value: `${data.main.temp} °C`, inline: true },
                    { name: '💨 Vent', value: `${data.wind.speed} m/s, direction ${data.wind.deg}°`, inline: true },
                    { name: '🌊 Conditions', value: data.weather.map(w => w.description).join(', '), inline: false },
                    { name: '⚠️ Alertes', value: alertTypes.join('\n'), inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Données fournies par OpenWeatherMap et SeaBot' });

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return interaction.editReply({ content: '❌ Impossible de récupérer les données météo.', ephemeral: true });
        }
    }
};
