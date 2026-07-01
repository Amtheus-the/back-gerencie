


// Conexão PostgreSQL removida. Este controller não utiliza mais Pool.

// Salva mensagem do chatbot (agora usando Sequelize/MySQL)
const ChatbotConversa = require('../models/ChatbotConversa');
exports.saveChatMessage = async (req, res) => {
  try {
    console.log('Recebendo mensagem do chatbot...');
    console.log('Body recebido:', req.body);
    const { user_id, mensagem, sender, contador_mensagens, bloqueado } = req.body;
    if (!user_id || !mensagem) {
      console.log('Dados obrigatórios ausentes:', { user_id, mensagem });
      return res.status(400).json({ error: 'user_id e mensagem são campos obrigatórios.' });
    }
    const novaMsg = await ChatbotConversa.create({
      user_id,
      mensagem,
      sender,
      contador_mensagens,
      bloqueado,
      data_envio: new Date(),
    });
    console.log('Mensagem salva com sucesso:', novaMsg.toJSON());
    res.status(201).json(novaMsg);
  } catch (err) {
    console.error('❌ Erro ao salvar mensagem no banco:', err);
    res.status(500).json({ error: 'Erro ao salvar mensagem', details: err.message });
  }
};

// Consulta mensagens do usuário (histórico desativado — sem armazenamento no MySQL ainda)
exports.getUserChatMessages = async (req, res) => {
  res.json([]);
};

// Consulta se usuário está bloqueado (sem limite de mensagens por enquanto)
exports.isUserBlocked = async (req, res) => {
  res.json({ bloqueado: false });
};

module.exports = exports;
