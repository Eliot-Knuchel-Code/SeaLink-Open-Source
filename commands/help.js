const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const COMMANDS_FILE = path.join(__dirname, '..', 'data', 'commands.json');
const COMMANDS_PER_PAGE = 8; // nombre de commandes par page

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher toutes les commandes du serveur'),

  async execute(interaction) {
    let allCommands = [];
    try {
      allCommands = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'));
    } catch (err) {
      return interaction.reply('❌ Impossible de charger la liste des commandes.');
    }

    const isAdmin = interaction.member.permissions.has('Administrator');

    // Filtre les commandes adminOnly pour les non-admin
    const visibleCommands = allCommands.filter(cmd => !cmd.adminOnly || isAdmin);

    // Regroupe par catégorie
    const categories = {};
    visibleCommands.forEach(cmd => {
      if (!categories[cmd.category]) categories[cmd.category] = [];
      categories[cmd.category].push(cmd);
    });

    const pages = [];
    for (const [category, cmds] of Object.entries(categories)) {
      for (let i = 0; i < cmds.length; i += COMMANDS_PER_PAGE) {
        const slice = cmds.slice(i, i + COMMANDS_PER_PAGE);
        const embed = new EmbedBuilder()
          .setTitle(`🛠️ Commandes - ${category}`)
          .setColor('Blue')
          .setFooter({ text: `Page ${pages.length + 1}` });

        slice.forEach(cmd => {
          embed.addFields({ name: `/${cmd.name}`, value: cmd.description, inline: false });
        });

        pages.push(embed);
      }
    }

    if (pages.length === 0) {
      return interaction.reply('❌ Aucune commande disponible.');
    }

    let currentPage = 0;

    // Crée les boutons pour naviguer
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Précédent').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.reply({ embeds: [pages[currentPage]], components: [row], fetchReply: true });

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ Ce n'est pas votre pagination.", ephemeral: true });
      }

      if (i.customId === 'prev') {
        currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
      } else if (i.customId === 'next') {
        currentPage = currentPage < pages.length - 1 ? currentPage + 1 : 0;
      }

      i.update({ embeds: [pages[currentPage]] });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Précédent').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary).setDisabled(true)
      );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};
