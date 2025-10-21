async function handleAutocomplete(interaction) {
  try {
    if (interaction.options.getSubcommand() === 'list' && interaction.options.getFocused(true).name === 'country') {
      const portsObj = readJson(PORTS_PATH) || {};
      const countries = Object.keys(portsObj);
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const choices = countries
        .filter(c => c.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(c => ({ name: `${getFlagEmoji(c)} ${c}`, value: c }));
      await interaction.respond(choices);
    }
  } catch (err) {
    console.error('Autocomplete error:', err);
    await interaction.respond([]);
  }
}
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PORTS_PATH = path.join(DATA_DIR, 'ports.json');
const PENDING_PATH = path.join(DATA_DIR, 'ports_pending.json');

// Ensure files exist
if (!fs.existsSync(PORTS_PATH)) fs.writeFileSync(PORTS_PATH, JSON.stringify({}, null, 2));
if (!fs.existsSync(PENDING_PATH)) fs.writeFileSync(PENDING_PATH, JSON.stringify({}, null, 2));

// Utility functions
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
function isValidLatLon(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) return false;
  return la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}
function getFlagEmoji(country) {
  const countryCodes = {
    "Bangladesh": "BD", "Belgium": "BE", "Bulgaria": "BG", "China": "CN", "Egypt": "EG", "France": "FR", "Germany": "DE", "Greece": "GR", "India": "IN", "Indonesia": "ID", "Iran": "IR", "Italy": "IT", "Japan": "JP", "Kenya": "KE", "Malaysia": "MY", "Morocco": "MA", "Netherlands": "NL", "Nigeria": "NG", "Oman": "OM", "Pakistan": "PK", "Philippines": "PH", "Romania": "RO", "Russia": "RU", "Singapore": "SG", "South Africa": "ZA", "South Korea": "KR", "Spain": "ES", "Sri Lanka": "LK", "Taiwan": "TW", "Thailand": "TH", "Ukraine": "UA", "United Arab Emirates": "AE", "United States": "US", "Vietnam": "VN"
  };
  const code = countryCodes[country];
  if (!code) return '';
  return code.replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

// Flatten ports for listing
function flattenPorts(portsObj, filterCountry = null) {
  const countries = Object.keys(portsObj);
  let allPorts = [];
  if (filterCountry) {
    // Büyük/küçük harf duyarsız eşleşme
    const matchCountry = countries.find(c => c.toLowerCase() === filterCountry.toLowerCase());
    if (matchCountry && portsObj[matchCountry]) {
      for (const port of portsObj[matchCountry]) {
        allPorts.push({ ...port, country: matchCountry, flag: getFlagEmoji(matchCountry) });
      }
    }
  } else {
    for (const country of countries) {
      for (const port of portsObj[country]) {
        allPorts.push({ ...port, country, flag: getFlagEmoji(country) });
      }
    }
  }
  return { allPorts, countries };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ports')
    .setDescription('List ports or propose a new port')
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List available ports')
      .addStringOption(opt => opt.setName('country').setDescription('Country to filter').setRequired(false).setAutocomplete(true))
    )
    .addSubcommand(sub => sub
      .setName('propose')
      .setDescription('Propose a new port (admin approval required)')
      .addStringOption(opt => opt.setName('name').setDescription('Port name').setRequired(true))
      .addStringOption(opt => opt.setName('country').setDescription('Country/region').setRequired(false))
      .addStringOption(opt => opt.setName('latitude').setDescription('Latitude (ex: 48.8566)').setRequired(true))
      .addStringOption(opt => opt.setName('longitude').setDescription('Longitude (ex: 2.3522)').setRequired(true))
      .addStringOption(opt => opt.setName('info').setDescription('Additional info (size, traffic)').setRequired(false))
    ),
  autocomplete: handleAutocomplete,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // LIST PORTS
    if (sub === 'list') {
      await interaction.deferReply();
      const filterCountry = interaction.options.getString('country');
      const portsObj = readJson(PORTS_PATH) || {};
      const { allPorts, countries } = flattenPorts(portsObj, filterCountry);

      if (allPorts.length === 0) {
        return interaction.editReply('⚠️ No ports available at the moment.');
      }

      const embed = new EmbedBuilder()
        .setTitle('📚 Ports')
        .setColor('#1E90FF')
        .setTimestamp()
        .setFooter({ text: `Showing ${allPorts.length} ports. Countries: ${countries.length}` });

      let usageFieldAdded = false;
      // Kullanım bilgisini embed'e ekle (sadece ülke seçilmediyse)
      if (!filterCountry) {
        embed.addFields({
          name: 'Kullanım',
          value: 'Kullanım: /ports list [country]\nBelirli bir ülke için filtreleyebilirsiniz.',
          inline: false
        });
        usageFieldAdded = true;
      }

      // Sayfalama için limanları 25'lik gruplara böl
      const maxPortFields = usageFieldAdded ? 24 : 25;
      const portPages = [];
      for (let i = 0; i < allPorts.length; i += maxPortFields) {
        const embedPage = new EmbedBuilder()
          .setTitle('📚 Ports')
          .setColor('#1E90FF')
          .setTimestamp()
          .setFooter({ text: `Showing ${allPorts.length} ports. Countries: ${countries.length}` });
        if (!filterCountry && i === 0 && usageFieldAdded) {
          embedPage.addFields({
            name: 'Kullanım',
            value: 'Kullanım: /ports list [country]\nBelirli bir ülke için filtreleyebilirsiniz.',
            inline: false
          });
        }
        allPorts.slice(i, i + maxPortFields).forEach(port => {
          const coords = (port.lat !== undefined && port.lon !== undefined)
            ? `${port.lat}, ${port.lon}`
            : (port.latitude !== undefined && port.longitude !== undefined)
              ? `${port.latitude}, ${port.longitude}`
              : 'No coordinates';
          const country = port.country ? ` — ${port.flag} ${port.country}` : '';
          const info = port.info ? `\n${port.info}` : '';
          embedPage.addFields({ name: `${port.name}${country}`, value: `${coords}${info}`, inline: false });
        });
        portPages.push(embedPage);
      }

      // Sayfa butonları
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Geri').setStyle(1),
        new ButtonBuilder().setCustomId('next').setLabel('➡️ İleri').setStyle(1)
      );

      // Dropdown'u sadece ülke seçilmediyse göster
      let components = [];
      if (!filterCountry) {
        let countryOptions = countries.map(c => ({
          label: `${getFlagEmoji(c)} ${c}`,
          value: c
        }));
        if (countryOptions.length > 25) {
          countryOptions = countryOptions.slice(0, 25);
        }
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('country_select')
          .setPlaceholder('Select a country to view its ports')
          .addOptions(countryOptions);
        components = [row, new ActionRowBuilder().addComponents(selectMenu)];
      } else {
        components = [row];
      }

      // İlk sayfa göster
      const message = await interaction.editReply({ embeds: [portPages[0]], components });

      // Collector ile sayfa değişimi
      if (portPages.length > 1) {
        let currentPage = 0;
        const collector = message.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', i => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: "❌ Bu sayfa size ait.", flags: 64 });
          }
          if (i.customId === 'prev') {
            currentPage = currentPage > 0 ? currentPage - 1 : portPages.length - 1;
          } else if (i.customId === 'next') {
            currentPage = currentPage < portPages.length - 1 ? currentPage + 1 : 0;
          }
          i.update({ embeds: [portPages[currentPage]], components });
        });
        collector.on('end', () => {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Geri').setStyle(1).setDisabled(true),
            new ButtonBuilder().setCustomId('next').setLabel('➡️ İleri').setStyle(1).setDisabled(true)
          );
          let disabledComponents = [];
          if (!filterCountry) {
            let countryOptions = countries.map(c => ({
              label: `${getFlagEmoji(c)} ${c}`,
              value: c
            }));
            if (countryOptions.length > 25) {
              countryOptions = countryOptions.slice(0, 25);
            }
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('country_select')
              .setPlaceholder('Select a country to view its ports')
              .addOptions(countryOptions)
              .setDisabled(true);
            disabledComponents = [disabledRow, new ActionRowBuilder().addComponents(selectMenu)];
          } else {
            disabledComponents = [disabledRow];
          }
          message.edit({ components: disabledComponents }).catch(() => {});
        });
      }
      return;
    }

    // PROPOSE PORT
    if (sub === 'propose') {
      await interaction.deferReply({ flags: 64 }); // 64 = ephemeral
      const name = interaction.options.getString('name');
      const country = interaction.options.getString('country') || 'Other';
      const latitude = interaction.options.getString('latitude');
      const longitude = interaction.options.getString('longitude');
      const info = interaction.options.getString('info') || '';

      if (!isValidLatLon(latitude, longitude)) {
        return interaction.editReply('❌ Invalid latitude or longitude.');
      }

      const pendingObj = readJson(PENDING_PATH) || {};
      if (!pendingObj[country]) pendingObj[country] = [];
      // Check for duplicate
      const exists = pendingObj[country].some(p => p.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return interaction.editReply('❌ This port proposal already exists and is pending approval.');
      }

      pendingObj[country].push({
        name,
        country,
        latitude,
        longitude,
        info
      });
      writeJson(PENDING_PATH, pendingObj);

      return interaction.editReply(`✅ Port proposal for **${name}** (${country}) submitted for admin approval.`);
    }

    // Fallback
    return interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
  }
};