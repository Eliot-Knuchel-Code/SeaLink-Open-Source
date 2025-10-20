const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('route')
        .setDescription('Affiche la route et infos d’un navire AIS')
        .addStringOption(option =>
            option.setName('vessel')
                .setDescription('Nom ou IMO du navire')
                .setRequired(true)),
    
    async execute(interaction) {
        const vesselName = interaction.options.getString('vessel');
        const API_KEY = process.env.AISSTREAM_API_KEY;

        await interaction.deferReply(); // Temps de réponse car API peut être lente

        try {
            // Exemple : recherche par nom
            const url = `https://api.aisstream.io/v1/vessels?name=${encodeURIComponent(vesselName)}&apiKey=${API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!data.vessels || data.vessels.length === 0) {
                return interaction.editReply(`❌ Aucun navire trouvé pour "${vesselName}"`);
            }

            const vessel = data.vessels[0]; // prendre le premier résultat

            const embed = new EmbedBuilder()
                .setTitle(`🚢 Route du navire : ${vessel.name}`)
                .setColor('#1E90FF')
                .addFields(
                    { name: 'Position', value: `Lat: ${vessel.position.lat}, Lon: ${vessel.position.lon}` },
                    { name: 'Destination', value: vessel.destination || 'Inconnue' },
                    { name: 'Vitesse', value: vessel.speed ? `${vessel.speed} kn` : 'Inconnue' },
                    { name: 'Cap', value: vessel.heading || 'Inconnu' },
                    { name: 'ETA', value: vessel.eta || 'Inconnue' }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await interaction.editReply('❌ Une erreur est survenue lors de la récupération des informations.');
        }
    }
};
