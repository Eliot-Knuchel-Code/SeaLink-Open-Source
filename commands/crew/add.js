const { SlashCommandBuilder } = require('discord.js');
const { Crew } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crew-add')
        .setDescription('Ajoute un matelot à ton navire')
        .addUserOption(option => option.setName('member').setDescription('Utilisateur à ajouter').setRequired(true))
        .addStringOption(option => option.setName('ship').setDescription('Nom du navire').setRequired(true)),
    async execute(interaction) {
        const member = interaction.options.getUser('member');
        const shipName = interaction.options.getString('ship');

        const ship = await Crew.findOne({ where: { shipName } });
        if(!ship) return interaction.reply('❌ Navire introuvable');
        if(ship.captainId !== interaction.user.id) return interaction.reply('❌ Seul le capitaine peut ajouter des membres');

        // Récupérer le rôle Discord associé
        const role = interaction.guild.roles.cache.find(r => r.name === `Navire: ${shipName}`);
        if(!role) return interaction.reply('❌ Rôle du navire introuvable');

        const guildMember = await interaction.guild.members.fetch(member.id);
        await guildMember.roles.add(role);

        interaction.reply(`✅ ${member.tag} est maintenant matelot du navire ${shipName}`);
    }
};
