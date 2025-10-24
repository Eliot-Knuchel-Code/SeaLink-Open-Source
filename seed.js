const { Ship, Mission, User, sequelize } = require('./database/migrations');

(async () => {
    try {
        // 1️⃣ Utilisateurs de test
        await User.bulkCreate([
            { id: '1234567890', balance: 2000 },
            { id: '0987654321', balance: 1500 }
        ], { ignoreDuplicates: true });

        // 2️⃣ Bateaux de départ
        await Ship.bulkCreate([
            { name: 'Sloop de base', price: 500 },
            { name: 'Goélette', price: 1000 },
            { name: 'Frégate', price: 2000 },
            { name: 'Yacht de luxe', price: 5000 }
        ], { ignoreDuplicates: true });

        // 3️⃣ Missions prédéfinies
        await Mission.bulkCreate([
            { name: 'Livraison express', reward: 300, duration: 5 },
            { name: 'Transport marchandises', reward: 500, duration: 10 },
            { name: 'Exploration océanique', reward: 1000, duration: 20 },
            { name: 'Secours en mer', reward: 1500, duration: 30 }
        ], { ignoreDuplicates: true });

        console.log('✅ Base de données pré-remplie avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors du seed :', err);
        process.exit(1);
    }
})();
