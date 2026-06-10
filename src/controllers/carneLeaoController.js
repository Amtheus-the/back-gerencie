/**
 * Controller de Carnê Leão
 *
 * Fluxo simplificado:
 *  1. Admin abre PerfilClinica → aba Carnê Leão
 *  2. Vê os meses com faturamentos PF e os lançamentos individuais (paciente, data, valor)
 *  3. Usa esses dados para emitir o Carnê Leão manualmente no eCAC
 *  4. Volta e anexa o comprovante/DARF — só isso
 */

const { CarneLeao, Clinica } = require('../models');
const { sequelize } = require('../config/database');
const path = require('path');
const fs   = require('fs').promises;

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* ─────────────────────────────────────────────────────────────────────────
   Listar meses (faturamentos PF) + status do carnê leão
   GET /api/operacional/clinicas/:clinicaId/carne-leao
   ───────────────────────────────────────────────────────────────────────── */
exports.listar = async (req, res) => {
  try {
    const { clinicaId } = req.params;

    // Verificar se a clínica existe e é PF/HÍBRIDO
    const clinica = await Clinica.findByPk(clinicaId, { attributes: ['id', 'nome', 'tipoPessoa'] });
    if (!clinica) {
      return res.status(404).json({ erro: 'Clínica não encontrada' });
    }
    if (clinica.tipoPessoa === 'PJ') {
      return res.json({ meses: [], aviso: 'Clínica PJ não precisa de Carnê Leão' });
    }

    // 1. Faturamentos PF agrupados por mês (para o sumário da tabela)
    const faturamentosAgrupados = await sequelize.query(
      `SELECT
         MONTH(data) AS mes,
         YEAR(data)  AS ano,
         COALESCE(SUM(CASE WHEN tipo_pessoa = 'PF' OR tipo_pessoa IS NULL THEN valor ELSE 0 END), 0) AS valor_pf,
         COUNT(CASE WHEN tipo_pessoa = 'PF' OR tipo_pessoa IS NULL THEN 1 END) AS quantidade_pf
       FROM faturamentos
       WHERE clinica_id = :clinicaId
       GROUP BY YEAR(data), MONTH(data)
       HAVING valor_pf > 0
       ORDER BY ano DESC, mes DESC`,
      { replacements: { clinicaId }, type: sequelize.QueryTypes.SELECT }
    );

    // 2. Lançamentos PF individuais (para exibir no modal — inclui CPF do paciente)
    const lancamentosIndividuais = await sequelize.query(
      `SELECT
         f.id, f.descricao, f.paciente, f.cpf, f.valor, f.data, f.forma_pagamento,
         MONTH(f.data) AS mes, YEAR(f.data) AS ano
       FROM faturamentos f
       WHERE f.clinica_id = :clinicaId
         AND (f.tipo_pessoa = 'PF' OR f.tipo_pessoa IS NULL)
       ORDER BY f.data DESC`,
      { replacements: { clinicaId }, type: sequelize.QueryTypes.SELECT }
    );

    // Agrupar lançamentos individuais por mês
    const lancamentosPorMes = {};
    lancamentosIndividuais.forEach(f => {
      const key = `${f.mes}-${f.ano}`;
      if (!lancamentosPorMes[key]) lancamentosPorMes[key] = [];
      lancamentosPorMes[key].push({
        id:             f.id,
        paciente:       f.paciente || '—',
        cpf:            f.cpf     || null,
        descricao:      f.descricao || '—',
        valor:          parseFloat(f.valor),
        data:           f.data,
        formaPagamento: f.forma_pagamento,
      });
    });

    // 3. Registros de comprovante já anexados
    const registros = await CarneLeao.findAll({
      where: { clinicaId },
      order: [['ano', 'DESC'], ['mes', 'DESC']]
    });
    const registroMap = {};
    registros.forEach(r => { registroMap[`${r.mes}-${r.ano}`] = r; });

    // 4. Montar lista de meses
    const meses = faturamentosAgrupados.map(f => {
      const key     = `${f.mes}-${f.ano}`;
      const registro = registroMap[key];
      return {
        mes:                  f.mes,
        ano:                  f.ano,
        label:                `${MESES[f.mes]}/${f.ano}`,
        valorFaturamentoPf:   parseFloat(f.valor_pf),
        quantidadeLancamentos: parseInt(f.quantidade_pf),
        lancamentos:          lancamentosPorMes[key] || [],
        // Comprovante (se já foi anexado)
        id:          registro?.id          || null,
        observacoes: registro?.observacoes || null,
        arquivoUrl:  registro?.arquivoUrl  || null,
        arquivoNome: registro?.arquivoNome || null,
        anexadoEm:   registro?.processadoEm || null,
      };
    });

    meses.sort((a, b) => b.ano - a.ano || b.mes - a.mes);
    res.json({ meses });
  } catch (error) {
    console.error('Erro ao listar carnê leão:', error);
    res.status(500).json({ erro: 'Erro ao listar carnê leão', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Anexar comprovante (criar ou atualizar registro)
   POST /api/operacional/clinicas/:clinicaId/carne-leao
   Body (multipart): mes, ano, observacoes?, [arquivo]
   ───────────────────────────────────────────────────────────────────────── */
exports.processar = async (req, res) => {
  try {
    const { clinicaId } = req.params;
    const { mes, ano, observacoes } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({ erro: 'Mês e ano são obrigatórios' });
    }

    // Buscar faturamento PF total do mês (para guardar no registro)
    const [fatResult] = await sequelize.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo_pessoa = 'PF' OR tipo_pessoa IS NULL THEN valor ELSE 0 END), 0) AS valor_pf
       FROM faturamentos
       WHERE clinica_id = :clinicaId AND MONTH(data) = :mes AND YEAR(data) = :ano`,
      { replacements: { clinicaId, mes, ano }, type: sequelize.QueryTypes.SELECT }
    );
    const valorPf = parseFloat(fatResult?.valor_pf || 0);

    // Criar ou recuperar registro existente
    let [registro, created] = await CarneLeao.findOrCreate({
      where: { clinicaId, mes: parseInt(mes), ano: parseInt(ano) },
      defaults: {
        clinicaId, mes: parseInt(mes), ano: parseInt(ano),
        valorFaturamentoPf: valorPf,
        valorImposto: 0,
        status: 'processado',
        observacoes: observacoes || null,
        processadoEm: new Date()
      }
    });

    if (!created) {
      registro.valorFaturamentoPf = valorPf;
      if (observacoes !== undefined) registro.observacoes = observacoes;
      if (!registro.processadoEm) registro.processadoEm = new Date();
      registro.status = 'processado';
    }

    // Upload de comprovante
    if (req.file) {
      if (registro.arquivoUrl) {
        try { await fs.unlink(registro.arquivoUrl); } catch {}
      }
      registro.arquivoUrl     = req.file.path;
      registro.arquivoNome    = req.file.originalname;
      registro.arquivoTamanho = req.file.size;
    }

    await registro.save();

    res.json({
      mensagem: created ? 'Comprovante anexado com sucesso' : 'Registro atualizado com sucesso',
      registro: {
        id:          registro.id,
        mes:         registro.mes,
        ano:         registro.ano,
        label:       `${MESES[registro.mes]}/${registro.ano}`,
        observacoes: registro.observacoes,
        arquivoNome: registro.arquivoNome,
        anexadoEm:   registro.processadoEm,
      }
    });
  } catch (error) {
    console.error('Erro ao processar carnê leão:', error);
    res.status(500).json({ erro: 'Erro ao processar carnê leão', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Atualizar apenas o status
   PUT /api/operacional/carne-leao/:id/status
   Body: { status, observacoes? }
   ───────────────────────────────────────────────────────────────────────── */
exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;

    if (!['pendente', 'processado', 'pago'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    const registro = await CarneLeao.findByPk(id);
    if (!registro) {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }

    registro.status = status;
    if (observacoes !== undefined) registro.observacoes = observacoes;
    await registro.save();

    res.json({ mensagem: 'Status atualizado', status: registro.status });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ erro: 'Erro ao atualizar status', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Download do arquivo (DARF/comprovante)
   GET /api/operacional/carne-leao/:id/arquivo
   ───────────────────────────────────────────────────────────────────────── */
exports.downloadArquivo = async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await CarneLeao.findByPk(id);
    if (!registro || !registro.arquivoUrl) {
      return res.status(404).json({ erro: 'Arquivo não encontrado' });
    }

    try {
      await fs.access(registro.arquivoUrl);
    } catch {
      return res.status(404).json({ erro: 'Arquivo não encontrado no servidor' });
    }

    res.download(registro.arquivoUrl, registro.arquivoNome || 'comprovante.pdf');
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ erro: 'Erro ao fazer download', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Deletar registro
   DELETE /api/operacional/carne-leao/:id
   ───────────────────────────────────────────────────────────────────────── */
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await CarneLeao.findByPk(id);
    if (!registro) {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }

    // Deletar arquivo físico se existir
    if (registro.arquivoUrl) {
      try { await fs.unlink(registro.arquivoUrl); } catch {}
    }

    await registro.destroy();
    res.json({ mensagem: 'Registro excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar registro:', error);
    res.status(500).json({ erro: 'Erro ao deletar registro', detalhes: error.message });
  }
};
