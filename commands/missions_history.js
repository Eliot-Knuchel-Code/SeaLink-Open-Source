// commands/missions_history.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MISSIONS_HISTORY = path.join(DATA_DIR, 'missions_history.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MISSIONS_HISTORY)) fs.writeFileSync(MISSIONS_HISTORY, JSON.stringify([], null, 2));

function read(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ return []; } }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('missions_history')
    .setDescription('Voir l\'historique des missions (votre historique, ou autre si admin)')
    .addUserOption(o => o.setName('user').setDescription('Voir l\'historique d\'un utilisateur (admin seulement)').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const history = read(MISSIONS_HISTORY) || [];

    // If requesting someone else, require ManageGuild or Administrator
    if (interaction.options.getUser('user') && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.editReply({ content: '❌ Permission requise pour voir l\'historique d\'un autre utilisateur (Manage Guild).', ephemeral: true });
    }

    const userEntries = history.filter(h => h.userId === targetUser.id).slice(-50).reverse(); // last 50 entries
    if (!userEntries || userEntries.length === 0) {
      return interaction.editReply({ content: `${targetUser.tag} n'a pas d'historique de missions.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📚 Historique des missions — ${targetUser.tag}`)
      .setColor('#1E90FF')
      .setTimestamp();

    userEntries.forEach(e => {
      const status = e.success ? '✅' : '❌';
      embed.addFields({
        name: `${status} ${e.missionName} — ${new Date(e.timestamp).toLocaleString()}`,
        value: `Bateau: ${e.boatName} (${e.boatId}) • Gain: ${e.reward} • Dmg: ${e.damage}% (réduit: ${e.damageReduced}%)`,
        inline: false
      });
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
