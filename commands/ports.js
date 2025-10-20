// commands/ports.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PORTS_PATH = path.join(DATA_DIR, 'ports.json');
const PENDING_PATH = path.join(DATA_DIR, 'ports_pending.json');

// ensure files exist
if (!fs.existsSync(PORTS_PATH)) fs.writeFileSync(PORTS_PATH, JSON.stringify([], null, 2));
if (!fs.existsSync(PENDING_PATH)) fs.writeFileSync(PENDING_PATH, JSON.stringify({}, null, 2));

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// simple lat/lon validation
function isValidLatLon(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) return false;
  return la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ports')
    .setDescription('Lister les ports ou proposer un nouveau port')
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Liste les ports disponibles')
      .addIntegerOption(opt => opt.setName('page').setDescription('Page à afficher').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('propose')
      .setDescription('Propose un nouveau port (sera soumis à validation admin)')
      .addStringOption(opt => opt.setName('name').setDescription('Nom du port').setRequired(true))
      .addStringOption(opt => opt.setName('country').setDescription('Pays / région').setRequired(false))
      .addStringOption(opt => opt.setName('latitude').setDescription('Latitude (ex: 48.8566)').setRequired(true))
      .addStringOption(opt => opt.setName('longitude').setDescription('Longitude (ex: 2.3522)').setRequired(true))
      .addStringOption(opt => opt.setName('info').setDescription('Infos supplémentaires (taille, trafic)').setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      await interaction.deferReply({ ephemeral: false });

      const page = interaction.options.getInteger('page') || 1;
      const pageSize = 10;

      const ports = readJson(PORTS_PATH) || [];
      if (ports.length === 0) {
        return interaction.editReply('⚠️ Aucun port disponible pour l’instant.');
      }

      const totalPages = Math.ceil(ports.length / pageSize);
      const p = Math.max(1, Math.min(page, totalPages));
      const slice = ports.slice((p - 1) * pageSize, p * pageSize);

      const embed = new EmbedBuilder()
        .setTitle(`📚 Ports — page ${p}/${totalPages}`)
        .setColor('#1E90FF')
        .setTimestamp();

      slice.forEach(port => {
        const coords = port.latitude && port.longitude ? `\`${port.latitude}, ${port.longitude}\`` : 'N/A';
        const country = port.country ? ` — ${port.country}` : '';
        const info = port.info ? `\n${port.info}` : '';
        embed.addFields({ name: `${port.name}${country}`, value: `${coords}${info}`, inline: false });
      });

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'propose') {
      // propose new port (stored in pending)
      const name = interaction.options.getString('name').trim();
      const country = interaction.options.getString('country')?.trim() || '';
      const lat = interaction.options.getString('latitude').trim();
      const lon = interaction.options.getString('longitude').trim();
      const info = interaction.options.getString('info')?.trim() || '';

      // basic validation
      if (!name) return interaction.reply({ content: '❌ Nom invalide.', ephemeral: true });
      if (!isValidLatLon(lat, lon)) return interaction.reply({ content: '❌ Coordonnées invalides. Utilise un format numérique pour latitude/longitude.', ephemeral: true });

      // load current pending
      const pending = readJson(PENDING_PATH) || {};
      const id = `p_${Date.now()}`; // simple unique id

      pending[id] = {
        id,
        name,
        country,
        latitude: Number(lat),
        longitude: Number(lon),
        info,
        proposer: { id: interaction.user.id, tag: interaction.user.tag },
        createdAt: new Date().toISOString()
      };

      writeJson(PENDING_PATH, pending);

      // Notify proposer and log channel if configured (non-blocking)
      try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId) {
          const ch = interaction.guild?.channels.cache.get(logChannelId);
          if (ch && ch.isTextBased()) {
            ch.send(`📥 Nouvelle proposition de port: **${name}** (id: ${id}) proposée par ${interaction.user.tag}`).catch(()=>{});
          }
        }
      } catch (e) { /* ignore */ }

      return interaction.reply({ content: `✅ Proposition enregistrée (id: ${id}). Un administrateur doit la valider avec \`/ports_approve approve ${id}\`.`, ephemeral: true });
    }

    // fallback
    return interaction.reply({ content: '❌ Sous-commande inconnue.', ephemeral: true });
  }
};
