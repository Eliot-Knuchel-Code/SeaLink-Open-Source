const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/data.sqlite',
    logging: false
});
module.exports = sequelize;
