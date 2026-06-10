// Rota de pacientes desativada (era PostgreSQL). Use os endpoints do Sequelize/MySQL.
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(501).json({ error: 'Endpoint desativado. Use as rotas de pacientes do Sequelize/MySQL.' });
});

module.exports = router;
