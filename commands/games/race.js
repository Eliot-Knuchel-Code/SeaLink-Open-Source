const { SlashCommandBuilder } = require('discord.js');
const { Ship, User } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('race')
        .setDescription('Participe à une course navale pour gagner des crédits')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Montant à parier').setRequired(true)),
    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        let user = await User.findByPk(interaction.user.id);
        if(!user) user = await User.create({ id: interaction.user.id });

        if(user.balance < bet) return interaction.reply('❌ Tu n’as pas assez de crédits pour parier ce montant !');

        // Vérifie si le joueur possède un bateau
        const ship = await Ship.findOne({ where: { ownerId: interaction.user.id } });
        if(!ship) return interaction.reply('❌ Tu dois posséder un bateau pour participer à la course !');

        const chance = Math.random();
        let outcome;
        if(chance < 0.5) {
            // Perte
            user.balance -= bet;
            await user.save();
            outcome = `💨 Tu as perdu la course et perdu **${bet} crédits** !`;
        } else {
            // Gain (1.5x le pari)
            const gain = Math.floor(bet * 1.5);
            user.balance += gain;
            await user.save();
            outcome = `🏆 Tu as gagné la course et gagné **${gain} crédits** !`;
        }

        interaction.reply(outcome);
    }
};
