const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', 'data', 'geocode_cache.json');
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
if (!fs.existsSync(CACHE_PATH)) fs.writeFileSync(CACHE_PATH, JSON.stringify({}));

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch (e) { return {}; }
}
function writeCache(obj) {
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(obj, null, 2)); } catch(e){/* ignore */ }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('geocode')
    .setDescription('Convertit une adresse postale en coordonnées GPS')
    .addStringOption(opt => opt.setName('adresse').setDescription('Adresse complète (ex: 10 Downing St, London)').setRequired(true))
    .addStringOption(opt => opt.setName('provider').setDescription('Provider (nominatim ou google)').setRequired(false)
      .addChoices({ name: 'Nominatim (OpenStreetMap)', value: 'nominatim' }, { name: 'Google Geocode (API key req.)', value: 'google' })),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const address = interaction.options.getString('adresse');
    const provider = (interaction.options.getString('provider') || 'nominatim').toLowerCase();
    const cache = readCache();

    // Si présent en cache -> renvoyer directement
    if (cache[address]) {
      const d = cache[address];
      const embedCached = new EmbedBuilder()
        .setTitle('📍 Résultat (cache)')
        .setDescription(d.display_name || address)
        .addFields(
          { name: 'Latitude', value: String(d.lat), inline: true },
          { name: 'Longitude', value: String(d.lon), inline: true }
        )
        .addFields(
          { name: 'OSM', value: `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lon}#map=18/${d.lat}/${d.lon}` }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embedCached] });
    }

    try {
      let result = null;

      if (provider === 'nominatim') {
        // Nominatim (OpenStreetMap) — respect user-agent policy
        const contact = process.env.CONTACT_EMAIL || process.env.LOG_CHANNEL_ID || 'SeaBot';
        const url = 'https://nominatim.openstreetmap.org/search';
        const res = await axios.get(url, {
          params: { q: address, format: 'json', addressdetails: 1, limit: 1 },
          headers: { 'User-Agent': `SeaBot/1.0 (${contact})`, 'Accept-Language': 'en' }
        });
        if (res.data && res.data.length > 0) result = res.data[0];
      } else if (provider === 'google') {
        // Google Geocoding (needs API key in env var GOOGLE_GEOCODE)
        const key = process.env.GOOGLE_GEOCODE;
        if (!key) {
          return interaction.editReply({ content: '❌ GOOGLE_GEOCODE non défini dans le .env. Utilise Nominatim ou ajoute une clé Google.', ephemeral: true });
        }
        const url = 'https://maps.googleapis.com/maps/api/geocode/json';
        const res = await axios.get(url, { params: { address, key } });
        if (res.data && res.data.results && res.data.results.length > 0) {
          const r = res.data.results[0];
          result = {
            lat: r.geometry.location.lat,
            lon: r.geometry.location.lng,
            display_name: r.formatted_address,
            address: r.address_components
          };
        }
      } else {
        return interaction.editReply({ content: '❌ Provider inconnu. Choisis "nominatim" ou "google".', ephemeral: true });
      }

      if (!result) {
        return interaction.editReply({ content: '❌ Aucun résultat pour cette adresse.', ephemeral: true });
      }

      // Sauvegarde en cache (simple)
      cache[address] = {
        lat: result.lat,
        lon: result.lon,
        display_name: result.display_name || result.formatted_address || address,
        provider
      };
      writeCache(cache);

      // Construire l'embed
      const lat = String(result.lat);
      const lon = String(result.lon);
      const embed = new EmbedBuilder()
        .setTitle('📍 Géocodage')
        .setDescription(cache[address].display_name)
        .addFields(
          { name: 'Latitude', value: lat, inline: true },
          { name: 'Longitude', value: lon, inline: true },
          { name: 'Provider', value: provider, inline: true }
        )
        .addFields(
          { name: 'OpenStreetMap', value: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}` },
          { name: 'Google Maps', value: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` }
        )
        .setFooter({ text: 'Résultat fourni par ' + (provider === 'nominatim' ? 'OpenStreetMap (Nominatim)' : 'Google Geocoding') })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur geocode:', err);

      // send error to configured error channel if possible
      try {
        if (interaction.guild && process.env.ERROR_CHANNEL_ID) {
          const ch = interaction.guild.channels.cache.get(process.env.ERROR_CHANNEL_ID);
          if (ch && ch.isTextBased()) ch.send(`⚠️ Erreur /geocode par ${interaction.user.tag} : ${err.message}`).catch(()=>{});
        }
      } catch (ee) { /* ignore */ }

      return interaction.editReply({ content: '❌ Erreur lors du géocodage. Essaie plus tard.', ephemeral: true });
    }
  }
};
