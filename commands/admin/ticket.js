const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Créer un ticket de support')
        .addStringOption(option => option.setName('topic').setDescription('Sujet du ticket').setRequired(true)),
    async execute(interaction) {
        const topic = interaction.options.getString('topic');

        // Crée un salon texte privé pour le ticket
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0, // GUILD_TEXT
            permissionOverwrites: [
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });

        channel.send(`🎫 Ticket créé pour ${interaction.user.tag}\nSujet : ${topic}`);

        interaction.reply({ content: `✅ Ton ticket a été créé : ${channel}`, ephemeral: true });
    }
};
