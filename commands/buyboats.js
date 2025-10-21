// commands/buyboat.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SHIPS_DIR = path.join(DATA_DIR, 'Ships');
const ECO_PATH = path.join(DATA_DIR, 'eco.json');


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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buyboat')
    .setDescription('Acheter un bateau depuis le catalogue')
    .addStringOption(opt => opt.setName('model').setDescription('ID du modèle (ex: skiff_200)').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const modelId = interaction.options.getString('model').trim();
  const catalog = readShipCatalog();
    const eco = read(ECO_PATH) || {};
    const userId = interaction.user.id;

    const model = catalog.find(b => b.id === modelId);
    if (!model) return interaction.editReply({ content: '❌ Modèle introuvable dans le catalogue.', ephemeral: true });

    if (!eco[userId]) eco[userId] = { money: 0, boats: [] };
    if ((eco[userId].money || 0) < model.price) {
      return interaction.editReply({ content: `❌ Solde insuffisant. Prix : ${model.price} pièces. Ton solde : ${eco[userId].money || 0}.`, ephemeral: true });
    }

    // deduct money and add boat
    eco[userId].money -= model.price;
    const boatInstance = {
      instanceId: `b_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      model: model.id,
      name: model.model,
      health: 100,
      boughtAt: new Date().toISOString()
    };
    eco[userId].boats.push(boatInstance);
    write(ECO_PATH, eco);

    // log to server log channel if configured (non-blocking)
    try {
      const logId = process.env.LOG_CHANNEL_ID;
      if (logId && interaction.guild) {
        const ch = interaction.guild.channels.cache.get(logId);
        if (ch && ch.isTextBased()) ch.send(`🛒 ${interaction.user.tag} a acheté ${model.model} (${boatInstance.instanceId}) pour ${model.price} pièces.`).catch(()=>{});
      }
    } catch(e){}

    return interaction.editReply({ content: `✅ Achat réussi : **${model.model}** (id: ${boatInstance.instanceId}). Nouveau solde: ${eco[userId].money}.`, ephemeral: true });
  }
};
