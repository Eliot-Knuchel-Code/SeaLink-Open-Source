// commands/eco.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ECO_PATH = path.join(DATA_DIR, 'eco.json');
const BOATS_PATH = path.join(DATA_DIR, 'boats.json');

// Ensure data folder & files
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ECO_PATH)) fs.writeFileSync(ECO_PATH, JSON.stringify({}, null, 2));
if (!fs.existsSync(BOATS_PATH)) fs.writeFileSync(BOATS_PATH, JSON.stringify([], null, 2));

/**
 * Utilitaires de lecture / écriture JSON
 */
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return null; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

/**
 * Assure la structure utilisateur dans eco.json
 */
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

/**
 * Calcule un bonus simple basé sur la flotte (ex: capacité des modèles)
 * Nous lisons le catalogue boats.json pour récupérer les stats si dispo.
 */
function calculateFleetBonus(userData) {
  const catalog = readJson(BOATS_PATH) || [];
  if (!userData || !Array.isArray(userData.boats)) return 0;
  let bonus = 0;
  for (const b of userData.boats) {
    const model = catalog.find(m => m.id === b.model || m.model === b.model);
    if (model && model.price) {
      // Exemple : bonus = floor(price / 100) — ajustable
      bonus += Math.floor((model.price || 0) / 100);
    }
  }
  return bonus;
}

/**
 * Cherche un modèle dans le catalogue par id ou par nom (insensible à la casse)
 */
function findModel(catalog, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  return catalog.find(m => (m.id && m.id.toLowerCase() === q) || (m.model && m.model.toLowerCase() === q));
}

/**
 * Génère un nouvel instanceId pour un bateau acheté
 */
function genInstanceId(modelId) {
  return `b_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * Commande principale
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Gère ton économie maritime (balance, flotte, boutique, achat, donner, leaderboard)')
    .addSubcommand(sub => sub.setName('balance').setDescription('Voir ton solde'))
    .addSubcommand(sub => sub.setName('boats').setDescription('Voir ta flotte'))
    .addSubcommand(sub => sub.setName('shop').setDescription('Voir la boutique (catalogue de bateaux)'))
    .addSubcommand(sub => sub.setName('buy').setDescription('Acheter un bateau depuis la boutique')
      .addStringOption(opt => opt.setName('model').setDescription('ID du modèle ou nom').setRequired(true)))
    .addSubcommand(sub => sub.setName('give').setDescription('Donner de l\'argent à un utilisateur')
      .addUserOption(opt => opt.setName('user').setDescription('Utilisateur').setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Montant à donner').setRequired(true)))
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('Voir le top 10 des soldes')),
  
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    // load persistent files
    const ecoData = readJson(ECO_PATH) || {};
    const catalog = readJson(BOATS_PATH) || [];

    const userId = interaction.user.id;
    const me = ensureUser(ecoData, userId);

    try {
      // ----------------------------
      // BALANCE
      // ----------------------------
      if (sub === 'balance') {
        const bonus = calculateFleetBonus(me);
        const embed = new EmbedBuilder()
          .setTitle(`${interaction.user.username} — Solde`)
          .setDescription(`💰 Solde actuel : **${me.money || 0}** pièces`)
          .addFields(
            { name: 'Bonus flotte', value: `${bonus} (calculé depuis vos bateaux)`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // ----------------------------
      // BOATS (flotte)
      // ----------------------------
      if (sub === 'boats') {
        if (!me.boats || me.boats.length === 0) {
          return interaction.reply({ content: `🚢 ${interaction.user.username}, tu n'as aucun bateau pour le moment.` });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🚢 Flotte de ${interaction.user.username}`)
          .setTimestamp();

        me.boats.forEach((b, idx) => {
          const model = catalog.find(m => m.id === b.model || m.model === b.model);
          const modelName = b.name || (model ? model.model : b.model);
          const info = [
            `ID: \`${b.instanceId}\``,
            `Modèle: ${modelName}`,
            `Santé: ${b.health ?? 100}%`,
            `Acheté: ${new Date(b.boughtAt).toLocaleString()}`
          ].join(' • ');
          embed.addFields({ name: `${idx + 1}. ${modelName}`, value: info, inline: false });
        });

        return interaction.reply({ embeds: [embed] });
      }

      // ----------------------------
      // SHOP (catalogue)
      // ----------------------------
      if (sub === 'shop') {
        if (!catalog || catalog.length === 0) {
          return interaction.reply({ content: '🛒 La boutique est vide pour le moment.' });
        }

        const embed = new EmbedBuilder()
          .setTitle('🛒 Boutique — Catalogue des bateaux')
          .setDescription('Utilise `/eco buy model:<id|name>` pour acheter un bateau.')
          .setTimestamp();

        // show up to first 10 models
        catalog.slice(0, 10).forEach(m => {
          const line = `Prix: **${m.price ?? 'N/A'}** • Capacité: ${m.capacity ?? 'N/A'} • ID: \`${m.id}\``;
          embed.addFields({ name: `${m.model}`, value: `${m.description || ''}\n${line}`, inline: false });
        });

        if (catalog.length > 10) embed.setFooter({ text: `Affiche ${Math.min(10, catalog.length)} sur ${catalog.length} modèles` });

        return interaction.reply({ embeds: [embed] });
      }

      // ----------------------------
      // BUY (achat) — compatible avec le catalogue utilisé par buyboat etc.
      // ----------------------------
      if (sub === 'buy') {
        const query = interaction.options.getString('model').trim();
        const found = findModel(catalog, query);

        if (!found) {
          return interaction.reply({ content: '❌ Modèle introuvable dans la boutique. Vérifie l\'ID ou le nom.', ephemeral: true });
        }

        const price = found.price ?? 0;
        // initialize user struct if missing
        ensureUser(ecoData, userId);

        if ((ecoData[userId].money || 0) < price) {
          return interaction.reply({ content: `❌ Solde insuffisant. Prix: ${price} pièces. Ton solde: ${ecoData[userId].money || 0}`, ephemeral: true });
        }

        // Deduct money and add boat instance (structure compatible)
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

        // notify log channel if configured (non-blocking)
        try {
          const logId = process.env.LOG_CHANNEL_ID;
          if (logId && interaction.guild) {
            const ch = interaction.guild.channels.cache.get(logId);
            if (ch && ch.isTextBased()) {
              ch.send(`🛒 ${interaction.user.tag} a acheté ${found.model} (${instance.instanceId}) pour ${price} pièces.`).catch(()=>{});
            }
          }
        } catch (e) { /* ignore */ }

        return interaction.reply({ content: `✅ Achat réussi : **${found.model}** (id: \`${instance.instanceId}\`). Nouveau solde : ${ecoData[userId].money}.`, ephemeral: true });
      }

      // ----------------------------
      // GIVE (transfer d'argent)
      // ----------------------------
      if (sub === 'give') {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (!target) return interaction.reply({ content: '❌ Utilisateur invalide.', ephemeral: true });
        if (!Number.isInteger(amount) || amount <= 0) return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });

        ensureUser(ecoData, userId);
        if ((ecoData[userId].money || 0) < amount) {
          return interaction.reply({ content: '❌ Tu n\'as pas assez d\'argent pour effectuer ce transfert.', ephemeral: true });
        }

        ensureUser(ecoData, target.id);
        ecoData[userId].money -= amount;
        ecoData[target.id].money = (ecoData[target.id].money || 0) + amount;
        writeJson(ECO_PATH, ecoData);

        // optional log
        try {
          const logId = process.env.LOG_CHANNEL_ID;
          if (logId && interaction.guild) {
            const ch = interaction.guild.channels.cache.get(logId);
            if (ch && ch.isTextBased()) ch.send(`💸 ${interaction.user.tag} a donné ${amount} pièces à ${target.tag}`).catch(()=>{});
          }
        } catch(e){}

        return interaction.reply({ content: `✅ ${amount} pièces transférées à ${target.username}.`, ephemeral: true });
      }

      // ----------------------------
      // LEADERBOARD
      // ----------------------------
      if (sub === 'leaderboard') {
        // build array from ecoData
        const arr = Object.entries(ecoData).map(([uid, d]) => ({ id: uid, money: d.money || 0 }));
        arr.sort((a, b) => b.money - a.money);
        const top = arr.slice(0, 10);

        if (top.length === 0) return interaction.reply({ content: '📊 Aucun utilisateur dans l\'économie pour l’instant.' });

        const embed = new EmbedBuilder()
          .setTitle('🏆 Top 10 — Richest captains')
          .setTimestamp();

        for (let i = 0; i < top.length; i++) {
          const t = top[i];
          // try to fetch user tag (best-effort, non-blocking)
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
      return interaction.reply({ content: '❌ Sous-commande inconnue.', ephemeral: true });

    } catch (err) {
      console.error('Erreur /eco:', err);
      // send to error channel if configured
      try {
        if (interaction.guild && process.env.ERROR_CHANNEL_ID) {
          const ch = interaction.guild.channels.cache.get(process.env.ERROR_CHANNEL_ID);
          if (ch && ch.isTextBased()) ch.send(`⚠️ Erreur /eco par ${interaction.user.tag} : ${err.message}`).catch(()=>{});
        }
      } catch (e) {}
      return interaction.reply({ content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    }
  }
};
