/**
 * Migration: criar tabela carne_leao
 * Controla o workflow mensal de Carnê Leão por clínica PF/HÍBRIDO
 *
 * Executar:
 *   node backend/scripts/criar_tabela_carne_leao.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');

const SQL = `
CREATE TABLE IF NOT EXISTS carne_leao (
  id                   CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  clinica_id           CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  mes                  TINYINT         NOT NULL COMMENT 'Mês de competência (1-12)',
  ano                  SMALLINT        NOT NULL COMMENT 'Ano de competência',
  valor_faturamento_pf DECIMAL(12,2)   NOT NULL DEFAULT 0  COMMENT 'Total de faturamentos PF naquele mês',
  valor_imposto        DECIMAL(12,2)   NOT NULL DEFAULT 0  COMMENT 'Imposto calculado pela tabela progressiva',
  status               ENUM('pendente','processado','pago')
                                       NOT NULL DEFAULT 'pendente',
  observacoes          TEXT            NULL     COMMENT 'Notas do admin',
  arquivo_url          VARCHAR(1000)   NULL     COMMENT 'Caminho local (ou S3 key) do comprovante/DARF',
  arquivo_nome         VARCHAR(500)    NULL     COMMENT 'Nome original do arquivo',
  arquivo_tamanho      INT             NULL     COMMENT 'Tamanho em bytes',
  processado_em        DATETIME        NULL     COMMENT 'Quando o admin processou no eCAC',
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_carne_leao_clinica
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT unique_clinica_mes_ano
    UNIQUE KEY (clinica_id, mes, ano),

  INDEX idx_carne_leao_clinica  (clinica_id),
  INDEX idx_carne_leao_mes_ano  (mes, ano),
  INDEX idx_carne_leao_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    await sequelize.query(SQL);
    console.log('✅ Tabela carne_leao criada com sucesso (ou já existia)');

    // Verifica se foi criada
    const [rows] = await sequelize.query(`SHOW TABLES LIKE 'carne_leao'`);
    if (rows.length > 0) {
      console.log('✅ Tabela carne_leao confirmada no banco');
    }
  } catch (err) {
    console.error('❌ Erro ao criar tabela:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
