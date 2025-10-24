const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const embed = new EmbedBuilder()
                .setTitle(`Bienvenue à bord, ${member.user.username} ! 🛳️`)
                .setDescription(`Bienvenue sur notre serveur maritime !  
Découvre les commandes du bot, participe aux jeux et missions maritimes, et n'hésite pas à consulter ton journal de bord avec /loogbook.`)
                .addFields(
                    { name: 'Support', value: 'Si tu as besoin d’aide, utilise /ticket pour ouvrir un ticket de support' },
                    { name: 'Conseil', value: 'Commence par explorer les ports avec /port et tracker des bateaux avec /track !' }
                )
                .setColor('Blue')
                .setFooter({ text: 'SeaLink - Ton assistant maritime' });

            await member.send({ embeds: [embed] });
        } catch (err) {
            console.log(`Impossible d’envoyer un MP à ${member.user.tag}`);
        }
    }
};
