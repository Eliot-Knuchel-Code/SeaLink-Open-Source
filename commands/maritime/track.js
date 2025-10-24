const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('track')
        .setDescription('Track un bateau via son MMSI')
        .addStringOption(opt => opt.setName('mmsi').setDescription('MMSI du bateau').setRequired(true)),

    async execute(interaction) {
        const mmsi = interaction.options.getString('mmsi');
        await interaction.deferReply();

        try {
            // ---------------- AISSTREAM ----------------
            const aisUrl = `https://api.aisstream.com/vessels/${mmsi}?api_key=${process.env.AIS_API_KEY}`;
            const aisRes = await fetch(aisUrl);
            if(!aisRes.ok) return interaction.editReply('❌ Impossible de récupérer les données AIS');

            const aisData = await aisRes.json();
            const { name, latitude, longitude, course, speed } = aisData;

            // ---------------- OPENWEATHER ----------------
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            const weatherDesc = weatherData.weather[0].description;
            const temp = weatherData.main.temp;

            // ---------------- GOOGLE MAPS ----------------
            const googleMapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

            // ---------------- EMBED ----------------
            const embed = new EmbedBuilder()
                .setTitle(`🛳️ Tracking : ${name || 'Nom inconnu'}`)
                .setDescription(`MMSI : ${mmsi}`)
                .addFields(
                    { name: 'Position', value: `Latitude : ${latitude}\nLongitude : ${longitude}` },
                    { name: 'Carte', value: `[Voir sur Google Maps](${googleMapLink})` },
                    { name: 'Cap / Vitesse', value: `${course}° / ${speed} kn` },
                    { name: 'Météo locale', value: `${weatherDesc}, ${temp}°C` }
                )
                .setColor('Blue')
                .setTimestamp();

            interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            interaction.editReply('❌ Une erreur est survenue lors du tracking du bateau');
        }
    }
};
