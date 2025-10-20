const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const LOG_CHANNEL_ID = 'ID_DU_CHANNEL_LOG'; // remplace si nécessaire

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Met en timeout (mute) un membre pour une durée donnée (minutes)')
    .addUserOption(opt => opt.setName('user').setDescription('Utilisateur à mute').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Durée en minutes (0 pour annuler)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Raison (optionnel)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers), // permission nécessaire pour timeout
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';
    const guild = interaction.guild;

    if (!guild) return interaction.editReply('❌ Cette commande doit être utilisée dans un serveur.');

    const member = guild.members.cache.get(target.id) || await guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Membre introuvable sur ce serveur.');

    if (member.user.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas te mute toi-même.');

    // If minutes == 0 -> remove timeout (unmute)
    try {
      if (minutes === 0) {
        // remove timeout
        if (member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()) {
          await member.timeout(null, reason);
          try { await target.send(`🔔 Ton mute a été levé sur **${guild.name}**.`); } catch {}
          const logCh = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
          if (logCh && logCh.isTextBased()) logCh.send(`🔊 Unmute: ${target.tag} par ${interaction.user.tag} — ${reason}`).catch(()=>{});
          return interaction.editReply({ content: `✅ Le mute de ${target.tag} a été retiré.`, ephemeral: true });
        } else {
          return interaction.editReply('⚠️ Ce membre n\'est pas actuellement en timeout.');
        }
      } else {
        const ms = minutes * 60 * 1000;
        // Check bot has permission: ModerateMembers
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return interaction.editReply('❌ Je n\'ai pas la permission `ModerateMembers` pour mettre en timeout.');
        }
        await member.timeout(ms, reason);
        try { await target.send(`🔇 Tu as été mis en **mute** sur **${guild.name}** pendant ${minutes} minute(s).\nRaison : ${reason}`); } catch {}
        const logCh = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
        if (logCh && logCh.isTextBased()) logCh.send(`🔇 Mute: ${target.tag} (${minutes}m) par ${interaction.user.tag} — ${reason}`).catch(()=>{});
        return interaction.editReply({ content: `✅ ${target.tag} a été mis en mute pour ${minutes} minute(s).`, ephemeral: true });
      }
    } catch (err) {
      console.error('Mute error:', err);
      return interaction.editReply('❌ Impossible de modifier le timeout de ce membre. Vérifie mes permissions et le rôle de la cible.');
    }
  }
};
