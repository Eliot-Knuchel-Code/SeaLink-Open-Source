const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bug')
        .setDescription('Signaler un bug du bot')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description du bug rencontré')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName('screenshot')
                .setDescription('Ajouter une capture d\'écran ou fichier (optionnel)')
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const description = interaction.options.getString('description');
        const attachment = interaction.options.getAttachment('screenshot');

        // ID du channel pour les rapports de bugs
        const bugChannelId = '1429445588365213736'; // remplacer par l'ID du channel bug-report
        const bugChannel = interaction.guild.channels.cache.get(bugChannelId);

        if (!bugChannel) {
            return interaction.editReply({ content: '❌ Le channel pour les bugs n\'a pas été trouvé sur ce serveur.', ephemeral: true });
        }

        // Créer l'embed pour le channel
        const embed = new EmbedBuilder()
            .setTitle('🐛 Nouveau rapport de bug')
            .addFields(
                { name: 'Utilisateur', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                { name: 'Description', value: description, inline: false },
                { name: 'Serveur', value: `${interaction.guild.name} (${interaction.guild.id})`, inline: false }
            )
            .setColor('#FFAA00')
            .setTimestamp();

        if (attachment) {
            embed.setImage(attachment.url);
        }

        try {
            // Envoyer l'embed dans le channel
            await bugChannel.send({ embeds: [embed] });

            // Envoyer un MP à l'utilisateur pour confirmer
            let dmMessage = `✅ Merci ! Ton bug a été pris en compte et signalé aux administrateurs.`;
            if (attachment) dmMessage += `\nTon fichier a été inclus dans le rapport.`;

            await interaction.user.send(dmMessage);

            return interaction.editReply({ content: '✅ Ton bug a été signalé avec succès !', ephemeral: true });
        } catch (err) {
            console.error('Erreur lors de l\'envoi du rapport de bug', err);
            return interaction.editReply({ content: '❌ Impossible de signaler le bug pour le moment.', ephemeral: true });
        }
    }
};
