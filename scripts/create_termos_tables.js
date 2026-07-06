const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: 'srv1722.hstgr.io',
    user: 'u410205205_rootgerencie',
    password: 'Gerencie1@',
    database: 'u410205205_gerencie'
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS termos (
      id CHAR(36) NOT NULL PRIMARY KEY,
      clinica_id CHAR(36) NULL,
      titulo VARCHAR(255) NOT NULL,
      tipo ENUM('responsabilidade','anamnese','outro') NOT NULL DEFAULT 'responsabilidade',
      conteudo LONGTEXT NOT NULL,
      padrao TINYINT(1) NOT NULL DEFAULT 0,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_clinica_id (clinica_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ tabela termos criada');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS documentos_paciente (
      id CHAR(36) NOT NULL PRIMARY KEY,
      clinica_id CHAR(36) NOT NULL,
      paciente_id CHAR(36) NOT NULL,
      termo_id CHAR(36) NOT NULL,
      token CHAR(64) NOT NULL UNIQUE,
      status ENUM('pendente','assinado','recusado') NOT NULL DEFAULT 'pendente',
      nome_assinante VARCHAR(255) NULL,
      cpf_assinante VARCHAR(14) NULL,
      ip_assinante VARCHAR(45) NULL,
      assinado_em DATETIME NULL,
      enviado_via ENUM('whatsapp','email','link') NOT NULL DEFAULT 'link',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_clinica (clinica_id),
      INDEX idx_paciente (paciente_id),
      INDEX idx_termo (termo_id),
      INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✅ tabela documentos_paciente criada');

  // Inserir termos padrão do sistema
  const now = new Date().toISOString().slice(0,19).replace('T',' ');

  const termosPadrao = [
    {
      id: uuidv4(),
      titulo: 'Termo de Responsabilidade Geral',
      tipo: 'responsabilidade',
      conteudo: `<h2>TERMO DE RESPONSABILIDADE E CONSENTIMENTO PARA TRATAMENTO ODONTOLÓGICO</h2>
<p>Eu, <strong>{{PACIENTE_NOME}}</strong>, portador(a) do CPF <strong>{{PACIENTE_CPF}}</strong>, declaro que fui devidamente informado(a) pelo(a) Dr(a). <strong>{{DENTISTA_NOME}}</strong>, CRO <strong>{{DENTISTA_CRO}}</strong>, sobre o tratamento odontológico a ser realizado, seus riscos, benefícios e alternativas disponíveis.</p>
<p>Declaro que:</p>
<ul>
  <li>Fui orientado(a) sobre o procedimento proposto e suas etapas;</li>
  <li>Compreendo que resultados podem variar de acordo com cada caso;</li>
  <li>Autorizo a realização dos procedimentos necessários;</li>
  <li>Me comprometo a seguir as orientações pós-operatórias fornecidas;</li>
  <li>Informei todas as condições de saúde relevantes, medicamentos em uso e alergias conhecidas.</li>
</ul>
<p>Este termo foi lido e compreendido por mim antes da assinatura.</p>
<p>Data: <strong>{{DATA}}</strong></p>`
    },
    {
      id: uuidv4(),
      titulo: 'Termo de Consentimento para Extração Dentária',
      tipo: 'responsabilidade',
      conteudo: `<h2>TERMO DE CONSENTIMENTO PARA EXTRAÇÃO DENTÁRIA</h2>
<p>Eu, <strong>{{PACIENTE_NOME}}</strong>, CPF <strong>{{PACIENTE_CPF}}</strong>, autorizo o(a) Dr(a). <strong>{{DENTISTA_NOME}}</strong> a realizar a extração do(s) dente(s) indicado(s), estando ciente de que:</p>
<ul>
  <li>A extração é um procedimento cirúrgico e envolve riscos inerentes, como sangramento, inchaço e desconforto pós-operatório;</li>
  <li>Podem ocorrer complicações como infecção, comunicação bucosinusal, parestesia temporária ou permanente;</li>
  <li>Devo seguir rigorosamente as orientações pós-operatórias;</li>
  <li>É necessário comunicar imediatamente qualquer intercorrência fora do esperado;</li>
  <li>O não seguimento das orientações pode comprometer o resultado do tratamento.</li>
</ul>
<p>Declaro que as informações acima foram explicadas de forma clara e que compreendo todos os pontos.</p>
<p>Data: <strong>{{DATA}}</strong></p>`
    },
    {
      id: uuidv4(),
      titulo: 'Termo de Consentimento para Clareamento Dental',
      tipo: 'responsabilidade',
      conteudo: `<h2>TERMO DE CONSENTIMENTO PARA CLAREAMENTO DENTAL</h2>
<p>Eu, <strong>{{PACIENTE_NOME}}</strong>, CPF <strong>{{PACIENTE_CPF}}</strong>, autorizo o(a) Dr(a). <strong>{{DENTISTA_NOME}}</strong> a realizar o procedimento de clareamento dental, estando ciente de que:</p>
<ul>
  <li>O clareamento pode causar sensibilidade dentária temporária durante e após o tratamento;</li>
  <li>Os resultados variam de acordo com a coloração original dos dentes e hábitos do paciente;</li>
  <li>Restaurações, coroas e próteses não clareiam com o produto utilizado;</li>
  <li>O resultado não é permanente e pode necessitar de manutenção periódica;</li>
  <li>Devo evitar alimentos e bebidas com corantes durante o tratamento.</li>
</ul>
<p>Declaro ter sido informado(a) sobre todos os aspectos do procedimento.</p>
<p>Data: <strong>{{DATA}}</strong></p>`
    },
    {
      id: uuidv4(),
      titulo: 'Termo de Consentimento para Implante Dentário',
      tipo: 'responsabilidade',
      conteudo: `<h2>TERMO DE CONSENTIMENTO PARA IMPLANTE DENTÁRIO</h2>
<p>Eu, <strong>{{PACIENTE_NOME}}</strong>, CPF <strong>{{PACIENTE_CPF}}</strong>, autorizo o(a) Dr(a). <strong>{{DENTISTA_NOME}}</strong> a realizar a instalação de implante dentário, estando ciente de que:</p>
<ul>
  <li>O implante é um procedimento cirúrgico com riscos de infecção, sangramento e rejeição;</li>
  <li>A osseointegração pode levar de 3 a 6 meses e pode não ocorrer em todos os casos;</li>
  <li>O tabagismo, diabetes não controlada e má higiene comprometem o resultado;</li>
  <li>Exames complementares (tomografia, radiografias) são necessários para planejamento;</li>
  <li>A manutenção periódica é fundamental para a longevidade do implante.</li>
</ul>
<p>Declaro ter recebido todas as informações necessárias para tomar minha decisão.</p>
<p>Data: <strong>{{DATA}}</strong></p>`
    },
    {
      id: uuidv4(),
      titulo: 'Anamnese Odontológica',
      tipo: 'anamnese',
      conteudo: `<h2>ANAMNESE ODONTOLÓGICA</h2>
<p>Paciente: <strong>{{PACIENTE_NOME}}</strong> | Data: <strong>{{DATA}}</strong></p>

<h3>1. Motivo da consulta</h3>
<p>{{CAMPO: Descreva o motivo da sua consulta}}</p>

<h3>2. Histórico médico</h3>
<p>Possui alguma doença sistêmica? (diabetes, hipertensão, cardiopatia, etc.)</p>
<p>{{CAMPO: Descreva suas condições de saúde}}</p>

<h3>3. Medicamentos em uso</h3>
<p>{{CAMPO: Liste todos os medicamentos que utiliza atualmente}}</p>

<h3>4. Alergias</h3>
<p>Possui alergia a algum medicamento, anestésico ou material?</p>
<p>{{CAMPO: Descreva suas alergias}}</p>

<h3>5. Histórico odontológico</h3>
<p>Já realizou algum tratamento odontológico anteriormente? Teve alguma complicação?</p>
<p>{{CAMPO: Descreva seu histórico odontológico}}</p>

<h3>6. Hábitos</h3>
<p>Fumante? ( ) Sim ( ) Não | Consome bebidas alcoólicas? ( ) Sim ( ) Não | Ranger/apertar os dentes? ( ) Sim ( ) Não</p>

<h3>7. Para mulheres</h3>
<p>Está grávida ou suspeita de gravidez? ( ) Sim ( ) Não | Está amamentando? ( ) Sim ( ) Não</p>

<p><em>Declaro que as informações acima são verdadeiras e completas.</em></p>`
    }
  ];

  for (const t of termosPadrao) {
    await conn.execute(
      `INSERT IGNORE INTO termos (id, clinica_id, titulo, tipo, conteudo, padrao, ativo, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, 1, 1, ?, ?)`,
      [t.id, t.titulo, t.tipo, t.conteudo, now, now]
    );
  }
  console.log('✅ termos padrão inseridos:', termosPadrao.length);

  conn.end();
})().catch(e => console.error('ERRO:', e.message));
