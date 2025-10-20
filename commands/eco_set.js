// commands/eco_set.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ECO_PATH = path.join(__dirname, '..', 'data', 'eco.json');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ return {}; } }
function writeJson(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eco_set')
    .setDescription('Admin : set/add/remove de l\'argent pour un utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('Utilisateur').setRequired(true))
    .addStringOption(opt => opt.setName('action').setDescription('set | add | remove').setRequired(true)
      .addChoices(
        { name: 'set', value: 'set' },
        { name: 'add', value: 'add' },
        { name: 'remove', value: 'remove' }
      ))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Montant').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // seulement les gens avec ManageGuild
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const amount = interaction.options.getInteger('amount');

    if (amount < 0) return interaction.editReply('❌ Montant invalide.');

    const eco = readJson(ECO_PATH);
    if (!eco[target.id]) eco[target.id] = { money: 0, boats: [] };

    if (action === 'set') eco[target.id].money = amount;
    else if (action === 'add') eco[target.id].money = (eco[target.id].money || 0) + amount;
    else if (action === 'remove') eco[target.id].money = Math.max(0, (eco[target.id].money || 0) - amount);

    writeJson(ECO_PATH, eco);
    return interaction.editReply(`✅ ${action} exécuté pour ${target.tag}. Nouveau solde : ${eco[target.id].money} pièces.`);
  }
};
