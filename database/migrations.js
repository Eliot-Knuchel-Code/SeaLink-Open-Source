const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/data.sqlite',
    logging: false
});

// --------------------- UTILISATEURS ---------------------
const User = sequelize.define('User', {
    id: { type: DataTypes.STRING, primaryKey: true },
    balance: { type: DataTypes.INTEGER, defaultValue: 1000 } // crédits
});

// --------------------- BATEAUX ---------------------
const Ship = sequelize.define('Ship', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    price: { type: DataTypes.INTEGER },
    ownerId: { type: DataTypes.STRING, allowNull: true } // utilisateur propriétaire
});

// --------------------- ÉQUIPAGE ---------------------
const Crew = sequelize.define('Crew', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shipName: { type: DataTypes.STRING },
    captainId: { type: DataTypes.STRING } // ID du capitaine
});

// --------------------- JOURNAL DE BORD ---------------------
const Logbook = sequelize.define('Logbook', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT }
});

// --------------------- MISSIONS ---------------------
const Mission = sequelize.define('Mission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    reward: { type: DataTypes.INTEGER },
    duration: { type: DataTypes.INTEGER } // minutes
});

const AutoModConfig = sequelize.define('AutoModConfig', {
    guildId: { type: DataTypes.STRING, primaryKey: true },
    bannedWords: { type: DataTypes.TEXT, defaultValue: '' }, // CSV mots interdits
    bannedLinks: { type: DataTypes.BOOLEAN, defaultValue: true }, // true = liens interdits
    action: { type: DataTypes.STRING, defaultValue: 'mute' }, // mute/kick/ban
    muteDuration: { type: DataTypes.INTEGER, defaultValue: 10 } // en minutes
});

const BotStatus = sequelize.define('BotStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lastMessageId: { type: DataTypes.STRING },
    channelId: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING } // online, idle, dnd
});


// Missions des utilisateurs
const UserMission = sequelize.define('UserMission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING },
    missionId: { type: DataTypes.INTEGER },
    startTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// --------------------- RELATIONS (optionnelles) ---------------------
// Un user peut avoir plusieurs ships
User.hasMany(Ship, { foreignKey: 'ownerId', sourceKey: 'id' });
// Un user peut avoir plusieurs missions
User.hasMany(UserMission, { foreignKey: 'userId', sourceKey: 'id' });
// Une mission peut être accomplie par plusieurs users
Mission.hasMany(UserMission, { foreignKey: 'missionId', sourceKey: 'id' });

// --------------------- SYNC ---------------------
(async () => {
    await sequelize.sync();
    console.log('✅ Toutes les tables ont été créées et synchronisées !');
})();

module.exports = { User, Ship, Crew, Logbook, Mission, UserMission, sequelize };
