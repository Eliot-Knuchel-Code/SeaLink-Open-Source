const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Reçoit les informations du bot en message privé'),

  async execute(interaction) {
    try {
      // Lien d'invitation du bot (remplace CLIENT_ID et les permissions selon ton bot)
      const CLIENT_ID = interaction.client.user.id;
      const INVITE_LINK = `https://discord.com/oauth2/authorize?client_id=1429402183568330837&permissions=4292493394836983&integration_type=0&scope=bot+applications.commands`;


      const versionJson = require('../version.json');
      const os = require('os');
      const githubUrl = 'https://github.com/Eliot-Knuchel-Code/SeaLink-Open-Source';
      const version = versionJson.version || '1.1.3';
      const guildCount = interaction.client.guilds.cache.size;
      const commandCount = interaction.client.commands.size;
      const memberCount = interaction.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      const uptimeMs = interaction.client.uptime;
      const uptimeSec = Math.floor(uptimeMs / 1000);
      const uptimeStr = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`;
      const sysUptimeSec = Math.floor(os.uptime());
      const sysUptimeStr = `${Math.floor(sysUptimeSec / 3600)}h ${Math.floor((sysUptimeSec % 3600) / 60)}m ${sysUptimeSec % 60}s`;

      // RAM info
      const usedMemBytes = process.memoryUsage().rss;
      const usedMemMB = (usedMemBytes / 1024 / 1024).toFixed(2);
      const totalMemBytes = os.totalmem();
      const totalMemMB = (totalMemBytes / 1024 / 1024).toFixed(2);
      const ramPercent = ((usedMemBytes / totalMemBytes) * 100).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle('ℹ️ SeaLink Bot Info')
        .setColor('#1E90FF')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
          { name: 'Bot Name', value: `${interaction.client.user.tag}`, inline: true },
          { name: 'Creator', value: 'Eliot KNUCHEL', inline: true },
          { name: 'Version', value: version, inline: true },
          { name: 'Servers', value: `${guildCount}`, inline: true },
          { name: 'Total Members', value: `${memberCount}`, inline: true },
          { name: 'Commands', value: `${commandCount}`, inline: true },
          { name: 'Bot Uptime', value: uptimeStr, inline: true },
          { name: 'System Uptime', value: sysUptimeStr, inline: true },
          { name: 'RAM Usage', value: `${usedMemMB} MB / ${totalMemMB} MB (${ramPercent}%)`, inline: true },
          { name: 'GitHub', value: `[View on GitHub](${githubUrl})`, inline: false },
          { name: 'Main Commands', value: '`/ping`, `/ports`, `/vessel`, `/tides`, `/seagame`, `/promote_top`, `/alert`, `/clock`', inline: false },
          { name: 'Invite Bot', value: `[Click here to invite SeaLink](${INVITE_LINK})`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Thank you for using SeaLink! ⛵️' });

      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Je t’ai envoyé les informations en message privé !', ephemeral: true });

    } catch (err) {
      console.error('Erreur commande /info :', err);
      await interaction.reply({ content: '❌ Impossible de t’envoyer un MP. Vérifie que tes MP sont ouverts.', ephemeral: true });
    }
  }
};
