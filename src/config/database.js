/**
 * Configuração de conexão com o banco de dados MySQL
 * Usando Sequelize ORM
 */

const { Sequelize } = require('sequelize');

/**
 * Instância do Sequelize
 */

let sequelize;
// Configuração para MySQL
sequelize = new Sequelize(
  process.env.DB_NAME || 'gerencie_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
  logging: false, // Não mostrar queries SQL no console
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true
    }
  }
);

/**
 * Testa a conexão com o banco de dados
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: true });
    // }
    console.log('Banco de dados conectado.');
  } catch (error) {
    console.error('Erro ao conectar ao MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
