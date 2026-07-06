const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

(async () => {
  const conn = await mysql.createConnection({
    host: "srv1722.hstgr.io",
    user: "u410205205_rootgerencie",
    password: "Gerencie1@",
    database: "u410205205_gerencie"
  });

  try {
    const clinicaId = uuidv4();
    const userId = uuidv4();
    const senhaHash = await bcrypt.hash("MTlips13@", 10);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    await conn.execute(
      `INSERT INTO clinicas (id, nome, tipo_pessoa, cnpj, plano, limite_usuarios, ativo, created_at, updated_at)
       VALUES (?, ?, 'PJ', '66295969000145', 'FREE', 3, 1, ?, ?)`,
      [clinicaId, "Dra Maria Tereza Odontologia e Estetica Ltda", now, now]
    );
    console.log("Clinica criada:", clinicaId);

    await conn.execute(
      `INSERT INTO users (id, nome, email, senha, nome_clinica, cnpj, profissao, ativo, primeiro_acesso, clinica_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Dentista', 1, 1, ?, ?, ?)`,
      [userId, "Maria Tereza Ribeiro de Menezes", "dramaria.trz@gmail.com", senhaHash,
       "Dra Maria Tereza Odontologia e Estetica Ltda", "66295969000145", clinicaId, now, now]
    );
    console.log("Usuario criado:", userId);

    const planos = [
      "Aluguel do Consultório",
      "Despesas com Material Odontológico",
      "Salários e Encargos de Funcionários Registrados no CPF",
      "Despesas com Manutenção de Equipamentos",
      "Despesas com Telefonia e Internet",
      "Despesas com Energia Elétrica",
      "Despesas com Contabilidade",
      "Despesas com Propaganda e Publicidade",
      "Despesas com Produtos de Limpeza e Esterilização"
    ];

    for (const nome of planos) {
      const pid = uuidv4();
      const codigo = Date.now().toString() + Math.floor(Math.random() * 1000);
      await conn.execute(
        `INSERT INTO plano_contas (id, codigo, nome, tipo, dedutivel, ativo, user_id, created_at, updated_at)
         VALUES (?, ?, ?, 'despesa', 1, 1, ?, ?, ?)`,
        [pid, codigo, nome, userId, now, now]
      );
    }
    console.log("Planos de conta criados.");
    console.log("\nRESUMO:");
    console.log("  Email: dramaria.trz@gmail.com");
    console.log("  Senha: MTlips13@");
    console.log("  Clinica ID:", clinicaId);
    console.log("  User ID:", userId);

  } catch (e) {
    console.error("ERRO:", e.message);
    console.error(e);
  } finally {
    conn.end();
  }
})();
