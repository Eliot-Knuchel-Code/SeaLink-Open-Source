const { SlashCommandBuilder } = require('discord.js');
const { Crew } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crew-create')
        .setDescription('Crée un navire et un rôle Discord pour ton équipage')
        .addStringOption(option => option.setName('name').setDescription('Nom du navire').setRequired(true)),
    async execute(interaction) {
        const shipName = interaction.options.getString('name');

        // Création du rôle Discord
        const role = await interaction.guild.roles.create({
            name: `Navire: ${shipName}`,
            mentionable: true,
        });

        // Création du navire en DB
        await Crew.create({
            shipName,
            captainId: interaction.user.id
        });

        await interaction.reply(`✅ Navire "${shipName}" créé ! Rôle ${role.name} attribué au capitaine.`);
    }
};
