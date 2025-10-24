const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async function paginate(interaction, pages) {
    let page = 0;
    const embed = new EmbedBuilder().setDescription(pages[page]);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary)
    );
    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', i => {
        if(i.user.id !== interaction.user.id) return i.reply({ content: '❌ Ce n\'est pas ton menu', ephemeral: true });
        if(i.customId === 'prev') page = page > 0 ? page-1 : pages.length-1;
        if(i.customId === 'next') page = page < pages.length-1 ? page+1 : 0;
        embed.setDescription(pages[page]);
        i.update({ embeds: [embed] });
    });
};
