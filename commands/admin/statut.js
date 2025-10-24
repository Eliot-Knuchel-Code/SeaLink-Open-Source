const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const { BotStatus } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Changer le statut du bot')
        .addStringOption(opt => 
            opt.setName('etat')
            .setDescription('Statut du bot')
            .setRequired(true)
            .addChoices(
                { name: 'En ligne', value: 'online' },
                { name: 'Mise à jour', value: 'update' },
                { name: 'Arrêt', value: 'offline' }
            )
        )
        .addChannelOption(opt => 
            opt.setName('channel')
            .setDescription('Salon pour poster le statut')
            .setRequired(true)
        ),

    async execute(interaction) {
        const etat = interaction.options.getString('etat');
        const channel = interaction.options.getChannel('channel');

        // ----------------- Supprimer l'ancien message -----------------
        let oldStatus = await BotStatus.findOne({ where: { channelId: channel.id } });
        if (oldStatus && oldStatus.lastMessageId) {
            try {
                const oldMessage = await channel.messages.fetch(oldStatus.lastMessageId);
                if(oldMessage) await oldMessage.delete();
            } catch {}
        }

        // ----------------- Embed -----------------
        const embed = new EmbedBuilder()
            .setTitle(`🤖 Statut du bot : ${etat === 'online' ? 'En ligne' : etat === 'update' ? 'Mise à jour' : 'Arrêt'}`)
            .setColor(etat === 'online' ? 'Green' : etat === 'update' ? 'Yellow' : 'Red')
            .setTimestamp();

        const msg = await channel.send({ embeds: [embed] });

        // ----------------- Mettre à jour le status Discord -----------------
        let activityType = ActivityType.Playing;
        let statusPresence = 'online';

        if(etat === 'update') {
            activityType = ActivityType.Watching;
            statusPresence = 'idle';
        } else if(etat === 'offline') {
            activityType = ActivityType.Listening;
            statusPresence = 'dnd';
        }

        await interaction.client.user.setPresence({
            activities: [{ name: `Bot ${etat}`, type: activityType }],
            status: statusPresence
        });

        // ----------------- Stocker le message dans SQLite -----------------
        if(oldStatus) {
            oldStatus.lastMessageId = msg.id;
            oldStatus.status = etat;
            await oldStatus.save();
        } else {
            await BotStatus.create({
                lastMessageId: msg.id,
                channelId: channel.id,
                status: etat
            });
        }

        interaction.reply({ content: `✅ Statut mis à jour : ${etat}`, ephemeral: true });
    }
};
