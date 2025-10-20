const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const WebSocket = require('ws');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vessel')
        .setDescription('Suivi d’un navire réel en temps réel')
        .addStringOption(option =>
            option.setName('imo')
                .setDescription('Numéro IMO ou nom du navire')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('imo');

        await interaction.reply({ content: '🚢 Recherche du navire...', ephemeral: true });

        const ws = new WebSocket(`wss://api.aisstream.io/vessels?token=${process.env.AISSTREAM_KEY}`);

        ws.on('open', () => {
            console.log('Connecté à AISStream');
        });

        ws.on('message', async (data) => {
            const vessels = JSON.parse(data);

            const vessel = vessels.find(v => v.imo === query || v.name.toLowerCase().includes(query.toLowerCase()));

            if (!vessel) {
                interaction.editReply({ content: 'Navire introuvable.', ephemeral: true });
                ws.close();
                return;
            }

            // Récupération météo
            let weatherText = 'Météo non disponible';
            try {
                const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${vessel.lat}&lon=${vessel.lon}&units=metric&lang=fr&appid=${process.env.OPENWEATHER_KEY}`);
                const weather = weatherRes.data;
                weatherText = `${weather.weather[0].description}\n🌡 Temp: ${weather.main.temp}°C\n💨 Vent: ${weather.wind.speed} m/s\n💧 Humidité: ${weather.main.humidity}%`;
            } catch(err) {
                console.warn('Impossible de récupérer la météo', err);
            }

            const embed = new EmbedBuilder()
                .setTitle(`🚢 ${vessel.name}`)
                .setURL(`https://www.google.com/maps/search/?api=1&query=${vessel.lat},${vessel.lon}`)
                .addFields(
                    { name: 'Type', value: vessel.type || 'Inconnu', inline: true },
                    { name: 'Cap', value: `${vessel.heading || 'Inconnu'}°`, inline: true },
                    { name: 'Vitesse', value: `${vessel.speed || 'Inconnu'} kn`, inline: true },
                    { name: 'Position GPS', value: `[${vessel.lat}, ${vessel.lon}](https://www.google.com/maps/search/?api=1&query=${vessel.lat},${vessel.lon})`, inline: false },
                    { name: 'Port de départ', value: vessel.origin || 'Inconnu', inline: true },
                    { name: 'Port de destination', value: vessel.destination || 'Inconnu', inline: true },
                    { name: 'Météo locale', value: weatherText, inline: false }
                )
                .setColor('#1E90FF')
                .setFooter({ text: 'Données AIS fournies par AISStream.io' })
                .setTimestamp();

            interaction.editReply({ content: null, embeds: [embed] });
            ws.close();
        });

        ws.on('error', (err) => {
            console.error(err);
            interaction.editReply({ content: 'Erreur lors de la connexion à AISStream.', ephemeral: true });
        });
    }
};
