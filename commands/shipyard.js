const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BOATS_PATH = path.join(__dirname, '..', 'data', 'boats.json');
if (!fs.existsSync(BOATS_PATH)) fs.writeFileSync(BOATS_PATH, '{}');

function saveBoats(data) {
    fs.writeFileSync(BOATS_PATH, JSON.stringify(data, null, 2));
}

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
        let boatsData = {};
        try { boatsData = JSON.parse(fs.readFileSync(BOATS_PATH, 'utf8')); } catch {}

        const userId = interaction.user.id;
        if (!boatsData[userId]) boatsData[userId] = [];

        const nom = interaction.options.getString('nom');
        const longueur = interaction.options.getInteger('longueur');
        const vitesse = interaction.options.getInteger('vitesse');
        const type = interaction.options.getString('type');

        // Calcul du prix réaliste
        const basePrice = 1000; 
        const price = basePrice + longueur * 50 + vitesse * 30 + (type === 'tanker' ? 500 : type === 'yacht' ? 300 : 0);

        const newBoat = { nom, longueur, vitesse, type, price };
        boatsData[userId].push(newBoat);
        saveBoats(boatsData);

        await interaction.reply(`✅ Bateau **${nom}** créé ! Prix : ${price} pièces. Type : ${type}, Longueur : ${longueur}m, Vitesse : ${vitesse} nœuds.`);
    }
};
