// commands/admin/embed.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer un embed personnalisé (Admin seulement)')
    // options de base
    .addStringOption(opt => opt.setName('title').setDescription('Titre de l\'embed').setRequired(false))
    .addStringOption(opt => opt.setName('description').setDescription('Description (texte principal)').setRequired(false))
    .addStringOption(opt => opt.setName('color').setDescription('Couleur HEX (ex: #00FFAA) ou nom (Blue)').setRequired(false))
    .addStringOption(opt => opt.setName('footer').setDescription('Texte du footer').setRequired(false))
    .addStringOption(opt => opt.setName('image').setDescription('URL d\'une image (embed image)').setRequired(false))
    .addAttachmentOption(opt => opt.setName('image_file').setDescription('Uploader une image (prioritaire sur l’URL)').setRequired(false))
    .addStringOption(opt => opt.setName('thumbnail').setDescription('URL d\'une miniature (thumbnail)').setRequired(false))
    .addAttachmentOption(opt => opt.setName('thumbnail_file').setDescription('Uploader une miniature (prioritaire sur l’URL)').setRequired(false))
    .addChannelOption(opt => opt.setName('channel').setDescription('Salon où poster l\'embed (optionnel)').setRequired(false))
    // champs répétables (jusqu'à 5)
    .addStringOption(opt => opt.setName('field1_name').setDescription('Champ 1 - titre').setRequired(false))
    .addStringOption(opt => opt.setName('field1_value').setDescription('Champ 1 - contenu').setRequired(false))
    .addBooleanOption(opt => opt.setName('field1_inline').setDescription('Champ 1 - inline ?').setRequired(false))

    .addStringOption(opt => opt.setName('field2_name').setDescription('Champ 2 - titre').setRequired(false))
    .addStringOption(opt => opt.setName('field2_value').setDescription('Champ 2 - contenu').setRequired(false))
    .addBooleanOption(opt => opt.setName('field2_inline').setDescription('Champ 2 - inline ?').setRequired(false))

    .addStringOption(opt => opt.setName('field3_name').setDescription('Champ 3 - titre').setRequired(false))
    .addStringOption(opt => opt.setName('field3_value').setDescription('Champ 3 - contenu').setRequired(false))
    .addBooleanOption(opt => opt.setName('field3_inline').setDescription('Champ 3 - inline ?').setRequired(false))

    .addStringOption(opt => opt.setName('field4_name').setDescription('Champ 4 - titre').setRequired(false))
    .addStringOption(opt => opt.setName('field4_value').setDescription('Champ 4 - contenu').setRequired(false))
    .addBooleanOption(opt => opt.setName('field4_inline').setDescription('Champ 4 - inline ?').setRequired(false))

    .addStringOption(opt => opt.setName('field5_name').setDescription('Champ 5 - titre').setRequired(false))
    .addStringOption(opt => opt.setName('field5_value').setDescription('Champ 5 - contenu').setRequired(false))
    .addBooleanOption(opt => opt.setName('field5_inline').setDescription('Champ 5 - inline ?').setRequired(false)),

  async execute(interaction) {
    // Vérif admin
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Tu dois être administrateur pour utiliser cette commande.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const colorInput = interaction.options.getString('color');
      const footer = interaction.options.getString('footer');

      // URLs texte
      const imageUrl = interaction.options.getString('image');
      const thumbUrl = interaction.options.getString('thumbnail');

      // Attachments (prioritaires)
      const imageFile = interaction.options.getAttachment('image_file');
      const thumbFile = interaction.options.getAttachment('thumbnail_file');

      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const embed = new EmbedBuilder();

      if (title) embed.setTitle(title);
      if (description) embed.setDescription(description);
      if (colorInput) {
        const trimmed = colorInput.trim();
        const hexMatch = /^#([0-9A-F]{6})$/i.test(trimmed);
        try {
          embed.setColor(hexMatch ? trimmed : trimmed);
        } catch {
          embed.setColor('Blurple');
        }
      } else {
        embed.setColor('Blurple');
      }
      if (footer) embed.setFooter({ text: footer });

      // Gestion image : privilégie l'attachment si présent et valide
      if (imageFile && imageFile.url) {
        if (!isImageAttachment(imageFile)) {
          return interaction.editReply({ content: '❌ L\'image fournie n\'est pas un type valide (image).' });
        }
        embed.setImage(imageFile.url);
      } else if (imageUrl) {
        embed.setImage(imageUrl);
      }

      // Gestion thumbnail : idem
      if (thumbFile && thumbFile.url) {
        if (!isImageAttachment(thumbFile)) {
          return interaction.editReply({ content: '❌ La miniature fournie n\'est pas un type valide (image).' });
        }
        embed.setThumbnail(thumbFile.url);
      } else if (thumbUrl) {
        embed.setThumbnail(thumbUrl);
      }

      // Ajout des champs 1..5 si fournis
      for (let i = 1; i <= 5; i++) {
        const name = interaction.options.getString(`field${i}_name`);
        const value = interaction.options.getString(`field${i}_value`);
        const inline = interaction.options.getBoolean(`field${i}_inline`) || false;
        if (name && value) {
          const fieldName = name.length > 256 ? name.slice(0, 253) + '...' : name;
          const fieldValue = value.length > 1024 ? value.slice(0, 1021) + '...' : value;
          embed.addFields({ name: fieldName, value: fieldValue, inline });
        }
      }

      // Post l'embed dans le salon ciblé
      const sent = await targetChannel.send({ embeds: [embed] });

      // Confirme à l'admin (éphemeral) et fournis le lien
      const jumpUrl = `https://discord.com/channels/${interaction.guildId}/${sent.channel.id}/${sent.id}`;
      await interaction.editReply({ content: `✅ Embed envoyé dans ${targetChannel} — [Aller au message](${jumpUrl})` });

    } catch (err) {
      console.error('Erreur embed command:', err);
      await interaction.editReply({ content: '❌ Une erreur est survenue lors de la création de l\'embed.' });
    }
  }
};

// Helper: vérifie que l'attachment est une image (contentType ou extension)
function isImageAttachment(attachment) {
  try {
    const ct = attachment.contentType || '';
    if (ct.startsWith('image/')) return true;
    const name = (attachment.name || '').toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp') || name.endsWith('.gif');
  } catch {
    return false;
  }
}
