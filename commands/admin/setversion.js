// commands/admin/setversion.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActivityType } = require('discord.js');
const { sequelize } = require('../../database/migrations');
const { DataTypes } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setversion')
    .setDescription('Met à jour le numéro de version du bot (Admin seulement)')
    .addStringOption(opt => opt.setName('version').setDescription('Nouveau numéro de version (ex: 1.2.3)').setRequired(true))
    .addChannelOption(opt => opt.setName('announce_channel').setDescription('Salon où annoncer la nouvelle version (optionnel)').setRequired(false))
    .addBooleanOption(opt => opt.setName('announce').setDescription('Annnoncer la version dans le salon fourni ? (true/false)').setRequired(false)),

  async execute(interaction) {
    // Vérif perm admin
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Tu dois être administrateur pour utiliser cette commande.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const version = interaction.options.getString('version').trim();
      const announceChannel = interaction.options.getChannel('announce_channel');
      const doAnnounce = interaction.options.getBoolean('announce') || false;

      // Crée (ou récupère) le modèle BotConfig pour stocker des paires clé/valeur
      const BotConfig = sequelize.models.BotConfig || sequelize.define('BotConfig', {
        key: { type: DataTypes.STRING, primaryKey: true },
        value: { type: DataTypes.TEXT }
      });

      await BotConfig.sync();

      // Sauvegarde la version
      const key = 'version';
      let row = await BotConfig.findByPk(key);
      if (row) {
        row.value = version;
        await row.save();
      } else {
        await BotConfig.create({ key, value: version });
      }

      // Met à jour la rich presence immédiatement (si bot ready)
      try {
        const client = interaction.client;
        // Compose une activité simple affichant la version
        const activityName = `Version ${version} | SeaLink`;
        await client.user.setPresence({
          activities: [{ name: activityName, type: ActivityType.Watching }],
          status: 'online'
        });
      } catch (err) {
        console.warn('Impossible de mettre à jour la présence immédiatement :', err);
      }

      // Optionnel : annoncer dans un salon
      if (doAnnounce && announceChannel) {
        try {
          const embed = new EmbedBuilder()
            .setTitle('🔧 Mise à jour du bot')
            .setDescription(`La version du bot a été mise à jour.`)
            .addFields(
              { name: 'Nouvelle version', value: version, inline: true },
              { name: 'Par', value: `${interaction.user.tag}`, inline: true }
            )
            .setTimestamp()
            .setColor('Blue')
            .setFooter({ text: 'SeaLink - Mise à jour' });

          await announceChannel.send({ embeds: [embed] });
        } catch (err) {
          console.warn('Impossible d\'annoncer la version dans le salon :', err);
        }
      }

      return interaction.editReply({ content: `✅ Version mise à jour en base : **${version}**` });

    } catch (err) {
      console.error('Erreur setversion:', err);
      return interaction.editReply({ content: '❌ Une erreur est survenue lors de la mise à jour de la version.' });
    }
  }
};
