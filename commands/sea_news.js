const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sea_news')
        .setDescription('Affiche les dernières nouvelles ou incidents en mer.'),
    
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://maritime-executive.com/rss');
            const xmlData = await response.text();

            // Regex simple pour extraire les <item> du RSS
            const itemMatches = xmlData.match(/<item>([\s\S]*?)<\/item>/g);
            if (!itemMatches) {
                return interaction.editReply('📭 Aucune news maritime récente trouvée.');
            }

            const newsToShow = itemMatches.slice(0, 5).map(item => {
                const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/);
                const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
                const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/);

                return {
                    title: titleMatch ? titleMatch[1] : 'Sans titre',
                    link: linkMatch ? linkMatch[1] : '#',
                    description: descMatch ? descMatch[1].substring(0, 200) + '...' : ''
                };
            });

            const embed = new EmbedBuilder()
                .setTitle('📰 Dernières nouvelles en mer - The Maritime Executive')
                .setColor('#1E90FF')
                .setTimestamp();

            newsToShow.forEach((item, i) => {
                embed.addFields({
                    name: `${i + 1}. ${item.title}`,
                    value: `[Lire la suite](${item.link})\n${item.description}`
                });
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await interaction.editReply('❌ Une erreur est survenue lors de la récupération des news.');
        }
    }
};
