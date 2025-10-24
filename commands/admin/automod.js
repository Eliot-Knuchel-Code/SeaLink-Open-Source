const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { AutoModConfig } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configurer l’automodération du serveur')
        .addStringOption(opt => opt.setName('bannedwords').setDescription('Mots interdits séparés par ,').setRequired(false))
        .addBooleanOption(opt => opt.setName('banlinks').setDescription('Interdire les liens ?').setRequired(false))
        .addStringOption(opt => opt.setName('action').setDescription('Sanction : mute/kick/ban').setRequired(false))
        .addIntegerOption(opt => opt.setName('muteduration').setDescription('Durée du mute en minutes').setRequired(false)),
    async execute(interaction) {
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return interaction.reply('❌ Tu dois être admin pour configurer Automod');

        let config = await AutoModConfig.findByPk(interaction.guild.id);
        if(!config) config = await AutoModConfig.create({ guildId: interaction.guild.id });

        const bannedWords = interaction.options.getString('bannedwords');
        const banLinks = interaction.options.getBoolean('banlinks');
        const action = interaction.options.getString('action');
        const muteDuration = interaction.options.getInteger('muteduration');

        if(bannedWords) config.bannedWords = bannedWords;
        if(banLinks !== null) config.bannedLinks = banLinks;
        if(action) config.action = action;
        if(muteDuration) config.muteDuration = muteDuration;

        await config.save();
        interaction.reply('✅ Configuration Automod mise à jour !');
    }
};
