const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick un membre')
        .addUserOption(opt => opt.setName('member').setDescription('Membre à kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Raison du kick').setRequired(false)),
    async execute(interaction) {
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return interaction.reply('❌ Tu n’as pas la permission !');

        const member = interaction.options.getUser('member');
        const reason = interaction.options.getString('reason') || 'Aucune raison fournie';
        const guildMember = await interaction.guild.members.fetch(member.id);

        await guildMember.kick(reason);
        interaction.reply(`✅ ${member.tag} a été kick\nRaison: ${reason}`);
        logger.log(`${interaction.user.tag} a kick ${member.tag} | Raison: ${reason}`);
    }
};
