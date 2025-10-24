const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('port')
        .setDescription('Obtenir la météo et les informations d’un port')
        .addStringOption(opt => opt.setName('name').setDescription('Nom du port').setRequired(true)),

    async execute(interaction) {
        const portName = interaction.options.getString('name');
        await interaction.deferReply();

        try {
            // ---------------- GEOLOCALISATION ----------------
            const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(portName)}&key=${process.env.GOOGLE_GEOCODE_KEY}`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) return interaction.editReply('❌ Port introuvable');

            const location = geoData.results[0].geometry.location;
            const latitude = location.lat;
            const longitude = location.lng;

            // ---------------- OPENWEATHER ----------------
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();

            const temp = weatherData.main.temp;
            const weatherDesc = weatherData.weather[0].description;
            const wind = weatherData.wind.speed;

            // ---------------- MAREA API (marée) ----------------
            const tideUrl = `https://api.marea.ooo/v1/tide?lat=${latitude}&lon=${longitude}&apikey=${process.env.MAREA_API_KEY}`;
            const tideRes = await fetch(tideUrl);
            const tideData = await tideRes.json();
            const tideInfo = tideData.data && tideData.data.length > 0
                ? `Prochaine marée : ${tideData.data[0].datetime} - ${tideData.data[0].height} m`
                : 'Marée non disponible';

            // ---------------- GOOGLE MAPS ----------------
            const googleMapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

            // ---------------- EMBED ----------------
            const embed = new EmbedBuilder()
                .setTitle(`⚓ Port : ${portName}`)
                .setDescription(`Coordonnées : ${latitude}, ${longitude}`)
                .addFields(
                    { name: 'Météo', value: `${weatherDesc}, ${temp}°C`, inline: true },
                    { name: 'Vent', value: `${wind} m/s`, inline: true },
                    { name: 'Marée', value: tideInfo },
                    { name: 'Carte', value: `[Voir sur Google Maps](${googleMapLink})` }
                )
                .setColor('Aqua')
                .setTimestamp();

            interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            interaction.editReply('❌ Une erreur est survenue lors de la récupération des infos du port');
        }
    }
};
