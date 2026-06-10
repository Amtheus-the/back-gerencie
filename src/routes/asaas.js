const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Clinica } = require('../models');

const _rawKey = process.env.ASAAS_API_KEY || '';
const ASAAS_API_KEY = _rawKey.startsWith('$') ? _rawKey : '$' + _rawKey;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const VALOR_PRO = 89.90;

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY
};

// Garante que o cliente existe no Asaas e retorna o ID
async function garantirCliente(clinica) {
  if (clinica.asaasCustomerId) return clinica.asaasCustomerId;

  const cpfCnpj = clinica.cnpj || clinica.cpf;
  const busca = await axios.get(`${ASAAS_API_URL}/customers?cpfCnpj=${cpfCnpj}`, { headers: asaasHeaders });
  if (busca.data?.data?.length > 0) {
    const customerId = busca.data.data[0].id;
    await clinica.update({ asaasCustomerId: customerId });
    return customerId;
  }

  const criacao = await axios.post(`${ASAAS_API_URL}/customers`, {
    name: clinica.nome,
    cpfCnpj,
    email: clinica.email,
    phone: clinica.telefone,
    mobilePhone: clinica.telefone,
    postalCode: clinica.cep,
    addressNumber: clinica.numero,
    addressComplement: clinica.complemento || ''
  }, { headers: asaasHeaders });

  await clinica.update({ asaasCustomerId: criacao.data.id });
  return criacao.data.id;
}

// Listar cobranças do Asaas
router.get('/cobrancas', async (req, res) => {
  const { customer } = req.query;
  try {
    const response = await axios.get(
      `${ASAAS_API_URL}/payments${customer ? `?customer=${customer}` : ''}`,
      { headers: asaasHeaders }
    );
    res.json(response.data);
  } catch (err) {
    console.error('[ASAAS /cobrancas] Erro:', err.response?.status, JSON.stringify(err.response?.data), err.message);
    console.error('[ASAAS /cobrancas] API_URL:', ASAAS_API_URL, '| KEY presente:', !!ASAAS_API_KEY, '| KEY inicio:', ASAAS_API_KEY?.slice(0,10));
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Excluir cobrança
router.delete('/cobrancas/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${ASAAS_API_URL}/payments/${req.params.id}`, { headers: asaasHeaders });
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Buscar assinatura ativa da clínica
router.get('/assinatura', async (req, res) => {
  const { clinicaId } = req.query;
  try {
    const clinica = await Clinica.findByPk(clinicaId);
    if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' });
    if (!clinica.asaasSubscriptionId) return res.json(null);

    const response = await axios.get(`${ASAAS_API_URL}/subscriptions/${clinica.asaasSubscriptionId}`, { headers: asaasHeaders });
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Criar assinatura (cartão ou PIX)
router.post('/criar-assinatura', async (req, res) => {
  const { clinicaId, billingType, creditCard, remoteIp } = req.body;
  try {
    const clinica = await Clinica.findByPk(clinicaId);
    if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' });

    const customerId = await garantirCliente(clinica);

    // Se já tem assinatura ativa, cancela antes de criar nova
    if (clinica.asaasSubscriptionId) {
      try {
        await axios.delete(`${ASAAS_API_URL}/subscriptions/${clinica.asaasSubscriptionId}`, { headers: asaasHeaders });
      } catch (_) { /* ignora se já cancelada */ }
    }

    const hoje = new Date().toISOString().slice(0, 10);

    const payload = {
      customer: customerId,
      billingType,
      value: VALOR_PRO,
      nextDueDate: hoje,
      cycle: 'MONTHLY',
      description: 'Assinatura Pro Gerencie Odonto'
    };

    if (billingType === 'CREDIT_CARD') {
      payload.creditCard = creditCard;
      payload.creditCardHolderInfo = {
        name: clinica.nome,
        email: clinica.email,
        cpfCnpj: clinica.cnpj || clinica.cpf,
        phone: clinica.telefone,
        mobilePhone: clinica.telefone,
        postalCode: clinica.cep,
        addressNumber: clinica.numero,
        addressComplement: clinica.complemento || ''
      };
      payload.remoteIp = remoteIp || '127.0.0.1';
    }

    const response = await axios.post(`${ASAAS_API_URL}/subscriptions`, payload, { headers: asaasHeaders });
    const subscription = response.data;

    await clinica.update({
      asaasSubscriptionId: subscription.id,
      metodoPagamento: billingType,
      plano: 'PRO',
      dataAssinatura: new Date(),
      dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Para PIX, busca o QR code da primeira cobrança gerada
    if (billingType === 'PIX') {
      try {
        const pagamentos = await axios.get(
          `${ASAAS_API_URL}/subscriptions/${subscription.id}/payments`,
          { headers: asaasHeaders }
        );
        const primeiroPagamento = pagamentos.data?.data?.[0];
        if (primeiroPagamento) {
          const qr = await axios.get(`${ASAAS_API_URL}/payments/${primeiroPagamento.id}/pixQrCode`, { headers: asaasHeaders });
          return res.json({ subscription, pixQrCode: qr.data, paymentId: primeiroPagamento.id });
        }
      } catch (pixErr) {
        console.error('[ASAAS] Erro ao buscar QR PIX:', pixErr.response?.data || pixErr.message);
      }
    }

    res.json({ subscription });
  } catch (err) {
    console.error('[ASAAS] Erro ao criar assinatura:', err.response?.data || err.message);
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Cancelar assinatura
router.delete('/cancelar-assinatura', async (req, res) => {
  const { clinicaId } = req.body;
  try {
    const clinica = await Clinica.findByPk(clinicaId);
    if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' });
    if (!clinica.asaasSubscriptionId) return res.status(400).json({ error: 'Nenhuma assinatura ativa' });

    await axios.delete(`${ASAAS_API_URL}/subscriptions/${clinica.asaasSubscriptionId}`, { headers: asaasHeaders });

    await clinica.update({
      asaasSubscriptionId: null,
      plano: 'FREE',
      dataVencimento: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
