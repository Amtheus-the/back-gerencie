const { Agendamento, Procedimento, Paciente, AnotacaoPaciente, ArquivoPaciente, User } = require('../models');
const { s3, S3_BUCKET, getPresignedUrl, extractS3Key } = require('../config/s3');
const { Op } = require('sequelize');

// Todos da mesma clínica veem todos os pacientes da clínica
const filtroPaciente = (req) => ({ clinica_id: req.user.clinicaId });

class PacienteController {
  // Histórico de procedimentos do paciente
  async historicoProcedimentos(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Busca agendamentos do paciente, incluindo dados do procedimento
      const agendamentos = await Agendamento.findAll({
        where: { paciente_id: id, user_id: userId },
        include: [
          {
            model: Procedimento,
            as: 'procedimento',
            attributes: ['nome', 'descricao', 'valorPadrao']
          }
        ],
        order: [['data_hora', 'DESC']]
      });

      // Mapeia para um formato mais amigável
      const historico = agendamentos.map(a => ({
        id: a.id,
        data: a.data_hora,
        procedimento: a.procedimento?.nome || '',
        descricao: a.procedimento?.descricao || '',
        valor: a.procedimento?.valorPadrao || '',
        status: a.status,
        observacoes: a.observacoes
      }));

      return res.json(historico);
    } catch (error) {
      console.error('Erro ao buscar histórico de procedimentos:', error);
      return res.status(500).json({
        message: 'Erro ao buscar histórico de procedimentos',
        error: error.message
      });
    }
  }
  // Listar pacientes com paginação e busca server-side
  async listar(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(9999, parseInt(req.query.limit) || 20);
      const offset = (page - 1) * limit;
      const busca = req.query.busca?.trim();

      const where = { ...filtroPaciente(req) };
      if (busca) {
        where[Op.or] = [
          { nome: { [Op.like]: `%${busca}%` } },
          { cpfCnpj: { [Op.like]: `%${busca}%` } }
        ];
      }

      const { count, rows } = await Paciente.findAndCountAll({
        where,
        order: [['nome', 'ASC']],
        limit,
        offset
      });

      return res.json({
        pacientes: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        limit
      });
    } catch (error) {
      console.error('Erro ao listar pacientes:', error);
      return res.status(500).json({
        message: 'Erro ao buscar pacientes',
        error: error.message
      });
    }
  }

  // Buscar paciente por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findOne({
        where: { id, ...filtroPaciente(req) }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      return res.json(paciente);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar paciente',
        error: error.message 
      });
    }
  }

  // Criar novo paciente
  async criar(req, res) {
    try {
      const user_id = req.user.id;
      const clinica_id = req.user.clinicaId;
      // Garante que os campos corretos do banco sejam usados
      const dadosPaciente = { ...req.body, user_id, clinica_id };

      const paciente = await Paciente.create(dadosPaciente);

      return res.status(201).json(paciente);
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao criar paciente',
        error: error.message 
      });
    }
  }

  // Atualizar paciente
  async atualizar(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findOne({
        where: { id, ...filtroPaciente(req) }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      // Remove null/undefined para não sobrescrever NOT NULL columns
      const dados = Object.fromEntries(
        Object.entries(req.body).filter(([, v]) => v !== null && v !== undefined)
      );
      await paciente.update(dados);

      return res.json(paciente);
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao atualizar paciente',
        error: error.message 
      });
    }
  }

  // Deletar paciente
  async deletar(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findOne({
        where: { id, ...filtroPaciente(req) }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      await paciente.destroy();

      return res.json({ message: 'Paciente removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      const isForeignKey = error.name === 'SequelizeForeignKeyConstraintError' || error.message?.includes('foreign key');
      if (isForeignKey) {
        return res.status(409).json({ message: 'Não é possível excluir este paciente pois ele possui agendamentos ou faturamentos vinculados.' });
      }
      return res.status(500).json({
        message: 'Erro ao deletar paciente',
        error: error.message 
      });
    }
  }

  // Buscar pacientes (para autocomplete)
  async buscar(req, res) {
    try {
      const { termo } = req.query;

      const where = { ...filtroPaciente(req), ativo: true };

      if (termo) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { nome: { [Op.iLike]: `%${termo}%` } },
          { cpfCnpj: { [Op.iLike]: `%${termo}%` } }
        ];
      }

      const pacientes = await Paciente.findAll({
        where,
        order: [['nome', 'ASC']],
        limit: 50
      });

      return res.json(pacientes);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar pacientes',
        error: error.message 
      });
    }
  }
  async buscarOdontograma(req, res) {
    try {
      const { id } = req.params;
      const clinicaId = req.user.clinicaId;
      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId }, attributes: ['id', 'odontogramaData'] });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });
      let dados = paciente.odontogramaData;
      if (typeof dados === 'string') { try { dados = JSON.parse(dados); } catch { dados = {}; } }
      res.json({ dados: dados || {} });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar odontograma', detail: error.message });
    }
  }

  async salvarOdontograma(req, res) {
    try {
      const { id } = req.params;
      const { dente, status, procedimento, obs } = req.body;
      const clinicaId = req.user.clinicaId;
      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId } });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });
      let dados = paciente.odontogramaData || {};
      if (typeof dados === 'string') { try { dados = JSON.parse(dados); } catch { dados = {}; } }
      if (status === null) {
        delete dados[dente];
      } else {
        dados[dente] = { status, procedimento: procedimento || '', obs: obs || '', atualizadoEm: new Date().toISOString() };
      }
      await paciente.update({ odontogramaData: dados });
      res.json({ success: true, dados });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar odontograma', detail: error.message });
    }
  }

  // Histórico de anotações/observações do paciente (uma por consulta, não sobrescreve)
  async listarAnotacoes(req, res) {
    try {
      const { id } = req.params;
      const clinicaId = req.user.clinicaId;
      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId } });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

      const anotacoes = await AnotacaoPaciente.findAll({
        where: { pacienteId: id, clinicaId },
        include: [{ model: User, as: 'autor', attributes: ['id', 'nome'] }],
        order: [['createdAt', 'DESC']]
      });
      res.json(anotacoes);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar anotações', detail: error.message });
    }
  }

  async criarAnotacao(req, res) {
    try {
      const { id } = req.params;
      const { texto } = req.body;
      const clinicaId = req.user.clinicaId;
      if (!texto || !texto.trim()) {
        return res.status(400).json({ error: 'Texto da anotação é obrigatório' });
      }
      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId } });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

      const anotacao = await AnotacaoPaciente.create({
        pacienteId: id,
        clinicaId,
        userId: req.user.id,
        texto: texto.trim(),
      });
      const comAutor = await AnotacaoPaciente.findByPk(anotacao.id, {
        include: [{ model: User, as: 'autor', attributes: ['id', 'nome'] }],
      });
      res.status(201).json(comAutor);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar anotação', detail: error.message });
    }
  }

  // Pastas e arquivos do paciente (fotos, raio-x, contratos, etc)
  async listarArquivos(req, res) {
    try {
      const { id } = req.params;
      const clinicaId = req.user.clinicaId;
      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId } });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

      const arquivos = await ArquivoPaciente.findAll({
        where: { pacienteId: id, clinicaId },
        include: [{ model: User, as: 'autor', attributes: ['id', 'nome'] }],
        order: [['createdAt', 'ASC']],
      });
      res.json(arquivos);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar arquivos', detail: error.message });
    }
  }

  async criarPasta(req, res) {
    try {
      const { id } = req.params;
      const { pasta } = req.body;
      const clinicaId = req.user.clinicaId;
      if (!pasta || !pasta.trim()) {
        return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
      }
      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId } });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

      const novaPasta = await ArquivoPaciente.create({
        pacienteId: id,
        clinicaId,
        userId: req.user.id,
        pasta: pasta.trim().slice(0, 150),
      });
      res.status(201).json(novaPasta);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar pasta', detail: error.message });
    }
  }

  async uploadArquivo(req, res) {
    try {
      const { id } = req.params;
      const clinicaId = req.user.clinicaId;
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

      const paciente = await Paciente.findOne({ where: { id, clinica_id: clinicaId } });
      if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

      const arquivo = await ArquivoPaciente.create({
        pacienteId: id,
        clinicaId,
        userId: req.user.id,
        pasta: (req.query.pasta || 'Geral').toString().slice(0, 150),
        nomeArquivo: req.file.originalname,
        url: req.file.location,
        tamanho: req.file.size,
        tipo: req.file.mimetype,
      });
      const comAutor = await ArquivoPaciente.findByPk(arquivo.id, {
        include: [{ model: User, as: 'autor', attributes: ['id', 'nome'] }],
      });
      res.status(201).json(comAutor);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao enviar arquivo', detail: error.message });
    }
  }

  async deletarArquivo(req, res) {
    try {
      const { id, arquivoId } = req.params;
      const clinicaId = req.user.clinicaId;
      const arquivo = await ArquivoPaciente.findOne({ where: { id: arquivoId, pacienteId: id, clinicaId } });
      if (!arquivo) return res.status(404).json({ error: 'Arquivo não encontrado' });

      if (arquivo.url) {
        const key = extractS3Key(arquivo.url);
        if (key) {
          try { await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise(); } catch {}
        }
      }
      await arquivo.destroy();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir arquivo', detail: error.message });
    }
  }

  // Exclui a pasta inteira (todos os arquivos dentro + a própria pasta)
  async deletarPasta(req, res) {
    try {
      const { id, pasta } = req.params;
      const clinicaId = req.user.clinicaId;
      const nomePasta = decodeURIComponent(pasta);

      const itens = await ArquivoPaciente.findAll({ where: { pacienteId: id, clinicaId, pasta: nomePasta } });
      if (itens.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });

      for (const item of itens) {
        if (item.url) {
          const key = extractS3Key(item.url);
          if (key) {
            try { await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise(); } catch {}
          }
        }
      }
      await ArquivoPaciente.destroy({ where: { pacienteId: id, clinicaId, pasta: nomePasta } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir pasta', detail: error.message });
    }
  }

  async downloadArquivo(req, res) {
    try {
      const { id, arquivoId } = req.params;
      const clinicaId = req.user.clinicaId;
      const arquivo = await ArquivoPaciente.findOne({ where: { id: arquivoId, pacienteId: id, clinicaId } });
      if (!arquivo || !arquivo.url) return res.status(404).json({ error: 'Arquivo não encontrado' });

      const key = extractS3Key(arquivo.url);
      if (!key) return res.status(404).json({ error: 'Arquivo não encontrado' });
      const urlAssinada = getPresignedUrl(key);
      res.json({ url: urlAssinada });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao baixar arquivo', detail: error.message });
    }
  }
}

module.exports = new PacienteController();
