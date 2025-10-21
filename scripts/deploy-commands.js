// deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
  console.error('❌ CLIENT_ID, GUILD_ID ou TOKEN manquant dans .env');
  process.exit(1);
}

function reorderOptionsArray(options) {
  // Si pas d'options ou pas un tableau, rien à faire
  if (!Array.isArray(options)) return options;

  // On doit traiter récursivement : dans un même niveau, on place
  // les options required=true avant les autres, mais on laisse l'ordre
  // relatif entre required entre eux et non-required entre eux.
  const required = [];
  const optional = [];

  for (const opt of options) {
    // Si l'option a elle-même des options (ex: subcommand, subcommand group), on la réordonne récursivement
    if (opt.options) {
      opt.options = reorderOptionsArray(opt.options);
    }
    if (opt.required === true) required.push(opt);
    else optional.push(opt);
  }

  return required.concat(optional);
}

function reorderCommand(cmdJson) {
  // On réordonne en place tous les niveaux possibles
  if (cmdJson.options) {
    cmdJson.options = reorderOptionsArray(cmdJson.options);
  }
  return cmdJson;
}

(async () => {
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.existsSync(commandsPath)
      ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
      : [];

    if (commandFiles.length === 0) {
      console.warn('⚠️ Aucun fichier de commande trouvé dans ./commands');
    }

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      // Certains exports utilisent module.exports = [ ... ] (tableau) : gère ce cas
      if (Array.isArray(command)) {
        for (const c of command) {
          if (c.data) commands.push(c.data.toJSON());
        }
      } else if (command.data) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(`⚠️ Le fichier ${file} n'exporte pas de .data. Ignoré.`);
      }
    }

    // Clone pour transformation et logging
    const transformed = commands.map((c, idx) => {
      const before = JSON.stringify(c);
      const after = JSON.stringify(reorderCommand(c));
      const changed = before !== after;
      return { json: c, changed };
    });

    // Logging résumé
    const changedCount = transformed.filter(t => t.changed).length;
    console.log(`🔧 Réordonnage automatique des options terminé. ${changedCount}/${transformed.length} commandes modifiées si nécessaire.`);

    // Affiche la liste des commandes modifiées (optionnel mais utile)
    transformed.forEach((t, i) => {
      if (t.changed) {
        console.log(` - Command index ${i} (${commands[i].name}) : options réordonnées`);
      }
    });

    // Prépare pour l'envoi
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    console.log(`🚀 Déploiement de ${transformed.length} commandes globales...`);
    // Si tu veux plutôt déployer en guild (pour test) : Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    // Ici on déploie globalement :
    const result = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: transformed.map(t => t.json) }
    );

    console.log('✅ Déploiement terminé.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du déploiement :', error);
    // Si l'erreur contient des détails d'API
    if (error?.rawError) {
      console.error('rawError:', JSON.stringify(error.rawError, null, 2));
    }
    process.exit(1);
  }
})();
