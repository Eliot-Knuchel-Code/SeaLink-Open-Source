// commands/backupdata.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backupdata')
    .setDescription('Admin : crée une sauvegarde des fichiers data')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      ensureDir(BACKUP_DIR);
      const timestamp = new Date().toISOString().replace(/[:.]/g,'-');
      const files = ['eco.json','tides.json','ports.json','leaderboard.json','stats.json','daily.json'];
      const copied = [];
      files.forEach(f => {
        const src = path.join(DATA_DIR, f);
        if (fs.existsSync(src)) {
          const dest = path.join(BACKUP_DIR, `${f.replace('.json','')}_${timestamp}.json`);
          fs.copyFileSync(src, dest);
          copied.push(path.basename(dest));
        }
      });

      if (copied.length === 0) {
        return interaction.editReply('⚠️ Aucune donnée trouvée à sauvegarder.');
      }

      return interaction.editReply(`✅ Sauvegarde effectuée :\n${copied.join('\n')}`);
    } catch (err) {
      console.error('Erreur backup:', err);
      return interaction.editReply('❌ Erreur lors de la sauvegarde des données.');
    }
  }
};
