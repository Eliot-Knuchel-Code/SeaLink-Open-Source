// commands/ticket.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Créer ou gérer un ticket de support')
    .addSubcommand(sub => sub.setName('open').setDescription('Ouvrir un nouveau ticket')),

  async execute(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;

    // Cherche ou crée la catégorie "Tickets Support"
    let category = guild.channels.cache.find(c => c.name === 'Tickets Support' && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({
        name: 'Tickets Support',
        type: ChannelType.GuildCategory,
      });
    }

    // Vérifie si l'utilisateur a déjà un ticket ouvert
    const existing = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase()}`);
    if (existing) return interaction.reply({ content: '❌ Tu as déjà un ticket ouvert.', ephemeral: true });

    // Crée le salon ticket
    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: guild.roles.cache.find(r => r.permissions.has(PermissionFlagsBits.ManageGuild))?.id || '',
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        }
      ],
    });

    // Embed + bouton Fermer le ticket
    const embed = new EmbedBuilder()
      .setTitle('Ticket de support')
      .setDescription(`Bonjour ${user}, bienvenue dans ton ticket. Cliquez sur le bouton ci-dessous pour fermer le ticket.`)
      .setColor(0x1D82B6)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket créé : ${channel}`, ephemeral: true });

    // Collecteur pour gérer le bouton
    const collector = channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 0 });

    collector.on('collect', async i => {
      if (i.customId === 'close_ticket') {
        // Vérifie si c'est l'utilisateur ou admin
        if (i.user.id === user.id || i.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await channel.send('🔒 Fermeture du ticket...');
          setTimeout(() => channel.delete(), 1000);
        } else {
          await i.reply({ content: '❌ Tu ne peux pas fermer ce ticket.', ephemeral: true });
        }
      }
    });
  }
};
