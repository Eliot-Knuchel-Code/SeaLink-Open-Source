// commands/insurance.js (mis à jour)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ECO_PATH = path.join(DATA_DIR, 'eco.json');
const SHIPS_DIR = path.join(DATA_DIR, 'Ships');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ECO_PATH)) fs.writeFileSync(ECO_PATH, JSON.stringify({}, null, 2));



function readShipCatalog() {
  // Reads all ship model files from Ships subfolders
  const ships = [];
  if (fs.existsSync(SHIPS_DIR)) {
    const categories = fs.readdirSync(SHIPS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const cat of categories) {
      const catPath = path.join(SHIPS_DIR, cat.name);
      const files = fs.readdirSync(catPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(catPath, file), 'utf8'));
          ships.push(data);
        } catch {}
      }
    }
  }
  return ships;
}

// Insurance levels config
const LEVELS = {
  basic: { reduceDamagePct: 50, costRatio: 0.20 },    // réduit 50% des dégâts; coût 20% du prix du bateau
  premium: { reduceDamagePct: 80, costRatio: 0.45 }   // réduit 80% des dégâts; coût 45% du prix du bateau
};

// Minimum health required to buy insurance (ex: 50%)
const MIN_HEALTH_FOR_INSURANCE = 50;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insurance')
    .setDescription('Gérer les assurances de vos bateaux')
    .addSubcommand(s => s.setName('buy').setDescription('Acheter une assurance pour un bateau')
      .addStringOption(o => o.setName('boat').setDescription('ID instance du bateau').setRequired(true))
      .addStringOption(o => o.setName('level').setDescription('Niveau: basic ou premium').setRequired(true))
      .addBooleanOption(o => o.setName('auto_renew').setDescription('Activer le renouvellement automatique (auto-renew) : true/false').setRequired(false))
    )
    .addSubcommand(s => s.setName('status').setDescription('Voir vos assurances actives'))
    .addSubcommand(s => s.setName('cancel').setDescription('Annuler l’assurance d’un bateau')
      .addStringOption(o => o.setName('boat').setDescription('ID instance du bateau').setRequired(true))
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const eco = read(ECO_PATH) || {};
  const catalog = readShipCatalog();
    const uid = interaction.user.id;

    if (!eco[uid]) eco[uid] = { money: 0, boats: [], insurance: {} };

    if (sub === 'buy') {
      const boatId = interaction.options.getString('boat').trim();
      const level = (interaction.options.getString('level') || '').toLowerCase();
      const autoRenew = interaction.options.getBoolean('auto_renew') || false;

      if (!LEVELS[level]) return interaction.editReply({ content: '❌ Niveau invalide. Choisis `basic` ou `premium`.', ephemeral: true });

      const boat = (eco[uid].boats || []).find(b => b.instanceId === boatId);
      if (!boat) return interaction.editReply({ content: '❌ Bateau introuvable dans votre flotte.', ephemeral: true });

      // Block purchase if health too low
      const health = typeof boat.health === 'number' ? boat.health : 100;
      if (health < MIN_HEALTH_FOR_INSURANCE) {
        return interaction.editReply({ content: `❌ Impossible d'acheter une assurance : la santé du bateau est ${health}%. Réparez-le (commande /repair) avant d'acheter. Seuil minimal : ${MIN_HEALTH_FOR_INSURANCE}%.`, ephemeral: true });
      }

      // find base price from catalog
      const model = catalog.find(m => m.id === boat.model);
      const basePrice = model ? model.price : 500;
      const cost = Math.ceil(basePrice * LEVELS[level].costRatio);

      if ((eco[uid].money || 0) < cost) {
        return interaction.editReply({ content: `❌ Solde insuffisant. Assurance coûte ${cost} pièces. Ton solde: ${eco[uid].money || 0}`, ephemeral: true });
      }

      // buy insurance (duration fixed 30 days)
      const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
      eco[uid].money -= cost;
      if (!eco[uid].insurance) eco[uid].insurance = {};
      eco[uid].insurance[boatId] = { level, expiresAt, boughtAt: Date.now(), cost, autoRenew };

      write(ECO_PATH, eco);

      // optional log
      try {
        const logId = process.env.LOG_CHANNEL_ID;
        if (logId && interaction.guild) {
          const ch = interaction.guild.channels.cache.get(logId);
          if (ch && ch.isTextBased()) ch.send(`🛡️ ${interaction.user.tag} a acheté une assurance (${level})${autoRenew ? ' (auto-renew activé)' : ''} pour ${boat.name} (${boat.instanceId}) pour ${cost} pièces.`).catch(()=>{});
        }
      } catch(e){}

      return interaction.editReply({ content: `✅ Assurance ${level} achetée pour ${boat.name}. Coût: ${cost} pièces. Durée: 30 jours. Auto-renew: ${autoRenew ? 'activé' : 'désactivé'}.`, ephemeral: true });
    }

    if (sub === 'status') {
      const userInsurance = eco[uid].insurance || {};
      const keys = Object.keys(userInsurance);
      if (keys.length === 0) return interaction.editReply({ content: '📭 Vous n\'avez aucune assurance active.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Assurances de ${interaction.user.username}`)
        .setColor('#00BFFF')
        .setTimestamp();

      keys.forEach(bid => {
        const ins = userInsurance[bid];
        const boat = (eco[uid].boats || []).find(b => b.instanceId === bid);
        const name = boat ? boat.name : bid;
        const expires = new Date(ins.expiresAt).toLocaleString();
        embed.addFields({ name: name, value: `Niveau: ${ins.level} • Expire: ${expires} • Coût: ${ins.cost} • Auto-renew: ${ins.autoRenew ? 'oui' : 'non'}`, inline: false });
      });

      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'cancel') {
      const boatId = interaction.options.getString('boat').trim();
      const userInsurance = eco[uid].insurance || {};
      if (!userInsurance[boatId]) return interaction.editReply({ content: '❌ Aucune assurance trouvée pour ce bateau.', ephemeral: true });

      // cancel: no refund (simple)
      delete userInsurance[boatId];
      eco[uid].insurance = userInsurance;
      write(ECO_PATH, eco);

      return interaction.editReply({ content: `✅ Assurance pour ${boatId} annulée. Pas de remboursement automatique.`, ephemeral: true });
    }

    return interaction.editReply({ content: '❌ Sous-commande inconnue.', ephemeral: true });
  }
};
