const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban un membre')
        .addUserOption(opt => opt.setName('member').setDescription('Membre à ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Raison du ban').setRequired(false)),
    async execute(interaction) {
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return interaction.reply('❌ Tu n’as pas la permission !');

        const member = interaction.options.getUser('member');
        const reason = interaction.options.getString('reason') || 'Aucune raison fournie';
        const guildMember = await interaction.guild.members.fetch(member.id);

        await guildMember.ban({ reason });
        interaction.reply(`✅ ${member.tag} a été banni\nRaison: ${reason}`);
        logger.log(`${interaction.user.tag} a banni ${member.tag} | Raison: ${reason}`);
    }
};
