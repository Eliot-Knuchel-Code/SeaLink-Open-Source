const { SlashCommandBuilder } = require('discord.js');
const { Ship, User } = require('../../database/migrations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shipyard')
        .setDescription('Crée ou achète un bateau')
        .addStringOption(opt => opt.setName('action').setDescription('create ou buy').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Nom du bateau (pour create)'))
        .addIntegerOption(opt => opt.setName('price').setDescription('Prix du bateau (pour create)'))
        .addIntegerOption(opt => opt.setName('id').setDescription('ID du bateau (pour buy)')),
    async execute(interaction) {
        const action = interaction.options.getString('action');

        if(action === 'create') {
            const name = interaction.options.getString('name');
            const price = interaction.options.getInteger('price');
            if(!name || !price) return interaction.reply('❌ Nom et prix requis pour créer un bateau');
            await Ship.create({ name, price });
            return interaction.reply(`🚢 Bateau "${name}" créé pour ${price} crédits`);
        }

        if(action === 'buy') {
            const id = interaction.options.getInteger('id');
            const ship = await Ship.findByPk(id);
            if(!ship) return interaction.reply('❌ Bateau introuvable');
            if(ship.ownerId) return interaction.reply('❌ Ce bateau est déjà possédé');

            let user = await User.findByPk(interaction.user.id);
            if(!user) user = await User.create({ id: interaction.user.id });
            if(user.balance < ship.price) return interaction.reply('❌ Tu n’as pas assez de crédits');

            user.balance -= ship.price;
            await user.save();
            ship.ownerId = interaction.user.id;
            await ship.save();

            return interaction.reply(`✅ Tu as acheté le bateau "${ship.name}" pour ${ship.price} crédits`);
        }
    }
};
