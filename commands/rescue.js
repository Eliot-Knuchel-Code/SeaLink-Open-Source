const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// petit util Haversine pour distance en km
function haversine(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Liste d'exemple de MRCC (centres de secours maritimes).
// Tu peux compléter/mettre à jour ces entrées par des coordonnées et contacts officiels.
const mrccList = [
    { name: 'MRCC New York (US Coast Guard Sector New York)', lat: 40.7009, lon: -74.0139, contact: 'VHF CH16 / +1 718-354-4000' },
    { name: 'MRCC Falmouth (UK Coastguard)', lat: 50.1530, lon: -5.0650, contact: 'VHF CH16 / +44 300 1234 100' },
    { name: 'MRCC Brest (France - CROSS Gris-Nez / MRCC?)', lat: 48.3904, lon: -4.4861, contact: 'VHF CH16 / +33 2 98 22 46 46' },
    { name: 'MRCC Tokyo (Japan Coast Guard)', lat: 35.6586, lon: 139.7454, contact: 'VHF CH16 / +81 3-3502-5111' },
    { name: 'AMSA MRCC Canberra (Australia - AMSA)', lat: -35.2809, lon: 149.1300, contact: 'VHF CH16 / 1800 641 792 (Aus)' },
    { name: 'MRCC Singapore (Maritime and Port Authority of Singapore)', lat: 1.2644, lon: 103.822, contact: 'VHF CH16 / +65 6542 1111' }
    // --- ajoute d'autres MRCC réels ici si besoin ---
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rescue')
        .setDescription('Fournit des informations de détresse : coordonnées, fréquences VHF/MF et MRCC le plus proche.')
        .addStringOption(opt => opt
            .setName('port')
            .setDescription('Nom du port (recherche dans ports.json)'))
        .addNumberOption(opt => opt
            .setName('lat')
            .setDescription('Latitude (ex: 48.6900)'))
        .addNumberOption(opt => opt
            .setName('lon')
            .setDescription('Longitude (ex: -4.4800)')),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // 1) déterminer les coordonnées
        let lat = null, lon = null;
        const portName = interaction.options.getString('port');
        const latOpt = interaction.options.getNumber('lat');
        const lonOpt = interaction.options.getNumber('lon');

        // si lat/lon fournis, priorité
        if (typeof latOpt === 'number' && typeof lonOpt === 'number') {
            lat = latOpt;
            lon = lonOpt;
        } else if (portName) {
            // essayer de résoudre via data/ports.json
            try {
                const portsPath = path.join(__dirname, '..', 'data', 'ports.json');
                const portsRaw = fs.readFileSync(portsPath, 'utf8');
                const portsData = JSON.parse(portsRaw);
                // ports.json attendu sous la forme { "Port Name": { "country": "...", "latitude": x, "longitude": y }, ... }
                // on supporte recherche insensible à la casse par inclusion
                const match = Object.keys(portsData).find(k => k.toLowerCase().includes(portName.toLowerCase()));
                if (match) {
                    lat = Number(portsData[match].latitude);
                    lon = Number(portsData[match].longitude);
                } else {
                    // fallback: si le portName ressemble à "lat,lon"
                    const coords = portName.split(',').map(s => s.trim()).map(Number);
                    if (coords.length === 2 && !Number.isNaN(coords[0]) && !Number.isNaN(coords[1])) {
                        lat = coords[0]; lon = coords[1];
                    } else {
                        return interaction.editReply({ content: `❌ Port introuvable dans ports.json : "${portName}". Tu peux fournir lat et lon en option.`, ephemeral: true });
                    }
                }
            } catch (err) {
                console.error('Erreur lecture ports.json', err);
                return interaction.editReply({ content: '❌ Impossible de lire ports.json pour résoudre le port.', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '❌ Tu dois fournir soit un port (option `port`) soit des coordonnées (`lat` et `lon`).', ephemeral: true });
        }

        // 2) trouver le MRCC le plus proche via la liste statique
        let nearest = null;
        try {
            nearest = mrccList.map(m => ({
                ...m,
                distanceKm: haversine(lat, lon, m.lat, m.lon)
            })).sort((a,b) => a.distanceKm - b.distanceKm)[0];
        } catch (err) {
            console.warn('Erreur lors du calcul MRCC', err);
        }

        // 3) construire les informations d'urgence (procédure standard)
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
        const frequencies = [
            { label: 'VHF Channel 16 (appel d\'urgence)', value: '156.8 MHz' },
            { label: 'DSC VHF', value: 'Channel 70 (appel DSC numérique)' },
            { label: 'MF (canal international)', value: '2182 kHz (voice)' },
            { label: 'EPIRB', value: '406 MHz (signal satellite via Cospas-Sarsat)' },
            { label: 'Inmarsat / Iridium', value: 'Services satellite (si équipé)' }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🚨 Informations secours maritime')
            .setColor('#FF3333')
            .addFields(
                { name: 'Position (WGS84)', value: `Lat: ${lat.toFixed(6)} — Lon: ${lon.toFixed(6)}`, inline: false },
                { name: 'Google Maps', value: `[Ouvrir la position](${mapsUrl})`, inline: false },
                { name: 'Fréquences d\'urgence recommandées', value: frequencies.map(f => `**${f.label}** — ${f.value}`).join('\n'), inline: false }
            )
            .setFooter({ text: 'Utilise VHF Ch16 / DSC 70 pour initier un appel de détresse. Envoie ta position exacte et la nature de l’urgence.' })
            .setTimestamp();

        if (nearest) {
            embed.addFields({
                name: `Centre MRCC le plus proche (estimation)`,
                value: `**${nearest.name}** — à ~${nearest.distanceKm.toFixed(1)} km\nContact (exemple): ${nearest.contact}\nCoordonnées MRCC: ${nearest.lat.toFixed(4)}, ${nearest.lon.toFixed(4)}`,
                inline: false
            });
        } else {
            embed.addFields({ name: 'MRCC', value: 'Aucun MRCC de référence disponible dans la liste statique.', inline: false });
        }

        // actions immédiates
        embed.addFields({
            name: 'Actions immédiates recommandées',
            value:
`1. Si tu es en mer et en danger → met le transpondeur VHF sur **CH16** et lance un appel clair : "Mayday, Mayday, Mayday" (ou "Pan-Pan" si urgence non vitale).  
2. Donne la position (lat, lon), nature de l'urgence, nombre de personnes à bord, type de bateau.  
3. Si tu as un EPIRB, active-le (406 MHz).  
4. Si hors portée VHF → tente appel satellite (Inmarsat/Iridium) ou téléphone vers services d'urgence locaux (ex: 112/911 selon pays).`,
            inline: false
        });

        // envoyer embed
        return interaction.editReply({ embeds: [embed], ephemeral: false });
    }
};
