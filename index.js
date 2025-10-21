require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Collections pour les commandes
client.commands = new Collection();

// Récupération des fichiers de commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    }
}

// Channels log / erreur / DM
const logChannelId = process.env.LOG_CHANNEL_ID;
const errorChannelId = process.env.ERROR_CHANNEL_ID;
const dmLogChannelId = process.env.DM_LOG_CHANNEL_ID;

// Mapping message DM -> utilisateur
const dmMap = new Map();

// Ready event

client.on('ready', () => {
    console.log(`${client.user.tag} is online!`);

    // Statut rich presence qui change toutes les 30 sec
    const statuses = [
        `v${require('./version.json').version} | Marine Traffic`,
        `v${require('./version.json').version} | /help`,
        `v${require('./version.json').version} | En mer`
    ];
    let i = 0;
    setInterval(() => {
        client.user.setActivity(statuses[i], { type: ActivityType.Watching });
        i = (i + 1) % statuses.length;
    }, 30000);

    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) logChannel.send('✅ Bot est maintenant en ligne !');
});

// Event interaction
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
            // Log de l’utilisation
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                logChannel.send(`📝 Commande \`/${interaction.commandName}\` utilisée par ${interaction.user.tag}`);
            }
        } catch (error) {
            console.error(error);
            const errorChannel = interaction.guild.channels.cache.get(errorChannelId);
            if (errorChannel) errorChannel.send(`⚠️ Erreur dans la commande \`/${interaction.commandName}\` : ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Une erreur est survenue.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        // /eco shop kategori butonları
        const customId = interaction.customId;
        if (customId.startsWith('eco_shop_')) {
            // Kategori adını normalize et
            const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const categoryRaw = customId.replace('eco_shop_', '');
            const categoryNorm = normalize(categoryRaw);
            // Gemileri oku ve kategoriye göre filtrele
            const eco = require('./commands/eco.js');
            const catalog = eco.readShipCatalog ? eco.readShipCatalog() : [];
            const ships = catalog.filter(s => normalize(s.category || '') === categoryNorm);
            if (!ships.length) {
                return interaction.reply({ content: `Bu kategoride hiç model yok.`, ephemeral: true });
            }
            // Embed ile gemi isimlerini listele
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle(`🛒 ${ships[0].category} — Modeller`)
                .setDescription(ships.map(s => `• ${s.model}`).join('\n'))
                .setFooter({ text: `${ships.length} model` })
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
});

// Message de bienvenue
client.on('guildMemberAdd', async member => {
    try {
        await member.send(`⚓ Bienvenue ${member.user.username} ! Que tes aventures maritimes soient légendaires 🌊`);
    } catch (error) {
        console.error(`Impossible d’envoyer le message de bienvenue à ${member.user.tag}`);
    }
});

// Gestion des DMs
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Si c'est un DM reçu
    if (message.channel.type === 1) {
        const logChannel = client.channels.cache.get(dmLogChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*Message vide*')
            .setColor('Purple')
            .setFooter({ text: `ID: ${message.author.id}` })
            .setTimestamp();

        if (message.attachments.size > 0) {
            const files = message.attachments.map(att => att.url);
            embed.addFields({ name: 'Fichiers attachés', value: files.join('\n') });
        }

        const sentMessage = await logChannel.send({ embeds: [embed] });

        // Ajouter les réactions
        await sentMessage.react('✉️'); // répondre en privé
        await sentMessage.react('📢'); // répondre en public
        await sentMessage.react('✅'); // marquer comme lu

        // Stocker le mapping message -> utilisateur
        dmMap.set(sentMessage.id, message.author.id);
    }
});

// Réaction sur les embeds DM
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.message.channel.id !== dmLogChannelId) return;

    const targetUserId = dmMap.get(reaction.message.id);
    if (!targetUserId) return;

    const emoji = reaction.emoji.name;

    if (emoji === '✉️') {
        // Répondre en privé
        const filter = m => m.author.id === user.id;
        const prompt = await reaction.message.channel.send(`${user}, écris ton message pour <@${targetUserId}> (60 sec)`);
        const collector = reaction.message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
            try {
                const targetUser = await client.users.fetch(targetUserId);
                await targetUser.send(m.content);
                await reaction.message.channel.send(`✅ Message envoyé à <@${targetUserId}>`);
            } catch (err) {
                console.error(err);
                await reaction.message.channel.send('❌ Impossible d’envoyer le message.');
            } finally {
                prompt.delete().catch(() => {});
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) prompt.delete().catch(() => {});
        });
    }

    else if (emoji === '📢') {
        // Répondre en public dans le même salon du log
        const filter = m => m.author.id === user.id;
        const prompt = await reaction.message.channel.send(`${user}, écris ton message public pour <@${targetUserId}> (60 sec)`);
        const collector = reaction.message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
            try {
                await reaction.message.channel.send(`📢 <@${targetUserId}>, ${m.content}`);
                await reaction.message.channel.send(`✅ Message public envoyé à <@${targetUserId}>`);
            } catch (err) {
                console.error(err);
                await reaction.message.channel.send('❌ Impossible d’envoyer le message.');
            } finally {
                prompt.delete().catch(() => {});
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) prompt.delete().catch(() => {});
        });
    }

    else if (emoji === '✅') {
        // Marquer comme lu
        reaction.message.channel.send(`✅ Message de <@${targetUserId}> marqué comme lu par ${user}`);
    }
});

// Connexion
client.login(process.env.TOKEN);
