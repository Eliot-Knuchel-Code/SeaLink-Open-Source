// commands/games/notify.js
const { SlashCommandBuilder } = require('discord.js');
const { sequelize } = require('../../database/migrations');
const { DataTypes } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Activer ou désactiver les notifications DM pour daily/weekly')
    .addStringOption(opt => opt.setName('action').setDescription('on / off').setRequired(true)
      .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const action = interaction.options.getString('action');

    // Modèle NotificationPref
    const NotificationPref = sequelize.models.NotificationPref || sequelize.define('NotificationPref', {
      userId: { type: DataTypes.STRING, primaryKey: true },
      daily: { type: DataTypes.BOOLEAN, defaultValue: true },
      weekly: { type: DataTypes.BOOLEAN, defaultValue: true }
    });

    await NotificationPref.sync();

    let pref = await NotificationPref.findByPk(interaction.user.id);
    if (!pref) {
      pref = await NotificationPref.create({ userId: interaction.user.id, daily: true, weekly: true });
    }

    const on = action === 'on';

    pref.daily = on;
    pref.weekly = on;
    await pref.save();

    return interaction.editReply({ content: `✅ Notifications DM ${on ? 'activées' : 'désactivées'} pour daily & weekly.` });
  }
};
