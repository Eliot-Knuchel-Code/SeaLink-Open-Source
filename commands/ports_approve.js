// commands/ports_approve.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTS_PATH = path.join(DATA_DIR, 'ports.json');
const PENDING_PATH = path.join(DATA_DIR, 'ports_pending.json');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function writeJson(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ports_approve')
    .setDescription('Admin : valider ou rejeter une proposition de port')
    .addStringOption(opt => opt.setName('action').setDescription('approve | reject').setRequired(true))
    .addStringOption(opt => opt.setName('id').setDescription('ID de la proposition (ex: p_163...)').setRequired(true))
    .addStringOption(opt => opt.setName('note').setDescription('Note / raison (optionnel)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const action = interaction.options.getString('action').toLowerCase();
    const id = interaction.options.getString('id');
    const note = interaction.options.getString('note') || '';

    const pending = readJson(PENDING_PATH) || {};
    if (!pending[id]) {
      return interaction.editReply({ content: `⚠️ Proposition introuvable : ${id}`, ephemeral: true });
    }

    const item = pending[id];

    if (action === 'approve') {
      const ports = readJson(PORTS_PATH) || [];
      // ensure no duplicate name/coords exist (simple check)
      const exists = ports.some(p => p.name.toLowerCase() === item.name.toLowerCase() ||
        (p.latitude === item.latitude && p.longitude === item.longitude));
      if (exists) {
        // remove from pending to avoid reprocessing, but inform admin
        delete pending[id];
        writeJson(PENDING_PATH, pending);
        // try to DM proposer to inform about duplicate removal
        try {
          const proposerUser = await interaction.client.users.fetch(item.proposer.id).catch(()=>null);
          if (proposerUser) {
            await proposerUser.send(
              `⚠️ Bonjour ${item.proposer.tag},\n\n` +
              `Votre proposition de port **${item.name}** (id: ${id}) n'a pas été ajoutée car un port similaire existe déjà.\n` +
              `Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur.`
            ).catch(()=>{});
          }
        } catch (e) { /* ignore */ }

        return interaction.editReply({ content: `⚠️ Un port semblable existe déjà. Proposition ${id} supprimée des pending.`, ephemeral: true });
      }

      // push to ports
      ports.push({
        id: `port_${Date.now()}`,
        name: item.name,
        country: item.country,
        latitude: item.latitude,
        longitude: item.longitude,
        info: item.info,
        addedBy: item.proposer,
        addedAt: new Date().toISOString()
      });
      writeJson(PORTS_PATH, ports);

      // remove from pending
      delete pending[id];
      writeJson(PENDING_PATH, pending);

      // build embed for channel
      const embed = new EmbedBuilder()
        .setTitle('✅ Proposition validée')
        .setDescription(`Le port **${item.name}** a été ajouté à la base de données.`)
        .addFields(
          { name: 'Pays', value: item.country || 'N/A', inline: true },
          { name: 'Coords', value: `${item.latitude}, ${item.longitude}`, inline: true },
          { name: 'Proposé par', value: `${item.proposer.tag}`, inline: true }
        )
        .setTimestamp();

      // try to post in a log channel
      try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId && interaction.guild) {
          const ch = interaction.guild.channels.cache.get(logChannelId);
          if (ch && ch.isTextBased()) ch.send({ embeds: [embed] }).catch(()=>{});
        }
      } catch (e) { /* ignore */ }

      // Notify proposer by DM
      try {
        const proposerUser = await interaction.client.users.fetch(item.proposer.id).catch(()=>null);
        if (proposerUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle('✅ Votre proposition de port a été approuvée')
            .setDescription(`Le port **${item.name}** a été ajouté à la base de données.`)
            .addFields(
              { name: 'ID proposition', value: id, inline: true },
              { name: 'Nom', value: item.name, inline: true },
              { name: 'Coords', value: `${item.latitude}, ${item.longitude}`, inline: true },
              { name: 'Ajouté par', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: note ? `Note de l'admin: ${note}` : 'Aucune note fournie' })
            .setTimestamp();

          await proposerUser.send({ embeds: [dmEmbed] }).catch(()=>{});
        }
      } catch (e) {
        // DM failure is non-blocking
        console.warn('Impossible d\'envoyer le DM d\'approbation au propositeur:', e);
      }

      return interaction.editReply({ content: `✅ Proposition ${id} approuvée — port ajouté.`, ephemeral: true });
    }

    if (action === 'reject') {
      // remove from pending
      delete pending[id];
      writeJson(PENDING_PATH, pending);

      // Notify proposer by DM about rejection
      try {
        const proposerUser = await interaction.client.users.fetch(item.proposer.id).catch(()=>null);
        if (proposerUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle('❌ Votre proposition de port a été rejetée')
            .setDescription(`La proposition pour le port **${item.name}** (id: ${id}) a été rejetée.`)
            .addFields(
              { name: 'ID proposition', value: id, inline: true },
              { name: 'Nom', value: item.name, inline: true },
              { name: 'Proposé par', value: item.proposer.tag, inline: true }
            )
            .setFooter({ text: note ? `Raison: ${note}` : 'Aucune raison fournie' })
            .setTimestamp();

          await proposerUser.send({ embeds: [dmEmbed] }).catch(()=>{});
        }
      } catch (e) {
        console.warn('Impossible d\'envoyer le DM de rejet au propositeur:', e);
      }

      // log rejection in log channel if configured
      try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId && interaction.guild) {
          const ch = interaction.guild.channels.cache.get(logChannelId);
          if (ch && ch.isTextBased()) ch.send(`❌ Proposition ${id} pour ${item.name} rejetée par ${interaction.user.tag}. Note: ${note || 'Aucune'}`).catch(()=>{});
        }
      } catch (e) { /* ignore */ }

      return interaction.editReply({ content: `✅ Proposition ${id} rejetée.`, ephemeral: true });
    }

    return interaction.editReply({ content: '❌ Action inconnue. Utilise `approve` ou `reject`.', ephemeral: true });
  }
};
