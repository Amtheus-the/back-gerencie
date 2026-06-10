/**
 * Script para testar os endpoints do dashboard admin
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testarEndpoints() {
  try {
    // Gerar token para o usuário admin
    const userId = '6e5ebaaa-48a1-4d4b-a5c8-dcbab46ebb73';
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('🔑 Token gerado para teste:', token.substring(0, 50) + '...\n');
    console.log('📡 Testando endpoints...\n');

    // 1. Estatísticas Gerais
    console.log('1️⃣  GET /admin/estatisticas');
    try {
      const res1 = await makeRequest('/admin/estatisticas', token);
      console.log('   ✅ Status:', res1.status);
      if (res1.status === 200) {
        console.log('   📦 Dados:', JSON.stringify(res1.data, null, 2));
      } else {
        console.log('   ❌ Resposta:', res1.data);
      }
    } catch (error) {
      console.log('   ❌ Erro:', error.message);
    }

    console.log('\n2️⃣  GET /admin/usuarios');
    try {
      const res2 = await makeRequest('/admin/usuarios', token);
      console.log('   ✅ Status:', res2.status);
      if (res2.status === 200) {
        console.log('   📦 Total de usuários:', res2.data.totalUsuarios);
      } else {
        console.log('   ❌ Resposta:', res2.data);
      }
    } catch (error) {
      console.log('   ❌ Erro:', error.message);
    }

    console.log('\n3️⃣  GET /admin/atividades');
    try {
      const res3 = await makeRequest('/admin/atividades', token);
      console.log('   ✅ Status:', res3.status);
      if (res3.status === 200) {
        console.log('   📦 Total de atividades:', Array.isArray(res3.data) ? res3.data.length : 'N/A');
      } else {
        console.log('   ❌ Resposta:', res3.data);
      }
    } catch (error) {
      console.log('   ❌ Erro:', error.message);
    }

    console.log('\n4️⃣  GET /admin/grafico-crescimento');
    try {
      const res4 = await makeRequest('/admin/grafico-crescimento', token);
      console.log('   ✅ Status:', res4.status);
      if (res4.status === 200) {
        console.log('   📦 Dados do gráfico:', res4.data);
      } else {
        console.log('   ❌ Resposta:', res4.data);
      }
    } catch (error) {
      console.log('   ❌ Erro:', error.message);
    }

    console.log('\n5️⃣  GET /admin/distribuicao-tipos');
    try {
      const res5 = await makeRequest('/admin/distribuicao-tipos', token);
      console.log('   ✅ Status:', res5.status);
      if (res5.status === 200) {
        console.log('   📦 Distribuição:', res5.data);
      } else {
        console.log('   ❌ Resposta:', res5.data);
      }
    } catch (error) {
      console.log('   ❌ Erro:', error.message);
    }

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
  }
}

testarEndpoints();
