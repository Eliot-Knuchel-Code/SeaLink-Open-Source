const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolereact')
    .setDescription('Crée un embed pour attribuer un rôle via réaction (admins seulement)')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Rôle à attribuer via la réaction')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('Emoji à utiliser pour la réaction')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('titre')
        .setDescription('Titre de l\'embed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description de l\'embed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('couleur')
        .setDescription('Couleur de l\'embed (nom ou HEX)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Vérification des permissions admin
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Vous devez être administrateur pour utiliser cette commande.', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const couleur = interaction.options.getString('couleur') || 'Blue';

    // Création de l'embed
    const embed = new EmbedBuilder()
      .setTitle(titre)
      .setDescription(description)
      .setColor(couleur)
      .setTimestamp();

    // Envoi de l'embed
    const message = await interaction.channel.send({ embeds: [embed] });

    // Ajout de la réaction
    await message.react(emoji);

    // Écouteur pour les réactions
    const filter = (reaction, user) => reaction.emoji.name === emoji && !user.bot;
    const collector = message.createReactionCollector({ filter, dispose: true });

    collector.on('collect', async (reaction, user) => {
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role).catch(console.error);
    });

    collector.on('remove', async (reaction, user) => {
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role).catch(console.error);
    });

    await interaction.reply({ content: '✅ Embed avec rôle réactif créé !', ephemeral: true });
  }
};
