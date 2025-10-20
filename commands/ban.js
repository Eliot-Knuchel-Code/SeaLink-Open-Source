const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const LOG_CHANNEL_ID = 'ID_DU_CHANNEL_LOG'; // remplace si nécessaire

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .addUserOption(opt => opt.setName('user').setDescription('Utilisateur à bannir').setRequired(true))
    .addIntegerOption(opt => opt.setName('days').setDescription('Supprimer les messages des X derniers jours (0-7)').setRequired(false))
    .addStringOption(opt => opt.setName('reason').setDescription('Raison (optionnel)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const days = Math.min(Math.max(interaction.options.getInteger('days') ?? 0, 0), 7);
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';
    const guild = interaction.guild;

    if (!guild) return interaction.editReply('❌ Cette commande doit être utilisée dans un serveur.');

    // fetch member if present
    let member = guild.members.cache.get(target.id);
    if (!member) {
      // Member might not be cached - that's OK for ban
      try { member = await guild.members.fetch(target.id); } catch {}
    }

    // protections
    if (target.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas te bannir toi-même.');
    if (member && !member.bannable) return interaction.editReply('❌ Je ne peux pas bannir ce membre (rôle supérieur ou permissions manquantes).');

    // DM try
    try {
      await target.send(`🔔 Tu as été **banni** du serveur **${guild.name}**.\nRaison : ${reason}`);
    } catch (err) {
      // ignore DM fail
    }

    // ban
    try {
      await guild.bans.create(target.id, { days, reason });
      const logCh = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
      if (logCh && logCh.isTextBased()) {
        logCh.send(`⛔ **Ban**: ${target.tag} (${target.id}) par ${interaction.user.tag} — ${reason} — purge ${days} jours`).catch(()=>{});
      }
      return interaction.editReply({ content: `✅ ${target.tag} a été banni (purge ${days} jours).`, ephemeral: true });
    } catch (err) {
      console.error('Ban error:', err);
      return interaction.editReply('❌ Impossible de bannir ce membre. Vérifie mes permissions.');
    }
  }
};
