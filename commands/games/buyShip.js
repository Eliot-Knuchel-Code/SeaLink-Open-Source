const { SlashCommandBuilder } = require('discord.js');
const { Ship, User } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy-ship')
        .setDescription('Acheter un bateau')
        .addIntegerOption(opt => opt.setName('id').setDescription('ID du bateau à acheter').setRequired(true)),
    async execute(interaction) {
        const shipId = interaction.options.getInteger('id');
        const ship = await Ship.findByPk(shipId);
        if(!ship) return interaction.reply('❌ Bateau introuvable');
        const user = await User.findByPk(interaction.user.id) || await User.create({id: interaction.user.id});
        if(ship.ownerId) return interaction.reply('❌ Ce bateau est déjà possédé');
        if(user.balance < ship.price) return interaction.reply('❌ Tu n\'as pas assez de crédits');
        user.balance -= ship.price;
        await user.save();
        ship.ownerId = interaction.user.id;
        await ship.save();
        interaction.reply(`✅ Tu as acheté le bateau ${ship.name} pour ${ship.price} crédits`);
    }
};
