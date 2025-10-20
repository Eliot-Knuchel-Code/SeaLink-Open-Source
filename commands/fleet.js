// commands/fleet.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ECO_PATH = path.join(__dirname, '..', 'data', 'eco.json');

function read(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ return {}; } }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fleet')
    .setDescription('Affiche votre flotte ou la flotte d’un autre utilisateur')
    .addUserOption(o => o.setName('user').setDescription('Voir la flotte d’un utilisateur (optionnel)')),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    const target = interaction.options.getUser('user') || interaction.user;
    const eco = read(ECO_PATH);
    const userData = eco[target.id];

    if (!userData || !userData.boats || userData.boats.length === 0) {
      return interaction.editReply({ content: `${target.tag} n'a aucun bateau pour l'instant.` });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚢 Flotte de ${target.tag}`)
      .setColor('#1E90FF')
      .setTimestamp();

    userData.boats.forEach((b, idx) => {
      embed.addFields({
        name: `${idx+1}. ${b.name} (${b.instanceId})`,
        value: `Santé: ${b.health}% • Modèle: ${b.model} • Acheté: ${new Date(b.boughtAt).toLocaleDateString()}`,
        inline: false
      });
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
