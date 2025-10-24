const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

let player = createAudioPlayer();
let connection;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Gérer la radio maritime')
        .addStringOption(opt => opt.setName('action').setDescription('play/stop/join/leave').setRequired(true))
        .addStringOption(opt => opt.setName('url').setDescription('URL du flux audio (pour play)').setRequired(false)),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const url = interaction.options.getString('url');

        const memberVC = interaction.member.voice.channel;
        if (!memberVC) return interaction.reply('❌ Tu dois être dans un channel vocal pour utiliser la radio');

        if(action === 'join') {
            connection = joinVoiceChannel({
                channelId: memberVC.id,
                guildId: memberVC.guild.id,
                adapterCreator: memberVC.guild.voiceAdapterCreator,
            });
            await interaction.reply('✅ Connecté au channel vocal !');
        }

        else if(action === 'play') {
            if(!connection) return interaction.reply('❌ Le bot n’est pas connecté au channel vocal. Utilise /radio join d’abord.');
            if(!url) return interaction.reply('❌ Fournis une URL pour jouer la radio');

            const resource = createAudioResource(url);
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => console.log('🎵 Radio en cours'));
            player.on('error', error => console.error(error));

            await interaction.reply(`✅ Radio en lecture depuis : ${url}`);
        }

        else if(action === 'stop') {
            player.stop();
            await interaction.reply('⏹ Radio arrêtée');
        }

        else if(action === 'leave') {
            if(connection) {
                connection.destroy();
                connection = null;
                await interaction.reply('👋 Déconnecté du channel vocal');
            } else {
                await interaction.reply('❌ Je ne suis pas connecté à un channel vocal');
            }
        }
    }
};
