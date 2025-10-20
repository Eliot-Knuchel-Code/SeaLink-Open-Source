const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ECO_PATH = path.join(__dirname, '..', 'data', 'eco.json');

// Boutique (pour bonus)
const shop = [
    { name: "Petit Voilier", price: 10, bonus: 1 },
    { name: "Cargo", price: 50, bonus: 2 },
    { name: "Tanker", price: 100, bonus: 3 },
    { name: "Yacht de Luxe", price: 250, bonus: 5 },
    { name: "Sous-marin", price: 500, bonus: 10 },
];

// Questions avec difficulté
const questions = [
    {
        question: "Quel est le plus grand océan du monde ?",
        answers: ["pacifique", "océan pacifique"],
        difficulty: "Facile"
    },
    {
        question: "Quel navire célèbre a coulé en 1912 ?",
        answers: ["titanic"],
        difficulty: "Moyen"
    },
    {
        question: "Comment s'appelle la voile principale d'un voilier ?",
        answers: ["grand-voile", "grand voile"],
        difficulty: "Difficile"
    }
];

// Fonction pour récupérer les données utilisateur
function getUserData(ecoData, userId) {
    if (!ecoData[userId]) ecoData[userId] = { money: 0, boats: [] };
    return ecoData[userId];
}

// Calcul bonus selon bateaux
function calculateBonus(userData) {
    return userData.boats.reduce((sum, b) => {
        const boat = shop.find(s => s.name === b);
        return sum + (boat ? boat.bonus : 0);
    }, 0);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seagame')
        .setDescription('Joue à un quiz maritime pour gagner des pièces !'),

    async execute(interaction) {
        const q = questions[Math.floor(Math.random() * questions.length)];

        const embed = new EmbedBuilder()
            .setTitle(`🌊 SeaGame - Quiz Maritime (${q.difficulty})`)
            .setDescription(q.question)
            .setColor('#1E90FF');

        await interaction.reply({ embeds: [embed] });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

        collector.on('collect', m => {
            const answer = m.content.toLowerCase().trim();
            if (q.answers.includes(answer)) collector.stop('correct');
        });

        collector.on('end', async (collected, reason) => {
            let ecoData = {};
            try { ecoData = JSON.parse(fs.readFileSync(ECO_PATH, 'utf8')); } catch (err) {}

            const userId = interaction.user.id;
            const userData = getUserData(ecoData, userId);

            if (reason === 'correct') {
                // Gain selon difficulté
                let baseReward;
                if (q.difficulty === "Facile") baseReward = Math.floor(Math.random() * 10) + 5;    // 5-14
                else if (q.difficulty === "Moyen") baseReward = Math.floor(Math.random() * 15) + 10; // 10-24
                else baseReward = Math.floor(Math.random() * 25) + 20;                               // 20-44

                const bonus = calculateBonus(userData);
                const totalReward = baseReward + bonus;
                userData.money += totalReward;
                fs.writeFileSync(ECO_PATH, JSON.stringify(ecoData, null, 2));

                await interaction.followUp(`✅ Bonne réponse ! Tu gagnes **${totalReward} pièces** (Bonus bateaux : ${bonus}) !`);
            } else {
                await interaction.followUp(`❌ Temps écoulé ou mauvaise réponse ! La bonne réponse était : **${q.answers[0]}**.`);
            }
        });
    }
};
