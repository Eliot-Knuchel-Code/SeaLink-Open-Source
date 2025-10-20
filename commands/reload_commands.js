// commands/reload_commands.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload_commands')
    .setDescription('Admin : recharge les fichiers de commandes sans redémarrage')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const commandsPath = path.join(__dirname);
    try {
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

      // clear previous commands collection
      interaction.client.commands.clear();

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // clear require cache
        delete require.cache[require.resolve(filePath)];
        try {
          const command = require(filePath);
          if (command && command.data && command.execute) {
            interaction.client.commands.set(command.data.name, command);
          } else {
            console.warn(`[WARN] Commande invalide ignorée : ${file}`);
          }
        } catch (err) {
          console.error(`Erreur chargement ${file}:`, err);
        }
      }

      return interaction.editReply('✅ Rechargement des commandes terminé.');
    } catch (err) {
      console.error('Erreur reload commands:', err);
      return interaction.editReply(`❌ Erreur lors du rechargement des commandes : ${err.message}`);
    }
  }
};
