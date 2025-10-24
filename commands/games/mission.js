const { SlashCommandBuilder } = require('discord.js');
const { Mission, UserMission, User } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mission')
        .setDescription('Lance une mission maritime ou récupère tes récompenses')
        .addStringOption(opt => opt.setName('action').setDescription('start ou claim').setRequired(true))
        .addIntegerOption(opt => opt.setName('id').setDescription('ID de la mission (pour start)').setRequired(false)),
    async execute(interaction) {
        const action = interaction.options.getString('action');

        if(action === 'start') {
            const id = interaction.options.getInteger('id');
            const mission = await Mission.findByPk(id);
            if(!mission) return interaction.reply('❌ Mission introuvable');
            await UserMission.create({ userId: interaction.user.id, missionId: id });
            return interaction.reply(`🚀 Mission "${mission.name}" commencée !`);
        }

        if(action === 'claim') {
            const activeMissions = await UserMission.findAll({ where: { userId: interaction.user.id, completed: false } });
            if(!activeMissions.length) return interaction.reply('❌ Tu n’as aucune mission à récupérer');

            let total = 0;
            for(const um of activeMissions) {
                const mission = await Mission.findByPk(um.missionId);
                const endTime = new Date(um.startTime);
                endTime.setMinutes(endTime.getMinutes() + mission.duration);
                if(new Date() >= endTime) {
                    total += mission.reward;
                    um.completed = true;
                    await um.save();
                }
            }

            if(total === 0) return interaction.reply('⏳ Tes missions ne sont pas encore terminées');
            const user = await User.findByPk(interaction.user.id);
            user.balance += total;
            await user.save();
            interaction.reply(`✅ Tu as reçu ${total} crédits pour tes missions !`);
        }
    }
};
