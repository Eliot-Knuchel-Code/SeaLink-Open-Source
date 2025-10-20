// commands/missions_list.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MISSIONS_CATALOG = path.join(DATA_DIR, 'missions_catalog.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MISSIONS_CATALOG)) fs.writeFileSync(MISSIONS_CATALOG, JSON.stringify([], null, 2));

function read(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ return []; } }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('missions_list')
    .setDescription('Liste les missions disponibles')
    .addIntegerOption(opt => opt.setName('page').setDescription('Page (10 missions par page)').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const missions = read(MISSIONS_CATALOG);
    if (!missions || missions.length === 0) {
      return interaction.editReply('⚠️ Aucun mission disponible pour l’instant.');
    }

    const page = Math.max(1, interaction.options.getInteger('page') || 1);
    const pageSize = 10;
    const totalPages = Math.ceil(missions.length / pageSize);
    const p = Math.min(page, totalPages);
    const slice = missions.slice((p-1)*pageSize, p*pageSize);

    const embed = new EmbedBuilder()
      .setTitle(`📜 Catalogue des missions — page ${p}/${totalPages}`)
      .setColor('#1E90FF')
      .setTimestamp();

    slice.forEach(m => {
      const reward = m.baseReward || 'N/A';
      const req = m.requiredCapacity ? `${m.requiredCapacity}` : 'Aucune';
      const risk = m.riskMultiplier ? `${m.riskMultiplier}x` : 'N/A';
      embed.addFields({
        name: `${m.name} — \`${m.id}\``,
        value: `${m.description}\n**Gain de base:** ${reward} • **Capacité req:** ${req} • **Risque:** ${risk}`,
        inline: false
      });
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
