/**
 * Validação de entrada das rotas de escrita mais sensíveis (express-validator).
 * Devolve 400 com a primeira mensagem, em português, antes de o controller (ou o banco) ver o dado.
 */
const { body, validationResult } = require('express-validator');

const responderErros = (req, res, next) => {
  const erros = validationResult(req);
  if (erros.isEmpty()) return next();
  const lista = erros.array();
  return res.status(400).json({ success: false, message: lista[0].msg, errors: lista.map((e) => ({ campo: e.path, mensagem: e.msg })) });
};

const textoObrigatorio = (campo, rotulo, max = 255) =>
  body(campo).exists({ values: 'null' }).withMessage(`${rotulo} é obrigatório`).bail().isString().withMessage(`${rotulo} inválido`).bail().trim().isLength({ min: 1, max }).withMessage(`${rotulo} é obrigatório (máx. ${max} caracteres)`);

const valorPositivo = body('valor').custom((v) => {
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 100000000;
}).withMessage('Valor inválido');

const dataISO = body('data').matches(/^\d{4}-\d{2}-\d{2}/).withMessage('Data inválida');

const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Transferência', 'Cheque', 'Outros'];

exports.validarNovoFaturamento = [
  textoObrigatorio('descricao', 'Descrição'),
  valorPositivo,
  dataISO,
  body('formaPagamento').isIn(FORMAS_PAGAMENTO).withMessage('Forma de pagamento inválida'),
  body('tipoPessoa').isIn(['PF', 'PJ']).withMessage('Tipo de pessoa inválido'),
  body('observacoes').optional({ nullable: true }).isString().withMessage('Observações inválidas').isLength({ max: 5000 }).withMessage('Observações muito longas'),
  responderErros,
];

exports.validarNovaDespesa = [
  textoObrigatorio('descricao', 'Descrição'),
  valorPositivo,
  dataISO,
  textoObrigatorio('categoria', 'Categoria'),
  body('observacoes').optional({ nullable: true }).isString().withMessage('Observações inválidas').isLength({ max: 5000 }).withMessage('Observações muito longas'),
  responderErros,
];
