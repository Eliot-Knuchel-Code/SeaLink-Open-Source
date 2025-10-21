// deploy-commands.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
  console.error('❌ CLIENT_ID, GUILD_ID or TOKEN missing in .env');
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
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    // Önce mevcut komutları sil
    const existing = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`🗑️ Deleting ${existing.length} existing guild commands...`);
      for (const cmd of existing) {
        let deleted = false;
        let attempts = 0;
        while (!deleted && attempts < 5) {
          try {
            await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, cmd.id));
            console.log(` - Deleted: ${cmd.name}`);
            deleted = true;
          } catch (err) {
            attempts++;
            if (err?.code === 20028 || (err?.rawError && err.rawError.code === 20028)) { // Discord rate limit
              console.warn(`⏳ Rate limited while deleting ${cmd.name}, waiting 5s...`);
              await new Promise(res => setTimeout(res, 5000));
            } else {
              console.error(`❌ Failed to delete command ${cmd.name} (attempt ${attempts}):`, err);
              await new Promise(res => setTimeout(res, 1000));
            }
          }
        }
        await new Promise(res => setTimeout(res, 500)); // 500ms gecikme
      }
      console.log('✅ All existing guild commands deleted.');
    }

    // Komutları yükle
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.existsSync(commandsPath)
      ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
      : [];

    if (commandFiles.length === 0) {
      console.warn('⚠️ No command files found in ./commands');
    }

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if (Array.isArray(command)) {
        for (const c of command) {
          if (c.data) commands.push(c.data.toJSON());
        }
      } else if (command.data) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(`⚠️ The file ${file} does not export .data. Ignored.`);
      }
    }

    // Clone pour transformation et logging
    const transformed = commands.map((c, idx) => {
      const before = JSON.stringify(c);
      const after = JSON.stringify(reorderCommand(c));
      const changed = before !== after;
      return { json: c, changed };
    });

    // Logging summary
    const changedCount = transformed.filter(t => t.changed).length;
    console.log(`🔧 Automatic option reordering complete. ${changedCount}/${transformed.length} commands modified if needed.`);
    transformed.forEach((t, i) => {
      if (t.changed) {
        console.log(` - Command index ${i} (${commands[i].name}): options reordered`);
      }
    });

    console.log(`🚀 Deploying ${transformed.length} commands to server ${GUILD_ID}...`);
    const result = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: transformed.map(t => t.json) }
    );
    console.log('✅ Guild-only deploy complete. Global deploy removed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during deployment:', error);
    if (error?.rawError) {
      console.error('rawError:', JSON.stringify(error.rawError, null, 2));
    }
    process.exit(1);
  }
})();
