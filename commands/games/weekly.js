// commands/games/weekly.js
const { SlashCommandBuilder } = require('discord.js');
const { sequelize, User } = require('../../database/migrations'); // adapte si ton export diffère
const { DataTypes } = require('sequelize');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Récupère ta récompense hebdomadaire (cooldown 7 jours)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Config
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
    const MIN_REWARD = 1000;
    const MAX_REWARD = 3000;

    // Définit le modèle WeeklyClaim si pas déjà
    const WeeklyClaim = sequelize.models.WeeklyClaim || sequelize.define('WeeklyClaim', {
      userId: { type: DataTypes.STRING, primaryKey: true },
      lastClaim: { type: DataTypes.DATE, allowNull: true },
      notified: { type: DataTypes.BOOLEAN, defaultValue: false } // si notification déjà envoyée
    });

    await WeeklyClaim.sync();

    // Récupère ou crée l'utilisateur
    let user = await User.findByPk(interaction.user.id);
    if (!user) user = await User.create({ id: interaction.user.id, balance: 0 });

    // Récupère le record weekly
    let record = await WeeklyClaim.findByPk(interaction.user.id);
    const now = new Date();

    if (record && record.lastClaim) {
      const last = new Date(record.lastClaim);
      const diff = now - last;
      if (diff < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - diff;
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return interaction.editReply({
          content: `⏳ Weekly déjà récupérée. Reviens dans ${days}j ${hours}h ${minutes}m.`,
        });
      }
    }

    // Donne la récompense
    const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
    user.balance += reward;
    await user.save();

    // Update record weekly (reset notified)
    if (record) {
      record.lastClaim = now;
      record.notified = false;
      await record.save();
    } else {
      await WeeklyClaim.create({ userId: interaction.user.id, lastClaim: now, notified: false });
    }

    return interaction.editReply({
      content: `✅ Tu as récupéré ta récompense hebdomadaire : **${reward} crédits**. Solde : **${user.balance} crédits**.`,
    });
  }
};
