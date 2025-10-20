const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const LOG_CHANNEL_ID = 'ID_DU_CHANNEL_LOG'; // remplace si nécessaire

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre du serveur')
    .addUserOption(opt => opt.setName('user').setDescription('Utilisateur à expulser').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Raison (optionnel)').setRequired(false))
    // uniquement membres avec KickMembers (ou ManageGuild) peuvent exécuter
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';
    const guild = interaction.guild;

    if (!guild) return interaction.editReply('❌ Cette commande doit être utilisée dans un serveur.');

    const member = guild.members.cache.get(target.id) || await guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Membre introuvable sur ce serveur.');

    // protections
    if (member.user.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas t\'expulser toi-même.');
    if (!member.kickable) return interaction.editReply('❌ Je ne peux pas expulser ce membre (rôle supérieur ou permissions manquantes).');

    // DM try
    try {
      await target.send(`🔔 Tu as été **expulsé** du serveur **${guild.name}**.\nRaison : ${reason}`);
    } catch (err) {
      // ignore DM fail
    }

    // kick
    try {
      await member.kick(reason);
      // log channel (optionnel)
      const logCh = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
      if (logCh && logCh.isTextBased()) {
        logCh.send(`👢 **Kick**: ${target.tag} (${target.id}) par ${interaction.user.tag} — ${reason}`).catch(()=>{});
      }

      return interaction.editReply({ content: `✅ ${target.tag} a été expulsé.`, ephemeral: true });
    } catch (err) {
      console.error('Kick error:', err);
      return interaction.editReply('❌ Impossible d\'expulser ce membre. Vérifie mes permissions.');
    }
  }
};
