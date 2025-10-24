const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute un membre')
        .addUserOption(opt => opt.setName('member').setDescription('Membre à mute').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Durée en minutes').setRequired(true)),
    async execute(interaction) {
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) 
            return interaction.reply('❌ Tu n’as pas la permission !');

        const member = interaction.options.getUser('member');
        const duration = interaction.options.getInteger('duration');

        const guildMember = await interaction.guild.members.fetch(member.id);
        await guildMember.timeout(duration * 60000, `Muted par ${interaction.user.tag}`);
        interaction.reply(`✅ ${member.tag} a été mute pendant ${duration} minutes`);
        logger.log(`${interaction.user.tag} a mute ${member.tag} pendant ${duration} minutes`);
    }
};
