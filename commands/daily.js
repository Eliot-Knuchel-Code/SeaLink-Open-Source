// commands/daily.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ECO_PATH = path.join(__dirname, '..', 'data', 'eco.json');
const DAILY_PATH = path.join(__dirname, '..', 'data', 'daily.json');

const DAILY_BASE = 50; // montant de base
const STREAK_BONUS = 10; // bonus par streak (optionnel)

function readJson(p) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return {}; }
}
function writeJson(p, data) {
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription("Récupère ton bonus quotidien"),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD

        let daily = readJson(DAILY_PATH);
        let eco = readJson(ECO_PATH);

        if (!daily[userId]) daily[userId] = { last: null, streak: 0 };

        if (daily[userId].last === today) {
            return interaction.editReply({ content: "⏱️ Tu as déjà récupéré ton bonus aujourd'hui. Reviens demain !" });
        }

        // gérer streak (si hier réclamé alors streak+1 sinon reset)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
        if (daily[userId].last === yesterday) daily[userId].streak = (daily[userId].streak || 0) + 1;
        else daily[userId].streak = 1;

        const streakBonus = Math.min( (daily[userId].streak - 1) * STREAK_BONUS, 100 ); // cap bonus
        const reward = DAILY_BASE + streakBonus;

        // mettre à jour eco
        if (!eco[userId]) eco[userId] = { money: 0, boats: [] };
        eco[userId].money = (eco[userId].money || 0) + reward;

        // enregistrer
        daily[userId].last = today;
        writeJson(DAILY_PATH, daily);
        writeJson(ECO_PATH, eco);

        const embed = new EmbedBuilder()
            .setTitle('🎁 Bonus quotidien')
            .setColor('#00CC66')
            .setDescription(`${interaction.user.username}, tu as reçu **${reward}** pièces !`)
            .addFields(
                { name: 'Streak', value: `${daily[userId].streak} jour(s)`, inline: true },
                { name: 'Bonus streak', value: `${streakBonus} pièces`, inline: true }
            )
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
