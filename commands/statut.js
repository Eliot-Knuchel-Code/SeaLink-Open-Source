const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Met à jour le statut du bot avec un embed visible par tous')
    .addStringOption(option =>
      option.setName('etat')
        .setDescription('Choisis le statut')
        .setRequired(true)
        .addChoices(
          { name: 'En ligne', value: 'en ligne' },
          { name: 'En mise à jour', value: 'mise à jour' },
          { name: 'Hors ligne', value: 'hors ligne' }
        )
    ),
  
  async execute(interaction) {
    const etat = interaction.options.getString('etat');
    const channel = interaction.channel;

    // Cherche le message embed existant du bot
    let statusMessage;
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      statusMessage = messages.find(msg =>
        msg.author.id === interaction.client.user.id &&
        msg.embeds.length > 0 &&
        msg.embeds[0].title === '📡 Statut du bot'
      );
    } catch (err) {
      console.error('Erreur lors de la récupération des messages :', err);
    }

    // Créer ou mettre à jour l'embed
    const embed = new EmbedBuilder()
      .setTitle('📡 Statut du bot')
      .setDescription(`Le bot est actuellement : **${etat}**`)
      .setColor(
        etat === 'en ligne' ? 'Green' :
        etat === 'mise à jour' ? 'Yellow' :
        'Red'
      )
      .setTimestamp();

    if (statusMessage) {
      await statusMessage.edit({ embeds: [embed] });
    } else {
      await channel.send({ embeds: [embed] });
    }

    await interaction.reply({ content: '✅ Statut mis à jour !', ephemeral: true });
  }
};
