const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const timeZones = [
    { label: 'New York (UTC-4)', tz: 'America/New_York' },
    { label: 'Londres (UTC+0)', tz: 'Europe/London' },
    { label: 'Tokyo (UTC+9)', tz: 'Asia/Tokyo' },
    { label: 'Sydney (UTC+10)', tz: 'Australia/Sydney' },
    { label: 'Paris (UTC+2)', tz: 'Europe/Paris' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clock')
        .setDescription('Affiche l’heure GMT, l’heure locale et les fuseaux horaires')
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription('Fuseau horaire spécifique à afficher (ex: Europe/London)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const now = new Date();
        const gmtTime = now.toUTCString();
        const localTime = now.toLocaleString('fr-FR', { hour12: false });

        // Fuseau horaire choisi par l'utilisateur
        const userTZ = interaction.options.getString('timezone');
        let userTZTime = null;
        if (userTZ) {
            try {
                userTZTime = now.toLocaleString('fr-FR', { timeZone: userTZ, hour12: false });
            } catch (err) {
                userTZTime = 'Fuseau horaire invalide';
            }
        }

        // Fuseaux horaires populaires
        const tzStrings = timeZones.map(tz => {
            const time = now.toLocaleString('fr-FR', { timeZone: tz.tz, hour12: false });
            return `**${tz.label}** : ${time}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🕒 Horloges mondiales')
            .setColor('#1E90FF')
            .addFields(
                { name: 'GMT (UTC)', value: gmtTime, inline: false },
                { name: `Heure locale de ${interaction.user.username}`, value: localTime, inline: false },
                { name: 'Fuseaux horaires populaires', value: tzStrings, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Horloge mondiale — informations fournies par SeaBot' });

        // Ajouter fuseau personnalisé si fourni
        if (userTZ) {
            embed.addFields({ name: `Fuseau choisi : ${userTZ}`, value: userTZTime, inline: false });
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
