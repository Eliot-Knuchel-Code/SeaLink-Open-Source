// eco.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ECO_PATH = path.join(DATA_DIR, 'eco.json');
const SHIPS_DIR = path.join(DATA_DIR, 'Ships');

// Ensure data folder & files
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ECO_PATH)) fs.writeFileSync(ECO_PATH, JSON.stringify({}, null, 2));

// Utility: Read JSON file
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return null; }
}

// Utility: Read all ship models from Ships subfolders, add category from folder name
function readShipCatalog() {
  const ships = [];
  if (fs.existsSync(SHIPS_DIR)) {
    const categories = fs.readdirSync(SHIPS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const cat of categories) {
      const catPath = path.join(SHIPS_DIR, cat.name);
      const files = fs.readdirSync(catPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(catPath, file), 'utf8'));
          data.category = cat.name;
          ships.push(data);
        } catch (e) {
          console.error(`Failed to read ship model: ${file} in ${cat.name}`, e);
        }
      }
    }
  }
  return ships;
}

function writeJson(p, data) {
  try {
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Failed to write JSON file: ${p}`, e);
  }
}

// Ensure user structure in eco.json
function ensureUser(ecoData, userId) {
  if (!ecoData[userId]) {
    ecoData[userId] = {
      money: 0,
      boats: [],        // array of { instanceId, model, name, health, boughtAt }
      insurance: {}     // optional insurance entries
    };
  }
  return ecoData[userId];
}

// Calculate fleet bonus (example: based on ship price)
function calculateFleetBonus(userData) {
  const catalog = readShipCatalog();
  if (!userData || !Array.isArray(userData.boats)) return 0;
  let bonus = 0;
  for (const b of userData.boats) {
    const model = catalog.find(m => m.id === b.model || m.model === b.model);
    if (model && model.price) {
      bonus += Math.floor((model.price || 0) / 100);
    }
  }
  return bonus;
}

// Find a ship model by id or name (case-insensitive)
function findModel(catalog, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  return catalog.find(m => (m.id && m.id.toLowerCase() === q) || (m.model && m.model.toLowerCase() === q));
}

// Generate a new instanceId for a purchased ship
function genInstanceId(modelId) {
  return `b_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
}

// Normalize category for button customId
function normalizeCategory(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Main command
module.exports = {
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Manage your maritime economy (balance, fleet, shop, buy, give, leaderboard)')
    .addSubcommand(sub => sub.setName('balance').setDescription('View your balance'))
    .addSubcommand(sub => sub.setName('boats').setDescription('View your fleet'))
    .addSubcommand(sub => sub.setName('shop').setDescription('View the shop (ship catalog)'))
    .addSubcommand(sub => sub.setName('buy').setDescription('Buy a ship from the shop')
      .addStringOption(opt => opt.setName('model').setDescription('Model ID or name').setRequired(true)))
    .addSubcommand(sub => sub.setName('give').setDescription('Give money to a user')
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to give').setRequired(true)))
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('View the top 10 balances')),

  readShipCatalog,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    // Load persistent files
    const ecoData = readJson(ECO_PATH) || {};
    const catalog = readShipCatalog();

    const userId = interaction.user.id;
    const me = ensureUser(ecoData, userId);

    try {
      // BALANCE
      if (sub === 'balance') {
        const bonus = calculateFleetBonus(me);
        const embed = new EmbedBuilder()
          .setTitle(`${interaction.user.username} — Balance`)
          .setDescription(`💰 Current balance: **${me.money || 0}** coins`)
          .addFields(
            { name: 'Fleet bonus', value: `${bonus} (calculated from your ships)`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // BOATS (fleet)
      if (sub === 'boats') {
        if (!me.boats || me.boats.length === 0) {
          return interaction.reply({ content: `🚢 ${interaction.user.username}, you don't own any ships yet.` });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🚢 Fleet of ${interaction.user.username}`)
          .setTimestamp();

        me.boats.forEach((b, idx) => {
          const model = catalog.find(m => m.id === b.model || m.model === b.model);
          const modelName = b.name || (model ? model.model : b.model);
          const info = [
            `ID: \`${b.instanceId}\``,
            `Model: ${modelName}`,
            `Health: ${b.health ?? 100}%`,
            `Bought: ${new Date(b.boughtAt).toLocaleString()}`
          ].join(' • ');
          embed.addFields({ name: `${idx + 1}. ${modelName}`, value: info, inline: false });
        });

        return interaction.reply({ embeds: [embed] });
      }

      // SHOP (catalog)
      if (sub === 'shop') {
        if (!catalog || catalog.length === 0) {
          return interaction.reply({ content: '🛒 The shop is currently empty.' });
        }

        // Group ships by category (using folder names)
        const shipsByCategory = {};
        for (const ship of catalog) {
          const category = ship.category || 'Other';
          if (!shipsByCategory[category]) shipsByCategory[category] = [];
          shipsByCategory[category].push(ship);
        }

        // Category icons
        const categoryIcons = {
          'Cargo': '🚢',
          'Cruise Ship': '🛳️',
          'Private Boat': '🛥️',
          'Rescue boat': '🆘',
          'Tanker': '🛢️',
          'Other': '❓'
        };

        const embed = new EmbedBuilder()
          .setTitle('🛒 Shop — Ship Catalog')
          .setDescription('Ships are listed below by category. Click the relevant button to view models.')
          .setTimestamp();

        // Category header: model count and ship names
        for (const [category, ships] of Object.entries(shipsByCategory)) {
          embed.addFields({
            name: `${categoryIcons[category] || ''} ${category} (${ships.length})`,
            value: ships.map(s => s.model).join('\n'),
            inline: false
          });
        }

        // Create category buttons
        const actionRow = new ActionRowBuilder();
        for (const category of Object.keys(shipsByCategory)) {
          const label = `${categoryIcons[category] || ''} ${category}`;
          const btn = new ButtonBuilder()
            .setCustomId(`eco_shop_${normalizeCategory(category)}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Primary);
          actionRow.addComponents(btn);
        }

        return interaction.reply({ embeds: [embed], components: [actionRow] });
      }

      // BUY (purchase)
      if (sub === 'buy') {
        const query = interaction.options.getString('model').trim();
        const found = findModel(catalog, query);

        if (!found) {
          return interaction.reply({ content: '❌ Model not found in the shop. Check the ID or name.', ephemeral: true });
        }

        const price = found.price ?? 0;
        ensureUser(ecoData, userId);

        if ((ecoData[userId].money || 0) < price) {
          return interaction.reply({ content: `❌ Insufficient balance. Price: ${price} coins. Your balance: ${ecoData[userId].money || 0}`, ephemeral: true });
        }

        // Deduct money and add ship instance
        ecoData[userId].money -= price;
        const instance = {
          instanceId: genInstanceId(found.id),
          model: found.id,
          name: found.model,
          health: 100,
          boughtAt: new Date().toISOString()
        };

        ecoData[userId].boats = ecoData[userId].boats || [];
        ecoData[userId].boats.push(instance);
        writeJson(ECO_PATH, ecoData);

        // Notify log channel if configured (non-blocking)
        try {
          const logId = process.env.LOG_CHANNEL_ID;
          if (logId && interaction.guild) {
            const ch = interaction.guild.channels.cache.get(logId);
            if (ch && ch.isTextBased()) {
              ch.send(`🛒 ${interaction.user.tag} bought ${found.model} (${instance.instanceId}) for ${price} coins.`).catch(()=>{});
            }
          }
        } catch (e) { /* ignore */ }

        return interaction.reply({ content: `✅ Purchase successful: **${found.model}** (id: \`${instance.instanceId}\`). New balance: ${ecoData[userId].money}.`, ephemeral: true });
      }

      // GIVE (money transfer)
      if (sub === 'give') {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (!target) return interaction.reply({ content: '❌ Invalid user.', ephemeral: true });
        if (!Number.isInteger(amount) || amount <= 0) return interaction.reply({ content: '❌ Invalid amount.', ephemeral: true });

        ensureUser(ecoData, userId);
        if ((ecoData[userId].money || 0) < amount) {
          return interaction.reply({ content: '❌ You do not have enough money for this transfer.', ephemeral: true });
        }

        ensureUser(ecoData, target.id);
        ecoData[userId].money -= amount;
        ecoData[target.id].money = (ecoData[target.id].money || 0) + amount;
        writeJson(ECO_PATH, ecoData);

        // Optional log
        try {
          const logId = process.env.LOG_CHANNEL_ID;
          if (logId && interaction.guild) {
            const ch = interaction.guild.channels.cache.get(logId);
            if (ch && ch.isTextBased()) ch.send(`💸 ${interaction.user.tag} gave ${amount} coins to ${target.tag}`).catch(()=>{});
          }
        } catch(e){}

        return interaction.reply({ content: `✅ ${amount} coins transferred to ${target.username}.`, ephemeral: true });
      }

      // LEADERBOARD
      if (sub === 'leaderboard') {
        const arr = Object.entries(ecoData).map(([uid, d]) => ({ id: uid, money: d.money || 0 }));
        arr.sort((a, b) => b.money - a.money);
        const top = arr.slice(0, 10);

        if (top.length === 0) return interaction.reply({ content: '📊 No users in the economy yet.' });

        const embed = new EmbedBuilder()
          .setTitle('🏆 Top 10 — Richest captains')
          .setTimestamp();

        for (let i = 0; i < top.length; i++) {
          const t = top[i];
          let name = `User ${t.id}`;
          try {
            const u = await interaction.client.users.fetch(t.id).catch(()=>null);
            if (u) name = u.tag;
          } catch(e){}
          embed.addFields({ name: `#${i+1} — ${name}`, value: `💰 ${t.money}`, inline: false });
        }

        return interaction.reply({ embeds: [embed] });
      }

      // fallback
      return interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });

    } catch (err) {
      console.error('Error /eco:', err);
      // Send to error channel if configured
      try {
        if (interaction.guild && process.env.ERROR_CHANNEL_ID) {
          const ch = interaction.guild.channels.cache.get(process.env.ERROR_CHANNEL_ID);
          if (ch && ch.isTextBased()) ch.send(`⚠️ Error /eco by ${interaction.user.tag} : ${err.message}`).catch(()=>{});
        }
      } catch (e) {}
      return interaction.reply({ content: '❌ An error occurred while executing the command.', ephemeral: true });
    }
  }
};