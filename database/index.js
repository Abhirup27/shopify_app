const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
 var db = {};

module.exports = (config) => {
    const sequelize = new Sequelize(config.database, config.username, config.password, config)
    //const sequelize = new Sequelize('inventoryapp', 'root', 'ABHIrup_27', { host: "localhost", dialect: "mysql", logging: false })
    
    fs.readdirSync(path.join(__dirname, './models'))
        .forEach(function (file) {
            const model = require(path.join(__dirname, './models', file))(sequelize, Sequelize.DataTypes)
            db[model.name] = model;
        });
    //db.sequelize = sequelize;

    Object.keys(db).forEach(function (modelName) {
        if ("associate" in db[modelName]) {
            db[modelName].associate(db);
        }
    })
    sequelize.sync().then(function () {
        console.log('Database synced');
    })
    .catch(function (err) {
        console.log("Database sync/ init failed.", err);
    })
    return {

            //sequelize: new Sequelize(config.database, config.username, config.password, config)
            sequelize: sequelize,
            db:db

        };
    
    
        
}
