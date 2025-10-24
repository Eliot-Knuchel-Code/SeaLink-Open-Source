// commands/economy/daily.js
const { SlashCommandBuilder } = require('discord.js');
const { sequelize, User } = require('../../database/migrations');
const { DataTypes } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Récupère ta récompense maritime quotidienne (cooldown 24h)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 heures
    const MIN_REWARD = 100;
    const MAX_REWARD = 500;

    const DailyClaim = sequelize.models.DailyClaim || sequelize.define('DailyClaim', {
      userId: { type: DataTypes.STRING, primaryKey: true },
      lastClaim: { type: DataTypes.DATE, allowNull: true },
      notified: { type: DataTypes.BOOLEAN, defaultValue: false }
    });

    await DailyClaim.sync();

    let user = await User.findByPk(interaction.user.id);
    if (!user) {
      user = await User.create({ id: interaction.user.id, balance: 0 });
    }

    let record = await DailyClaim.findByPk(interaction.user.id);
    const now = new Date();

    if (record && record.lastClaim) {
      const diff = now - record.lastClaim;
      if (diff < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - diff;
        const hours = Math.floor(remainingMs / 3600000);
        const minutes = Math.floor((remainingMs % 3600000) / 60000);
        return interaction.editReply(`⏳ Tu dois attendre encore **${hours}h ${minutes}m** avant de réclamer ta prochaine récompense.`);
      }
    }

    const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;

    user.balance += reward;
    await user.save();

    if (record) {
      record.lastClaim = now;
      record.notified = false;
      await record.save();
    } else {
      await DailyClaim.create({ userId: interaction.user.id, lastClaim: now, notified: false });
    }

    return interaction.editReply(`🪙 Tu as reçu **${reward} crédits** aujourd’hui ! Ton solde est maintenant de **${user.balance} crédits.** 🌊`);
  }
};
