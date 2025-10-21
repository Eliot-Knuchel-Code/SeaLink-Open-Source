// commands/mission.js (mis à jour avec auto-renew & historique)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ECO_PATH = path.join(DATA_DIR, 'eco.json');
const SHIPS_DIR = path.join(DATA_DIR, 'Ships');
const COOLDOWN_PATH = path.join(DATA_DIR, 'missions_cooldown.json');
const MISSIONS_CATALOG = path.join(DATA_DIR, 'missions_catalog.json');
const MISSIONS_HISTORY = path.join(DATA_DIR, 'missions_history.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(COOLDOWN_PATH)) fs.writeFileSync(COOLDOWN_PATH, JSON.stringify({}));
if (!fs.existsSync(MISSIONS_CATALOG)) fs.writeFileSync(MISSIONS_CATALOG, JSON.stringify([], null, 2));

if (!fs.existsSync(ECO_PATH)) fs.writeFileSync(ECO_PATH, JSON.stringify({}, null, 2));
if (!fs.existsSync(MISSIONS_HISTORY)) fs.writeFileSync(MISSIONS_HISTORY, JSON.stringify([], null, 2));


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

const INSURANCE_LEVELS = {
  basic: { reduceDamagePct: 50, costRatio: 0.20 },
  premium: { reduceDamagePct: 80, costRatio: 0.45 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mission')
    .setDescription('Envoie un bateau en mission (choisir mission spécifique optionnel)')
    .addStringOption(o => o.setName('boat').setDescription('ID instance du bateau à envoyer').setRequired(true))
    .addStringOption(o => o.setName('mission_id').setDescription('ID d\'une mission spécifique (voir /missions_list)').setRequired(false))
    .addStringOption(o => o.setName('type').setDescription('Type de mission (courte|commerce|risque) si pas de mission_id').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const boatId = interaction.options.getString('boat').trim();
    const missionId = interaction.options.getString('mission_id');
    const type = (interaction.options.getString('type') || 'courte').toLowerCase();

    const eco = read(ECO_PATH) || {};
  const catalog = readShipCatalog();
    const cooldowns = read(COOLDOWN_PATH) || {};
    const missionsCatalog = read(MISSIONS_CATALOG) || [];
    const history = read(MISSIONS_HISTORY) || [];
    const uid = interaction.user.id;

    if (!eco[uid] || !eco[uid].boats) return interaction.editReply({ content: '❌ Tu n\'as aucun bateau.', ephemeral: true });

    const boat = eco[uid].boats.find(b => b.instanceId === boatId);
    if (!boat) return interaction.editReply({ content: '❌ Bateau introuvable dans ta flotte.', ephemeral: true });

    // cooldown simple : 10 minutes par user (modifiable)
    const now = Date.now();
    const cd = cooldowns[uid] || 0;
    const COOLDOWN_MS = 10 * 60 * 1000;
    if (now < cd) {
      const remaining = Math.ceil((cd - now)/1000);
      return interaction.editReply({ content: `⏳ Cooldown actif. Réessaie dans ${remaining} secondes.`, ephemeral: true });
    }

    const model = catalog.find(m => m.id === boat.model);
    if (!model) return interaction.editReply({ content: '❌ Modèle du bateau introuvable dans le catalogue.', ephemeral: true });

    // Decide mission parameters
    let missionObj = null;
    if (missionId) {
      missionObj = missionsCatalog.find(m => m.id === missionId);
      if (!missionObj) return interaction.editReply({ content: '❌ Mission spécifique introuvable (vérifie /missions_list).', ephemeral: true });
    } else {
      // fallback dynamic mission based on type
      const typeMult = type === 'risque' ? 2.2 : type === 'commerce' ? 1.2 : 0.8;
      missionObj = {
        id: `dyn_${type}_${Date.now()}`,
        name: `Mission ${type}`,
        description: `Mission générée (${type}).`,
        baseReward: Math.round(model.capacity * 5),
        requiredCapacity: 0,
        riskMultiplier: typeMult
      };
    }

    // enforce capacity requirement
    if (model.capacity < (missionObj.requiredCapacity || 0)) {
      return interaction.editReply({ content: `❌ Ce bateau n'a pas la capacité requise pour cette mission (req: ${missionObj.requiredCapacity}).`, ephemeral: true });
    }

    // -----------------------------
    // Auto-renew insurance if expired and autoRenew is true
    // -----------------------------
    const userInsurance = (eco[uid] && eco[uid].insurance) ? eco[uid].insurance : {};
    const insuranceEntry = userInsurance[boatId];

    if (insuranceEntry && insuranceEntry.expiresAt && Date.now() >= insuranceEntry.expiresAt && insuranceEntry.autoRenew) {
      // Attempt auto-renew: compute cost based on model price and level
      try {
        const level = insuranceEntry.level || 'basic';
        const levelCfg = INSURANCE_LEVELS[level] || INSURANCE_LEVELS.basic;
        const basePrice = model ? model.price : 500;
        const renewCost = Math.ceil(basePrice * levelCfg.costRatio);

        if ((eco[uid].money || 0) >= renewCost) {
          eco[uid].money -= renewCost;
          insuranceEntry.expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
          insuranceEntry.boughtAt = Date.now();
          insuranceEntry.cost = renewCost;
          // write back
          eco[uid].insurance[boatId] = insuranceEntry;
          write(ECO_PATH, eco);
          // notify user in DM if possible (non-blocking)
          try {
            const user = await interaction.client.users.fetch(uid).catch(()=>null);
            if (user) {
              user.send(`🔁 Votre assurance (${level}) pour ${boat.name} a été automatiquement renouvelée pour ${renewCost} pièces.`).catch(()=>{});
            }
          } catch(e){}
        } else {
          // not enough funds: leave expired and will be treated as expired
        }
      } catch (e) {
        console.warn('Auto-renew failed:', e);
      }
    }

    // mission outcome logic
    const rndFactor = 0.7 + Math.random() * 0.8; // 0.7..1.5
    const baseReward = Math.round((missionObj.baseReward || 100) * rndFactor * (missionObj.riskMultiplier || 1));

    const successRoll = Math.random() * 100;
    const successChance = model.reliability || 85;
    const success = successRoll <= successChance;

    let damage = 0;
    if (!success) damage = Math.round(10 + Math.random() * 30);
    else if ((missionObj.riskMultiplier || 1) > 1.5) damage = Math.round(Math.random() * 10);

    // After possible auto-renew, recompute insurance entry reference
    const updatedEco = eco; // updated reference
    const updatedInsuranceEntry = (updatedEco[uid] && updatedEco[uid].insurance) ? updatedEco[uid].insurance[boatId] : null;

    let damageReduced = 0;
    if (updatedInsuranceEntry && updatedInsuranceEntry.expiresAt && Date.now() < updatedInsuranceEntry.expiresAt) {
      const reducePct = updatedInsuranceEntry.level === 'premium' ? INSURANCE_LEVELS.premium.reduceDamagePct : INSURANCE_LEVELS.basic.reduceDamagePct;
      damageReduced = Math.round(damage * (reducePct / 100));
      damage = Math.max(0, damage - damageReduced);
    }

    if (!eco[uid]) eco[uid] = { money: 0, boats: [] };
    if (success) eco[uid].money = (eco[uid].money || 0) + baseReward;
    boat.health = Math.max(0, (boat.health || 100) - damage);

    // write back and set cooldown
    cooldowns[uid] = now + COOLDOWN_MS;
    write(ECO_PATH, eco);
    write(COOLDOWN_PATH, cooldowns);

    // Log to mission history
    try {
      const entry = {
        id: `mh_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        userId: uid,
        userTag: interaction.user.tag,
        boatId: boat.instanceId,
        boatName: boat.name,
        missionId: missionObj.id,
        missionName: missionObj.name,
        success,
        reward: success ? baseReward : 0,
        damage,
        damageReduced,
        timestamp: new Date().toISOString()
      };
      history.push(entry);
      write(MISSIONS_HISTORY, history);
    } catch (e) {
      console.warn('Impossible d\'écrire dans missions_history:', e);
    }

    const embed = new EmbedBuilder()
      .setTitle(success ? '🎯 Mission accomplie' : '⚠️ Mission échouée')
      .setDescription(`${missionObj.name} — ${missionObj.description}`)
      .addFields(
        { name: 'Bateau', value: `${boat.name} (${boat.instanceId})`, inline: true },
        { name: 'Gain', value: `${baseReward}`, inline: true },
        { name: 'Dommages', value: `${damage}%`, inline: true },
        { name: 'Santé restante', value: `${boat.health}%`, inline: true }
      )
      .setTimestamp();

    if (damageReduced > 0) {
      embed.addFields({ name: 'Assurance', value: `Réduction des dégâts: ${damageReduced}% appliquée (police: ${updatedInsuranceEntry ? updatedInsuranceEntry.level : 'N/A'})`, inline: false });
    }

    // optional log
    try {
      const logId = process.env.LOG_CHANNEL_ID;
      if (logId && interaction.guild) {
        const ch = interaction.guild.channels.cache.get(logId);
        if (ch && ch.isTextBased()) {
          ch.send(`${interaction.user.tag} a lancé ${missionObj.name} avec ${boat.name} — succès: ${success} — reward: ${baseReward} — dmg: ${damage} (reduit ${damageReduced})`).catch(()=>{});
        }
      }
    } catch(e){}

    return interaction.editReply({ embeds: [embed] });
  }
};
