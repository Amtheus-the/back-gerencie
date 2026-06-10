const express = require('express');
const axios = require('axios');
const { User, Faturamento } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');
const router = express.Router();



// Endpoint para iniciar o robô eCAC
router.post('/iniciar-robo-ecac', async (req, res) => {
  const { login, senha } = req.body;
  try {
    const response = await axios.post('http://localhost:5001/iniciar-robo-ecac', { login, senha });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: 'erro', mensagem: error.message });
  }
});

// Endpoint para consultar status do robô
router.get('/status-robo', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5001/status-robo');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ status: 'erro', mensagem: error.message });
  }
});

// Integração real: repassa a requisição para o robô Python
router.post('/processar-lancamentos', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:5001/processar-lancamentos', req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao processar lançamentos', erro: error.message });
  }
});

// Endpoint para processar apenas o último lançamento do banco
router.post('/processar-lancamento-unico', verificarToken, async (req, res) => {
  try {
    // Busca o último lançamento
    const ultimoLancamento = await Faturamento.findOne({
      order: [['createdAt', 'DESC']],
    });
    if (!ultimoLancamento) {
      return res.status(404).json({ mensagem: 'Nenhum lançamento encontrado.' });
    }

    // Busca o usuário responsável pelo lançamento
    const usuario = await User.findByPk(ultimoLancamento.userId);
    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário do lançamento não encontrado.' });
    }

    // ATENÇÃO: senha_ecac precisa existir no model User e estar preenchida
    if (!usuario.senha_ecac) {
      return res.status(400).json({ mensagem: 'Usuário não possui senha_ecac cadastrada.' });
    }

    // Monta o payload para o robô Python
    const payload = {
      usuario: {
        nome: usuario.nome,
        cpf: usuario.cpf,
        senha_ecac: usuario.senha_ecac
      },
      lancamentos: [
        {
          descricao: ultimoLancamento.descricao,
          valor: ultimoLancamento.valor,
          data: ultimoLancamento.data,
          cpf_do_pagador: ultimoLancamento.pagadorCpf || usuario.cpf
        }
      ]
    };

    // Log para debug
    console.log('[Node] Payload enviado ao Python:', JSON.stringify(payload, null, 2));

    // Envia para o robô Python
    const response = await axios.post('http://localhost:5001/processar-lancamentos', payload);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao processar lançamento', erro: error.message });
  }
});

module.exports = router;



