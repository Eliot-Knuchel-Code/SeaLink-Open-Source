const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const LEADERBOARD_PATH = path.join(__dirname, '..', 'data', 'leaderboard.json');
const PROMO_CHANNEL_NAME = 'top-captains';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote_top')
    .setDescription('Attribue un rôle aux top N du leaderboard (crée rôle + channel si nécessaire)')
    .addIntegerOption(opt =>
      opt.setName('n')
        .setDescription('Nombre de joueurs à promouvoir (ex: 3)')
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('remove_others')
        .setDescription('Retirer le rôle aux autres membres (true/false)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const n = interaction.options.getInteger('n');
    const removeOthers = interaction.options.getBoolean('remove_others') || false;
    const guild = interaction.guild;

    if (!guild) return interaction.editReply('❌ Cette commande doit être utilisée dans un serveur.');
    if (n <= 0) return interaction.editReply('❌ Choisis un nombre supérieur à 0.');

    // Lecture du leaderboard
    let leaderboard = {};
    try {
      leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, 'utf8'));
    } catch (err) {
      return interaction.editReply('⚠️ Leaderboard introuvable ou vide.');
    }

    const entries = Object.entries(leaderboard).map(([userId, info]) => ({
      userId,
      name: info.name,
      score: info.score || 0
    }));

    if (entries.length === 0) return interaction.editReply('⚠️ Pas encore de scores dans le leaderboard.');

    const top = entries.sort((a, b) => b.score - a.score).slice(0, n);

    // Recherche ou création du rôle "Top Captain"
    let role = guild.roles.cache.find(r => r.name.toLowerCase() === 'top captain');
    let roleCreated = false;
    if (!role) {
      try {
        role = await guild.roles.create({
          name: 'Top Captain',
          color: '#1E90FF',
          mentionable: true,
          reason: 'Création automatique du rôle pour les meilleurs joueurs du leaderboard.'
        });
        roleCreated = true;
      } catch (err) {
        console.error('Erreur création rôle:', err);
        return interaction.editReply('❌ Impossible de créer le rôle **Top Captain**. Vérifie mes permissions (Manage Roles).');
      }
    }

    if (role.position >= guild.members.me.roles.highest.position) {
      return interaction.editReply('❌ Ma hiérarchie de rôle est insuffisante pour attribuer **Top Captain**. Place mon rôle au-dessus du rôle Top Captain puis réessaye.');
    }

    const promoted = [];
    const failed = [];

    for (const p of top) {
      try {
        const member = await guild.members.fetch(p.userId).catch(() => null);
        if (member) {
          if (member.roles.cache.has(role.id)) {
            promoted.push({ id: p.userId, tag: member.user.tag, score: p.score, already: true });
            continue;
          }
          await member.roles.add(role, `Promu par /promote_top (top ${n})`);
          promoted.push({ id: p.userId, tag: member.user.tag, score: p.score });
        } else {
          failed.push({ id: p.userId, reason: 'Membre non présent sur le serveur' });
        }
      } catch (err) {
        console.error(`Erreur promotion ${p.userId}:`, err);
        failed.push({ id: p.userId, reason: err.message || 'Erreur inconnue' });
      }
    }

    // Retirer le rôle aux autres si activé
    let removedCount = 0;
    if (removeOthers) {
      try {
        for (const [id, member] of role.members) {
          if (!promoted.some(p => p.id === id)) {
            await member.roles.remove(role, 'Retrait automatique du rôle aux non-top');
            removedCount++;
          }
        }
      } catch (err) {
        console.error('Erreur retrait du rôle aux autres:', err);
      }
    }

    // Trouver ou créer le channel #top-captains
    let promoChannel = guild.channels.cache.find(c => c.name === PROMO_CHANNEL_NAME && c.type === ChannelType.GuildText);
    let channelCreated = false;
    if (!promoChannel) {
      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.followUp({
          content: '⚠️ Je n\'ai pas la permission de créer le channel `#top-captains`. Le récap ne sera pas posté.',
          ephemeral: true
        }).catch(() => {});
      } else {
        try {
          promoChannel = await guild.channels.create({
            name: PROMO_CHANNEL_NAME,
            type: ChannelType.GuildText,
            topic: 'Récapitulatif automatique des promotions Top Captain',
            reason: 'Channel créé automatiquement pour les promotions du leaderboard'
          });
          channelCreated = true;
        } catch (err) {
          console.error('Erreur création channel promo:', err);
        }
      }
    }

    // Construire embed de récap
    const embed = new EmbedBuilder()
      .setTitle('🟦 Promotions Leaderboard — Top Captains')
      .setColor('#1E90FF')
      .setTimestamp()
      .setFooter({ text: `Promotions par ${interaction.user.tag}` });

    let desc = `Top ${n} (source leaderboard)\n\n`;
    if (roleCreated) desc += '→ Rôle **Top Captain** créé automatiquement.\n';
    if (channelCreated) desc += `→ Channel **#${PROMO_CHANNEL_NAME}** créé automatiquement.\n`;
    desc += '\n**Promus :**\n';
    if (promoted.length === 0) desc += '_Aucun utilisateur promu._\n';
    promoted.forEach(p => {
      if (p.already) embed.addFields({ name: `🔹 ${p.tag}`, value: `Score: ${p.score} — Déjà promu`, inline: false });
      else embed.addFields({ name: `✅ ${p.tag}`, value: `Score: ${p.score}`, inline: false });
    });

    if (failed.length > 0) {
      embed.addFields({ name: '⚠️ Échecs', value: failed.map(f => `${f.id} — ${f.reason}`).slice(0, 10).join('\n'), inline: false });
    }

    // Poster le récap avec mention @here
    if (promoChannel) {
      try {
        await promoChannel.send({ content: '@here 🚨 Nouvelle promotion des Top Captains !', embeds: [embed] });
      } catch (err) {
        console.error('Impossible d\'envoyer l\'embed dans le channel promo:', err);
      }
    }

    // Message final à l'admin
    let reply = `✅ Promotions terminées. ${promoted.length} promu(s).`;
    if (failed.length) reply += ` ${failed.length} échec(s).`;
    if (removeOthers) reply += `\n🔁 Retrait du rôle aux non-top : ${removedCount} retrait(s).`;
    if (promoChannel) reply += `\n📣 Récap posté dans ${promoChannel.toString()} avec mention @here.`;
    else reply += `\n⚠️ Récap non posté (channel de promo absent et création impossible).`;

    await interaction.editReply(reply);
  },
};
