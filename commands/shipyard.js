const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');



module.exports = {
    data: new SlashCommandBuilder()
        .setName('shipyard')
        .setDescription('Construis ton bateau personnalisé')
        .addStringOption(option => option.setName('nom').setDescription('Nom du bateau').setRequired(true))
        .addIntegerOption(option => option.setName('longueur').setDescription('Longueur en mètres').setRequired(true))
        .addIntegerOption(option => option.setName('vitesse').setDescription('Vitesse maximale en noeuds').setRequired(true))
        .addStringOption(option => option.setName('type').setDescription('Type de bateau').setRequired(true)
            .addChoices(
                { name: 'Voilier', value: 'voilier' },
                { name: 'Cargo', value: 'cargo' },
                { name: 'Tanker', value: 'tanker' },
                { name: 'Yacht', value: 'yacht' }
            )),

    async execute(interaction) {
    // Yeni gemi oluşturma işlemi burada yapılacak (data/Ships yapısına uygun şekilde eklenmeli)
    const nom = interaction.options.getString('nom');
    const longueur = interaction.options.getInteger('longueur');
    const vitesse = interaction.options.getInteger('vitesse');
    const type = interaction.options.getString('type');

    // Fiyat hesaplama
    const basePrice = 1000; 
    const price = basePrice + longueur * 50 + vitesse * 30 + (type === 'tanker' ? 500 : type === 'yacht' ? 300 : 0);

    // Burada yeni gemi data/Ships/<type> klasörüne kaydedilmeli (isteğe göre eklenebilir)

    await interaction.reply(`✅ Bateau **${nom}** créé ! Prix : ${price} pièces. Type : ${type}, Longueur : ${longueur}m, Vitesse : ${vitesse} nœuds.`);
    }
};
