const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crew')
    .setDescription('Gestion de votre navire et de l’équipage')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Créer un navire')
        .addStringOption(option => option.setName('shipname').setDescription('Nom du navire').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Supprimer votre navire')
        .addStringOption(option => option.setName('shipname').setDescription('Nom du navire').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Ajouter un matelot à votre navire')
        .addStringOption(option => option.setName('shipname').setDescription('Nom du navire').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Utilisateur à ajouter').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Retirer un matelot de votre navire')
        .addStringOption(option => option.setName('shipname').setDescription('Nom du navire').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Utilisateur à retirer').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Voir la liste de l’équipage d’un navire')
        .addStringOption(option => option.setName('shipname').setDescription('Nom du navire').setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const shipName = interaction.options.getString('shipname');
    const guild = interaction.guild;

    const captainRoleName = `Capitaine du navire ${shipName}`;
    const matelotRoleName = `Matelot du navire ${shipName}`;

    const captainRole = guild.roles.cache.find(r => r.name === captainRoleName);
    const matelotRole = guild.roles.cache.find(r => r.name === matelotRoleName);

    if (subcommand === 'create') {
      if (captainRole) return interaction.reply({ content: '❌ Un navire avec ce nom existe déjà !', ephemeral: true });

      try {
        const newCaptainRole = await guild.roles.create({
          name: captainRoleName,
          color: 'Blue',
          permissions: ['ManageRoles', 'ViewChannel', 'SendMessages', 'Connect', 'Speak'],
          reason: `Création du navire ${shipName}`,
        });

        const newMatelotRole = await guild.roles.create({
          name: matelotRoleName,
          color: 'Green',
          reason: `Création du navire ${shipName}`,
        });

        const category = await guild.channels.create({
          name: shipName,
          type: 4,
          permissionOverwrites: [
            { id: guild.id, deny: ['ViewChannel'] },
            { id: newCaptainRole.id, allow: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] },
            { id: newMatelotRole.id, allow: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] },
          ],
        });

        await guild.channels.create({ name: 'général', type: 0, parent: category.id });
        await guild.channels.create({ name: 'voice', type: 2, parent: category.id });

        await interaction.member.roles.add(newCaptainRole);
        await interaction.reply({ content: `✅ Navire **${shipName}** créé ! Vous êtes maintenant **Capitaine**.`, ephemeral: false });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de la création du navire.', ephemeral: true });
      }
    }

    else if (subcommand === 'delete') {
      if (!captainRole || !matelotRole) return interaction.reply({ content: '❌ Navire introuvable.', ephemeral: true });
      if (!interaction.member.roles.cache.has(captainRole.id)) return interaction.reply({ content: '❌ Seul le capitaine peut supprimer le navire.', ephemeral: true });

      try {
        const category = guild.channels.cache.find(c => c.name === shipName && c.type === 4);
        if (category) {
          for (const channel of category.children.values()) {
            await channel.delete('Navire supprimé');
          }
          await category.delete('Navire supprimé');
        }

        await captainRole.delete('Navire supprimé');
        await matelotRole.delete('Navire supprimé');

        await interaction.reply({ content: `✅ Navire **${shipName}** supprimé avec tous ses membres et salons.`, ephemeral: false });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de la suppression du navire.', ephemeral: true });
      }
    }

    else if (subcommand === 'add') {
      if (!captainRole || !matelotRole) return interaction.reply({ content: '❌ Navire introuvable.', ephemeral: true });
      if (!interaction.member.roles.cache.has(captainRole.id)) return interaction.reply({ content: '❌ Seul le capitaine peut ajouter des matelots.', ephemeral: true });

      const user = interaction.options.getUser('user');
      const member = await guild.members.fetch(user.id);
      await member.roles.add(matelotRole);
      await interaction.reply({ content: `✅ ${user.username} est maintenant **Matelot** du navire **${shipName}**.`, ephemeral: false });
    }

    else if (subcommand === 'remove') {
      if (!captainRole || !matelotRole) return interaction.reply({ content: '❌ Navire introuvable.', ephemeral: true });
      if (!interaction.member.roles.cache.has(captainRole.id)) return interaction.reply({ content: '❌ Seul le capitaine peut retirer des matelots.', ephemeral: true });

      const user = interaction.options.getUser('user');
      const member = await guild.members.fetch(user.id);
      await member.roles.remove(matelotRole);
      await interaction.reply({ content: `✅ ${user.username} a été retiré du navire **${shipName}**.`, ephemeral: false });
    }

    else if (subcommand === 'list') {
      if (!captainRole || !matelotRole) return interaction.reply({ content: '❌ Navire introuvable.', ephemeral: true });

      const members = guild.members.cache.filter(m => m.roles.cache.has(captainRole.id) || m.roles.cache.has(matelotRole.id));
      const list = members.map(m => {
        if (m.roles.cache.has(captainRole.id)) return `🧭 ${m.user.username} (Capitaine)`;
        else return `⚓ ${m.user.username} (Matelot)`;
      }).join('\n') || 'Aucun membre pour ce navire.';
      await interaction.reply({ content: `📜 Équipage du navire **${shipName}** :\n${list}`, ephemeral: false });
    }

    else {
      await interaction.reply({ content: '❌ Sous-commande inconnue.', ephemeral: true });
    }
  },
};
