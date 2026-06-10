/**
 * Controller para Operações Administrativas
 * Gerencia visualização detalhada dos usuários e upload de documentos
 */

const { Clinica, User, Faturamento, Despesa, Analise, Documento } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

/**
 * Listar usuários com resumo para painel operacional
 */
exports.listarUsuariosOperacional = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.and]: [
        { isAdmin: false }, // Não mostrar admins
        {
          [Op.or]: [
            { nome: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { nomeClinica: { [Op.like]: `%${search}%` } }
          ]
        }
      ]
    } : { isAdmin: false };

    const usuarios = await User.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: ['senha'],
        include: [
          // Total de faturamentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
            )`),
            'totalFaturamentos'
          ],
          // Total de despesas
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM despesas
              WHERE despesas.user_id = User.id
            )`),
            'totalDespesas'
          ],
          // Total de documentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM documentos
              WHERE documentos.user_id = User.id
            )`),
            'totalDocumentos'
          ],
          // Valor total de faturamento
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
            )`),
            'valorTotalFaturamento'
          ],
          // Valor total de despesas
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM despesas
              WHERE despesas.user_id = User.id
            )`),
            'valorTotalDespesas'
          ],
          // Último faturamento
          [
            sequelize.literal(`(
              SELECT data
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
              ORDER BY data DESC
              LIMIT 1
            )`),
            'ultimoFaturamento'
          ],
          // Última despesa
          [
            sequelize.literal(`(
              SELECT data
              FROM despesas
              WHERE despesas.user_id = User.id
              ORDER BY data DESC
              LIMIT 1
            )`),
            'ultimaDespesa'
          ]
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      usuarios: usuarios.rows,
      totalUsuarios: usuarios.count,
      paginaAtual: parseInt(page),
      totalPaginas: Math.ceil(usuarios.count / limit)
    });
  } catch (error) {
    console.error('Erro ao listar usuários operacional:', error);
    res.status(500).json({
      erro: 'Erro ao listar usuários',
      detalhes: error.message
    });
  }
};

/**
 * Obter perfil completo do usuário
 */
exports.getPerfilCompleto = async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar usuário
    const usuario = await User.findByPk(userId, {
      attributes: { exclude: ['senha'] }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Buscar faturamentos
    const faturamentos = await Faturamento.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar despesas
    const despesas = await Despesa.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar documentos
    const documentos = await Documento.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    // Calcular estatísticas
    const totalFaturamento = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);
    const saldo = totalFaturamento - totalDespesas;

    // Calcular impostos estimados (simplificado)
    const impostosEstimados = totalFaturamento * 0.065; // 6,5% estimado para Simples Nacional

    res.json({
      usuario: usuario.toJSON(),
      estatisticas: {
        totalFaturamentos: faturamentos.length,
        totalDespesas: despesas.length,
        totalDocumentos: documentos.length,
        valorTotalFaturamento: totalFaturamento,
        valorTotalDespesas: totalDespesas,
        saldo: saldo,
        impostosEstimados: impostosEstimados,
        lucroLiquido: saldo - impostosEstimados
      },
      faturamentos,
      despesas,
      documentos
    });
  } catch (error) {
    console.error('Erro ao buscar perfil completo:', error);
    res.status(500).json({
      erro: 'Erro ao buscar perfil completo',
      detalhes: error.message
    });
  }
};

/**
 * Upload de documento para o usuário
 */
exports.uploadDocumento = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tipo, titulo, descricao, valor, dataReferencia, faturamentoId, despesaId } = req.body;
    const adminId = req.userId;

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo foi enviado' });
    }

    // Verificar se o usuário existe
    const usuario = await User.findByPk(userId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Criar registro do documento
    const documento = await Documento.create({
      userId,
      tipo: tipo || 'outros',
      titulo,
      descricao,
      nomeArquivo: req.file.originalname,
      caminhoArquivo: req.file.path,
      tamanhoArquivo: req.file.size,
      tipoMime: req.file.mimetype,
      uploadPorAdmin: true,
      adminId,
      valor: valor ? parseFloat(valor) : null,
      dataReferencia: dataReferencia || null,
      faturamentoId: faturamentoId || null,
      despesaId: despesaId || null
    });

    res.status(201).json({
      mensagem: 'Documento enviado com sucesso',
      documento
    });
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error);
    res.status(500).json({
      erro: 'Erro ao fazer upload do documento',
      detalhes: error.message
    });
  }
};

/**
 * Listar documentos de um usuário
 */
exports.listarDocumentosUsuario = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tipo } = req.query;

    const whereClause = { userId };
    if (tipo) {
      whereClause.tipo = tipo;
    }

    const documentos = await Documento.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Faturamento,
          as: 'faturamento',
          attributes: ['id', 'descricao', 'valor', 'data']
        },
        {
          model: Despesa,
          as: 'despesa',
          attributes: ['id', 'descricao', 'valor', 'data']
        }
      ]
    });

    res.json(documentos);
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({
      erro: 'Erro ao listar documentos',
      detalhes: error.message
    });
  }
};

/**
 * Download de documento
 */
exports.downloadDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

    const documento = await Documento.findByPk(documentoId);

    if (!documento) {
      return res.status(404).json({ erro: 'Documento não encontrado' });
    }

    // Verificar se o arquivo existe
    try {
      await fs.access(documento.caminhoArquivo);
    } catch {
      return res.status(404).json({ erro: 'Arquivo não encontrado no servidor' });
    }

    // Marcar como visualizado
    if (!documento.visualizado) {
      documento.visualizado = true;
      documento.dataVisualizacao = new Date();
      await documento.save();
    }

    // Enviar arquivo
    res.download(documento.caminhoArquivo, documento.nomeArquivo);
  } catch (error) {
    console.error('Erro ao fazer download do documento:', error);
    res.status(500).json({
      erro: 'Erro ao fazer download do documento',
      detalhes: error.message
    });
  }
};

/**
 * Deletar documento
 */
exports.deletarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

    const documento = await Documento.findByPk(documentoId);

    if (!documento) {
      return res.status(404).json({ erro: 'Documento não encontrado' });
    }

    // Tentar deletar o arquivo físico
    try {
      await fs.unlink(documento.caminhoArquivo);
    } catch (err) {
      console.warn('Arquivo físico não encontrado:', err.message);
    }

    // Deletar registro do banco
    await documento.destroy();

    res.json({ mensagem: 'Documento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({
      erro: 'Erro ao deletar documento',
      detalhes: error.message
    });
  }
};

/**
 * Listar clínicas com resumo para painel operacional
 */
exports.listarClinicasOperacional = async (req, res) => {
  try {
    console.log('🔵 [Operacional] GET /api/operacional/clinicas - Requisição recebida');
    const { search = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { nome: { [Op.like]: `%${search}%` } },
        { cpf: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    console.log('🔍 [Operacional] Buscando clínicas no banco...');
    const clinicas = await Clinica.findAndCountAll({
      where: whereClause,
      attributes: {
        include: [
          // Número de usuários
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM users
              WHERE users.clinica_id = Clinica.id
              AND users.is_admin = false
            )`),
            'numeroUsuarios'
          ],
          // Total de faturamentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM faturamentos
              WHERE faturamentos.clinica_id = Clinica.id
            )`),
            'totalFaturamentos'
          ],
          // Total de despesas
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM despesas
              WHERE despesas.clinica_id = Clinica.id
            )`),
            'totalDespesas'
          ],
          // Total de documentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM documentos
              WHERE documentos.clinica_id = Clinica.id
            )`),
            'totalDocumentos'
          ],
          // Valor total de faturamento
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM faturamentos
              WHERE faturamentos.clinica_id = Clinica.id
            )`),
            'valorTotalFaturamento'
          ],
          // Valor total de despesas
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM despesas
              WHERE despesas.clinica_id = Clinica.id
            )`),
            'valorTotalDespesas'
          ]
        ]
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nome', 'ASC']]
    });

    console.log(`✅ [Operacional] ${clinicas.count} clínica(s) encontrada(s)`);
    
    res.json({
      clinicas: clinicas.rows,
      total: clinicas.count,
      totalPaginas: Math.ceil(clinicas.count / limit),
      paginaAtual: parseInt(page)
    });

  } catch (error) {
    console.error('❌ [Operacional] Erro ao listar clínicas:', error);
    res.status(500).json({
      erro: 'Erro ao listar clínicas',
      detalhes: error.message
    });
  }
};

/**
 * Buscar perfil completo de uma clínica
 */
exports.getPerfilCompletoClinica = async (req, res) => {
  try {
    const { clinicaId } = req.params;

    // Buscar clínica
    const clinica = await Clinica.findByPk(clinicaId, {
      include: [
        {
          model: User,
          as: 'usuarios',
          attributes: { exclude: ['senha'] },
          where: { isAdmin: false },
          required: false
        }
      ]
    });

    if (!clinica) {
      return res.status(404).json({ erro: 'Clínica não encontrada' });
    }

    // Buscar faturamentos
    const faturamentos = await Faturamento.findAll({
      where: { clinicaId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar despesas
    const despesas = await Despesa.findAll({
      where: { clinicaId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar documentos
    const documentos = await Documento.findAll({
      where: { clinicaId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calcular estatísticas
    const totalFaturamento = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);
    const saldo = totalFaturamento - totalDespesas;
    const impostosEstimados = totalFaturamento * 0.065;

    res.json({
      clinica: clinica.toJSON(),
      faturamentos,
      despesas,
      documentos,
      estatisticas: {
        totalFaturamento,
        totalDespesas,
        saldo,
        impostosEstimados,
        numeroUsuarios: clinica.usuarios?.length || 0,
        numeroFaturamentos: faturamentos.length,
        numeroDespesas: despesas.length,
        numeroDocumentos: documentos.length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil da clínica:', error);
    res.status(500).json({
      erro: 'Erro ao buscar perfil completo da clínica',
      detalhes: error.message
    });
  }
};

module.exports = exports;
