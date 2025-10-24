// events/ready.js
const { Events, ActivityType } = require('discord.js');
const { sequelize } = require('../database/migrations');
const { DataTypes } = require('sequelize');

// Helper sleep
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    // --- Models persistants (créés si absent) ---
    const BotConfig = sequelize.models.BotConfig || sequelize.define('BotConfig', {
      key: { type: DataTypes.STRING, primaryKey: true },
      value: { type: DataTypes.TEXT }
    });

    const BotStatus = sequelize.models.BotStatus || sequelize.define('BotStatus', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      lastMessageId: { type: DataTypes.STRING },
      channelId: { type: DataTypes.STRING },
      status: { type: DataTypes.STRING } // online | update | offline
    });

    // sync si nécessaire
    await BotConfig.sync();
    await BotStatus.sync();

    // Fonction pour récupérer la version depuis la DB (fallback .env VERSION or '1.0.0')
    async function getVersion() {
      try {
        const row = await BotConfig.findByPk('version');
        if (row && row.value) return row.value;
      } catch (e) {
        console.warn('Warning: impossible de lire BotConfig.version', e);
      }
      return process.env.VERSION || process.env.VERSION_NUMBER || '1.0.0';
    }

    // Fonction pour récupérer le statut courant depuis la DB (fallback 'online')
    async function getCurrentStatus() {
      try {
        // On prend la première ligne BotStatus (si multi guild, on peut filtrer par guildId plus tard)
        const row = await BotStatus.findOne();
        if (row && row.status) return row.status;
      } catch (e) {
        console.warn('Warning: impossible de lire BotStatus', e);
      }
      return 'online';
    }

    // Boucle principale de presence : relit version & statut avant chaque cycle
    async function presenceLoop() {
      const currentStatus = await getCurrentStatus();
      const version = await getVersion();

      // Construire listes d'activités selon le statut
      const activitiesByStatus = {
        online: [
          `Version ${version} • SeaLink`,
          'Gestion d’équipage',
          'Économie maritime',
          'Tracking de bateaux'
        ],
        update: [
          `Version ${version} • Mise à jour`,
          'Mise à jour en cours…',
          'Patientez, déploiement'
        ],
        offline: [
          `Version ${version} • Hors ligne`,
          'Maintenance',
          'Redémarrage imminent'
        ]
      };

      const activities = activitiesByStatus[currentStatus] || activitiesByStatus.online;

      // Détermine type et statut discord selon currentStatus
      let presenceStatus = 'online';
      let defaultActivityType = ActivityType.Playing;
      if (currentStatus === 'update') {
        presenceStatus = 'idle';
        defaultActivityType = ActivityType.Watching;
      } else if (currentStatus === 'offline') {
        presenceStatus = 'dnd';
        defaultActivityType = ActivityType.Listening;
      }

      // Parcours chaque activité (affichée 30s chacune)
      for (const act of activities) {
        try {
          await client.user.setPresence({
            activities: [{ name: act, type: defaultActivityType }],
            status: presenceStatus
          });
        } catch (err) {
          console.error('Erreur lors du setPresence :', err);
        }
        // attente 30s avant activité suivante
        await sleep(30_000);
      }
    }

    // Lancement d'une boucle infinie (async)
    (async () => {
      while (true) {
        try {
          await presenceLoop();
        } catch (err) {
          console.error('Erreur dans presenceLoop :', err);
          // si erreur, on attend un peu avant de réessayer
          await sleep(10_000);
        }
      }
    })();

    // --- Optionnel : log startup version/status pour debug ---
    const startupVersion = await getVersion();
    const startupStatus = await getCurrentStatus();
    console.log(`Startup version: ${startupVersion} | startup status: ${startupStatus}`);
  }
};
