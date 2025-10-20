const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Reçoit les informations du bot en message privé'),

  async execute(interaction) {
    try {
      // Lien d'invitation du bot (remplace CLIENT_ID et les permissions selon ton bot)
      const CLIENT_ID = interaction.client.user.id;
      const INVITE_LINK = `https://discord.com/oauth2/authorize?client_id=1429402183568330837&permissions=4292493394836983&integration_type=0&scope=bot+applications.commands`;

      const embed = new EmbedBuilder()
        .setTitle('ℹ️ Info SeaLink')
        .setColor('#1E90FF')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
          { name: 'Nom du bot', value: `${interaction.client.user.tag}`, inline: true },
          { name: 'Créateur', value: 'Eliot KNUCHEL', inline: true },
          { name: 'Version', value: '1.1.3', inline: true },
          { name: 'Serveurs', value: `${interaction.client.guilds.cache.size}`, inline: true },
          { name: 'Commandes principales', value: '`/ping`, `/ports`, `/vessel`, `/tides`, `/seagame`, `/promote_top`, `/alert`, `/clock`', inline: false },
          { name: 'Ajouter le bot', value: `[Clique ici pour inviter SeaLink](${INVITE_LINK})`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Merci d\'utiliser SeaLink ! ⛵️' });

      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Je t’ai envoyé les informations en message privé !', ephemeral: true });

    } catch (err) {
      console.error('Erreur commande /info :', err);
      await interaction.reply({ content: '❌ Impossible de t’envoyer un MP. Vérifie que tes MP sont ouverts.', ephemeral: true });
    }
  }
};
