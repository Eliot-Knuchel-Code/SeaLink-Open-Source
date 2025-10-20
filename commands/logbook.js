const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'data', 'logbook.json');

// Initialise le fichier si inexistant
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, JSON.stringify({}));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logbook')
    .setDescription('Carnet de bord personnel')
    
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Ajouter une entrée dans votre carnet')
      .addStringOption(option => option.setName('entry').setDescription('Texte de l’entrée').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Afficher vos entrées')
    )
    .addSubcommand(sub => sub
      .setName('clear')
      .setDescription('Effacer toutes vos entrées')
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const data = JSON.parse(fs.readFileSync(logFilePath));

    switch (subcommand) {
      case 'add':
        const entry = interaction.options.getString('entry');
        if (!data[userId]) data[userId] = [];
        data[userId].push({ date: new Date().toISOString(), text: entry });
        fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2));
        await interaction.reply(`✏️ Entrée ajoutée à votre carnet de bord !`);
        break;

      case 'list':
        if (!data[userId] || data[userId].length === 0) {
          await interaction.user.send('📖 Votre carnet de bord est vide.').catch(() => {
            interaction.reply({ content: '❌ Impossible de vous envoyer un MP. Vérifiez vos paramètres de confidentialité.', ephemeral: true });
          });
          return;
        }

        const entriesPerPage = 10;
        const pages = [];
        for (let i = 0; i < data[userId].length; i += entriesPerPage) {
          const pageEntries = data[userId].slice(i, i + entriesPerPage);
          const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username} - Carnet de bord`)
            .setDescription(pageEntries.map((e, idx) => `${i + idx + 1}. [${new Date(e.date).toLocaleString()}] ${e.text}`).join('\n'))
            .setColor('Blue')
            .setFooter({ text: `Page ${Math.floor(i/entriesPerPage)+1} / ${Math.ceil(data[userId].length/entriesPerPage)}` });
          pages.push(embed);
        }

        let currentPage = 0;
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary)
          );

        const msg = await interaction.user.send({ embeds: [pages[currentPage]], components: [row] }).catch(() => {
          interaction.reply({ content: '❌ Impossible de vous envoyer un MP. Vérifiez vos paramètres de confidentialité.', ephemeral: true });
        });
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', i => {
          if (i.user.id !== userId) return;
          if (i.customId === 'prev') {
            currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
          } else if (i.customId === 'next') {
            currentPage = currentPage < pages.length - 1 ? currentPage + 1 : 0;
          }
          i.update({ embeds: [pages[currentPage]] });
        });

        collector.on('end', () => {
          msg.edit({ components: [] }).catch(() => {});
        });

        break;

      case 'clear':
        data[userId] = [];
        fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2));
        await interaction.reply('🗑️ Votre carnet de bord a été effacé.');
        break;

      default:
        await interaction.reply('❌ Sous-commande inconnue.');
    }
  }
};
