/**
 * Runner de migrations simples (com rollback).
 *   npm run migrate            → aplica as pendentes (em ordem de nome)
 *   npm run migrate:status     → lista aplicadas e pendentes
 *   npm run migrate:down       → desfaz a ÚLTIMA aplicada (use --all pra desfazer todas)
 * Cada arquivo em backend/migrations/ exporta { up(sequelize), down(sequelize) }.
 * O banco usado é o do .env (DB_HOST); pra produção rode com DB_HOST=srv1722.hstgr.io.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

const PASTA = path.join(__dirname, '..', 'migrations');
const acao = process.argv[2] || 'up';

(async () => {
  await sequelize.authenticate();
  await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY, executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const arquivos = fs.readdirSync(PASTA).filter((f) => f.endsWith('.js')).sort();
  const aplicadas = (await sequelize.query('SELECT name FROM schema_migrations ORDER BY name', { type: 'SELECT' })).map((r) => r.name);
  const pendentes = arquivos.filter((f) => !aplicadas.includes(f));

  if (acao === 'status') {
    arquivos.forEach((f) => console.log(aplicadas.includes(f) ? '✅' : '⏳', f));
    if (!arquivos.length) console.log('(nenhuma migration)');
  } else if (acao === 'up') {
    if (!pendentes.length) console.log('Nada pendente.');
    for (const f of pendentes) {
      console.log('→ aplicando', f);
      await require(path.join(PASTA, f)).up(sequelize);
      await sequelize.query('INSERT INTO schema_migrations (name) VALUES (?)', { replacements: [f] });
    }
  } else if (acao === 'down') {
    const desfazer = process.argv.includes('--all') ? [...aplicadas].reverse() : aplicadas.slice(-1);
    if (!desfazer.length) console.log('Nada para desfazer.');
    for (const f of desfazer) {
      console.log('← desfazendo', f);
      await require(path.join(PASTA, f)).down(sequelize);
      await sequelize.query('DELETE FROM schema_migrations WHERE name = ?', { replacements: [f] });
    }
  } else {
    console.log('Use: up | down | status');
  }
  await sequelize.close();
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
