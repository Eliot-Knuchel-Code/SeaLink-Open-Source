const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crée un message embed personnalisé visible par tous (admins seulement)')
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
      option.setName('champ')
        .setDescription('Champ supplémentaire à ajouter dans l\'embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image')
        .setDescription('URL d\'une image pour l\'embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('couleur')
        .setDescription('Couleur de l\'embed (nom ou HEX, ex: GREEN ou #00ff00)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Vérification des permissions administrateur
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Vous devez être administrateur pour utiliser cette commande.', ephemeral: true });
    }

    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const champ = interaction.options.getString('champ');
    const image = interaction.options.getString('image');
    const couleur = interaction.options.getString('couleur') || 'Blue';

    const embed = new EmbedBuilder()
      .setTitle(titre)
      .setDescription(description)
      .setColor(couleur)
      .setTimestamp();

    if (champ) embed.addFields({ name: 'Info', value: champ });
    if (image) embed.setImage(image);

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Embed créé avec succès !', ephemeral: true });
  }
};
