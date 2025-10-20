const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const ports = require('../data/ports.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('port')
        .setDescription('Affiche les informations détaillées d’un port.')
        .addStringOption(option =>
            option.setName('nom')
                .setDescription('Nom du port à rechercher')
                .setRequired(true)
                .setAutocomplete(true)),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = ports
            .filter(p => p.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(p => ({ name: `${p.name} (${p.country})`, value: p.name }));

        await interaction.respond(choices);
    },
    async execute(interaction) {
        const portName = interaction.options.getString('nom').toLowerCase();
        const port = ports.find(p => p.name.toLowerCase() === portName);

        if (!port) {
            return interaction.reply({ content: 'Port introuvable.', ephemeral: true });
        }

        try {
            // Remplace TON_API_KEY par ta clé OpenWeatherMap
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${port.lat}&lon=${port.lon}&units=metric&lang=fr&appid=TON_API_KEY`;
            const response = await axios.get(weatherUrl);
            const weather = response.data;

            const iconUrl = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${port.lat},${port.lon}`;

            const embed = new EmbedBuilder()
                .setTitle(`📍 ${port.name} (${port.country})`)
                .setURL(mapsUrl)
                .setThumbnail(iconUrl)
                .addFields(
                    { name: 'Coordonnées GPS', value: `[${port.lat}, ${port.lon}](${mapsUrl})`, inline: false },
                    { name: 'Météo actuelle', value: `${weather.weather[0].description}\n🌡 Temp: ${weather.main.temp}°C\n💨 Vent: ${weather.wind.speed} m/s\n💧 Humidité: ${weather.main.humidity}%`, inline: false }
                )
                .setColor('#1E90FF')
                .setTimestamp()
                .setFooter({ text: 'Données météo fournies par OpenWeatherMap' });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Impossible de récupérer la météo pour ce port.', ephemeral: true });
        }
    }
};
