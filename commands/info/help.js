// commands/general/help.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la documentation interactive des commandes du bot'),

  async execute(interaction) {
    // Pages — adapte les descriptions / usages si tu veux
    const pages = [
      new EmbedBuilder()
        .setTitle('📘 Help — Maritime (1/6)')
        .setDescription('Commandes liées à la navigation, tracking et ports')
        .addFields(
          { name: '/track <MMSI>', value: 'Track un bateau réel (AIS + météo + carte)', inline: false },
          { name: '/port <nom>', value: 'Météo & marée d’un port (Google Geocode + OpenWeather + Marea)', inline: false },
          { name: '/ships', value: 'Catalogue des bateaux disponibles (pagination)', inline: false },
          { name: '/shipyard create|buy', value: 'Créer ou acheter un bateau via le chantier naval', inline: false },
          { name: '/radio join|play|stop|leave', value: 'Gérer la radio dans un channel vocal (stream URL)', inline: false }
        )
        .setColor('Blue')
        .setFooter({ text: 'SeaLink • Maritime' }),

      new EmbedBuilder()
        .setTitle('💼 Help — Économie & Banque (2/6)')
        .setDescription('Gestion des crédits, achats, récompenses et historique')
        .addFields(
          { name: '/balance', value: 'Affiche ton compte en banque maritime', inline: false },
          { name: '/buy-ship <id>', value: 'Acheter un bateau depuis le catalogue', inline: false },
          { name: '/daily', value: 'Récupère ta récompense quotidienne (24h cooldown)', inline: false },
          { name: '/weekly', value: 'Récupère ta récompense hebdo (7 jours)', inline: false },
          { name: '/notify on|off', value: 'Activer/désactiver notifications DM pour daily/weekly', inline: false }
        )
        .setColor('DarkAqua')
        .setFooter({ text: 'SeaLink • Économie' }),

      new EmbedBuilder()
        .setTitle('👥 Help — Équipage & Navires (3/6)')
        .setDescription('Créer des navires, gérer équipage et rôles exclusifs')
        .addFields(
          { name: '/crew-create <name>', value: 'Créer un navire + rôle Discord associé (capitaine = créateur)', inline: false },
          { name: '/crew-add <member> <ship>', value: 'Ajouter un matelot (seul le capitaine peut)', inline: false },
          { name: '/crew-remove <member> <ship>', value: 'Retirer un matelot (seul le capitaine)', inline: false },
          { name: '/crew-list <ship>', value: 'Lister les membres du navire (si implémenté)', inline: false }
        )
        .setColor('Green')
        .setFooter({ text: 'SeaLink • Équipage' }),

      new EmbedBuilder()
        .setTitle('🎮 Help — Jeux & Missions (4/6)')
        .setDescription('Mini-jeux maritimes qui alimentent l’économie')
        .addFields(
          { name: '/fish', value: 'Pêche — gagne des crédits aléatoires', inline: false },
          { name: '/explore', value: 'Explore la mer — ressources ou découverte de port', inline: false },
          { name: '/race <bet>', value: 'Course navale — pari (nécessite un bateau)', inline: false },
          { name: '/mission start|claim <id>', value: 'Lancer une mission / récupérer récompenses', inline: false }
        )
        .setColor('Purple')
        .setFooter({ text: 'SeaLink • Jeux' }),

      new EmbedBuilder()
        .setTitle('📓 Help — Logbook & Utilitaires (5/6)')
        .setDescription('Journal de bord personnel + commandes utilitaires')
        .addFields(
          { name: '/logbook-add <texte>', value: 'Ajouter une entrée dans ton journal de bord', inline: false },
          { name: '/logbook-remove <id>', value: 'Supprimer une entrée', inline: false },
          { name: '/logbook-list', value: 'Lister ton journal (pagination)', inline: false },
          { name: '/ping', value: 'Ping maritime (latence) — style thème mer', inline: false },
          { name: '/help', value: 'Ouvre cette aide interactive', inline: false }
        )
        .setColor('Orange')
        .setFooter({ text: 'SeaLink • Utilitaires' }),

      new EmbedBuilder()
        .setTitle('🔒 Help — Admin & Modération (6/6)')
        .setDescription('Commandes restreintes aux admins / moderateurs')
        .addFields(
          { name: '/automod', value: 'Configurer l’automod (mots interdits, liens, action)', inline: false },
          { name: '/mute <user> <durée>', value: 'Mute un membre (durée en minutes)', inline: false },
          { name: '/kick <user> [raison]', value: 'Kick un membre', inline: false },
          { name: '/ban <user> [raison]', value: 'Ban un membre', inline: false },
          { name: '/ticket <topic>', value: 'Créer un ticket support', inline: false },
          { name: '/status <online|update|offline> <channel>', value: 'Poster statut du bot & gérer presence', inline: false },
          { name: '/setversion <version> [announce_channel] [announce]', value: 'Mettre à jour la version (stockée en DB) et annoncer', inline: false },
          { name: '/embed', value: 'Créer un embed personnalisé (Admin only, upload support)', inline: false }
        )
        .setColor('Red')
        .setFooter({ text: 'SeaLink • Admin' })
    ];

    let pageIndex = 0;

    // Buttons
    const prevBtn = new ButtonBuilder().setCustomId('help_prev').setLabel('⬅️ Précédent').setStyle(ButtonStyle.Primary);
    const nextBtn = new ButtonBuilder().setCustomId('help_next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary);
    const firstBtn = new ButtonBuilder().setCustomId('help_first').setLabel('⏮️ Début').setStyle(ButtonStyle.Secondary);
    const lastBtn = new ButtonBuilder().setCustomId('help_last').setLabel('⏭️ Fin').setStyle(ButtonStyle.Secondary);
    const closeBtn = new ButtonBuilder().setCustomId('help_close').setLabel('❌ Fermer').setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(firstBtn, prevBtn, nextBtn, lastBtn, closeBtn);

    const reply = await interaction.reply({ embeds: [pages[pageIndex]], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      time: 120000 // 2 minutes
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Seul le demandeur peut utiliser ces contrôles.', ephemeral: true });
      }

      if (i.customId === 'help_prev') {
        pageIndex = pageIndex > 0 ? pageIndex - 1 : pages.length - 1;
        await i.update({ embeds: [pages[pageIndex]], components: [row] });
      } else if (i.customId === 'help_next') {
        pageIndex = pageIndex + 1 < pages.length ? pageIndex + 1 : 0;
        await i.update({ embeds: [pages[pageIndex]], components: [row] });
      } else if (i.customId === 'help_first') {
        pageIndex = 0;
        await i.update({ embeds: [pages[pageIndex]], components: [row] });
      } else if (i.customId === 'help_last') {
        pageIndex = pages.length - 1;
        await i.update({ embeds: [pages[pageIndex]], components: [row] });
      } else if (i.customId === 'help_close') {
        await i.update({ content: '🔒 Menu fermé.', embeds: [], components: [] });
        collector.stop();
      }
    });

    collector.on('end', async () => {
      // disable buttons
      const disabledRow = new ActionRowBuilder().addComponents(
        firstBtn.setDisabled(true),
        prevBtn.setDisabled(true),
        nextBtn.setDisabled(true),
        lastBtn.setDisabled(true),
        closeBtn.setDisabled(true)
      );
      try {
        await reply.edit({ components: [disabledRow] });
      } catch (err) {
        // ignore if message deleted
      }
    });
  }
};
