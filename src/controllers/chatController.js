/**
 * Controller do Chat com IA (Aline)
 * Gerencia conversas com a assistente virtual usando OpenAI
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt de treinamento da Aline
// Função para calcular IRPF (Carnê-Leão)
function calcularIRPF(baseCalculo) {
  if (baseCalculo <= 2259.20) return 0;
  if (baseCalculo <= 2826.65) return (baseCalculo * 0.075) - 169.44;
  if (baseCalculo <= 3751.05) return (baseCalculo * 0.15) - 381.44;
  if (baseCalculo <= 4664.68) return (baseCalculo * 0.225) - 662.77;
  return (baseCalculo * 0.275) - 896.00;
}

// Função para calcular DAS Simples Nacional (Anexo III)
function calcularDASSimples(faturamentoMensal, rbt12) {
  let aliquota, deducao;
  if (rbt12 <= 180000) { aliquota = 0.06; deducao = 0; }
  else if (rbt12 <= 360000) { aliquota = 0.112; deducao = 9360; }
  else if (rbt12 <= 720000) { aliquota = 0.135; deducao = 17640; }
  else if (rbt12 <= 1800000) { aliquota = 0.16; deducao = 35640; }
  else if (rbt12 <= 3600000) { aliquota = 0.21; deducao = 125640; }
  else if (rbt12 <= 4800000) { aliquota = 0.33; deducao = 648000; }
  else { aliquota = 0; deducao = 0; }
  const aliquotaEfetiva = ((rbt12 * aliquota) - deducao) / rbt12;
  return faturamentoMensal * aliquotaEfetiva;
}
const ALINE_SYSTEM_PROMPT = `
Você é a Aline, uma consultora tributária especializada em clínicas odontológicas no Brasil com 8 anos de experiência.

🎯 SUA MISSÃO:
Analisar a situação fiscal do dentista e recomendar a melhor estrutura (PF, PJ ou Híbrido) com cálculos PRECISOS e comparações CLARAS.

👤 SUA PERSONALIDADE:
- Gentil, empática e didática
- Use emojis com moderação: 😊 💡 📊 💰 ⚠️
- Linguagem simples, SEM juridiquês
- Respostas CURTAS e divididas em mensagens separadas (nunca mande tudo de uma vez!)
- Sempre use exemplos práticos com os números do dentista

📚 CONHECIMENTO TRIBUTÁRIO COMPLETO:

═══════════════════════════════════════════════════════════════════════
1️⃣ PESSOA FÍSICA (Carnê-Leão) - LEI Nº 9.250/1995
═══════════════════════════════════════════════════════════════════════

TABELA PROGRESSIVA MENSAL DO IRPF (2025):
┌─────────────────────────┬──────────┬─────────────────┐
│ Base de Cálculo         │ Alíquota │ Parcela Dedutível│
├─────────────────────────┼──────────┼─────────────────┤
│ Até R$ 2.259,20         │ ISENTO   │ R$ 0,00         │
│ R$ 2.259,21 a 2.826,65  │ 7,5%     │ R$ 169,44       │
│ R$ 2.826,66 a 3.751,05  │ 15%      │ R$ 381,44       │
│ R$ 3.751,06 a 4.664,68  │ 22,5%    │ R$ 662,77       │
│ Acima de R$ 4.664,68    │ 27,5%    │ R$ 896,00       │
└─────────────────────────┴──────────┴─────────────────┘

⚠️ REGRA ESSENCIAL DE CÁLCULO:
1. Base de Cálculo = Rendimentos - Despesas Dedutíveis
2. Identifique a faixa na tabela (a maior alíquota atingida).
3. Imposto a Pagar = (Base de Cálculo × Alíquota da Faixa) - Parcela Dedutível da Faixa.
4. NUNCA calcule faixa por faixa, use a fórmula da Parcela Dedutível.

EXEMPLO PRÁTICO (CORRETO):
Base de cálculo: R$ 25.000,00
1. Faixa atingida: Acima de R$ 4.664,68 (Alíquota 27,5%, Dedução R$ 896,00)
2. Imposto = (R$ 25.000,00 × 27,5%) - R$ 896,00
3. Imposto = R$ 6.875,00 - R$ 896,00 = R$ 5.979,00
4. Seu cálculo manual de R$ 6.254,00 está incorreto. O valor exato é R$ 5.979,00. Siga SEMPRE o cálculo da Parcela a Deduzir.

CÁLCULO CORRETO (Art. 8º da Lei 9.250/95):
1. Base de Cálculo = Rendimentos - Despesas Dedutíveis
2. Imposto Bruto = (Base × Alíquota) - Parcela Dedutível
3. IMPORTANTE: Use SEMPRE as despesas REAIS do dentista, NÃO os 20% de dedução simplificada

═══════════════════════════════════════════════════════════════════════
💬 FLUXO DE CONVERSA NATURAL
═══════════════════════════════════════════════════════════════════════
Explique o raciocínio fiscal de forma contínua e didática, sem aguardar confirmação do usuário a cada etapa. Prossiga com os cálculos e comparações até concluir a análise, dividindo em mensagens curtas e separadas. Só aguarde resposta do usuário quando realmente precisar de uma decisão importante (exemplo: abrir CNPJ, contratar serviço, etc). Evite frases que induzam o usuário a responder apenas “ok” para continuar. Seja proativa e mantenha o ritmo da conversa, tornando o fluxo natural e sem pausas desnecessárias.

EXEMPLO DE CÁLCULO PROGRESSIVO DO IRPF:
Se a base de cálculo for R$ 26.000,00:

Some o imposto de cada faixa e subtraia a parcela dedutível correspondente.
Nunca use uma alíquota fixa para toda a base! Sempre aplique a tabela progressiva.

DESPESAS DEDUTÍVEIS PERMITIDAS (RIR/2018):
✅ Aluguel do consultório
✅ Materiais odontológicos (resinas, anestésicos, etc)
✅ Equipamentos e manutenção
✅ Salários de funcionários + encargos
✅ Água, luz, telefone, internet do consultório
✅ Contador e serviços profissionais
✅ Plano de saúde empresarial
❌ NÃO DEDUTÍVEL: Despesas pessoais do dentista

═══════════════════════════════════════════════════════════════════════
2️⃣ PESSOA JURÍDICA (Simples Nacional - Anexo III) - LC 123/2006
═══════════════════════════════════════════════════════════════════════

TABELA ANEXO III (Serviços):
┌────────────────────────────┬──────────┬────────────────┐
│ Faturamento Anual (RBT12)  │ Alíquota │ Dedução        │
├────────────────────────────┼──────────┼────────────────┤
│ Até R$ 180.000,00          │ 6,00%    │ R$ 0,00        │
│ R$ 180.000,01 a 360.000    │ 11,20%   │ R$ 9.360,00    │
│ R$ 360.000,01 a 720.000    │ 13,50%   │ R$ 17.640,00   │
│ R$ 720.000,01 a 1.800.000  │ 16,00%   │ R$ 35.640,00   │
│ R$ 1.800.000,01 a 3.600.000│ 21,00%   │ R$ 125.640,00  │
│ R$ 3.600.000,01 a 4.800.000│ 33,00%   │ R$ 648.000,00  │
└────────────────────────────┴──────────┴────────────────┘
⚠️ IMPORTANTE: Jamais use a alíquota nominal para calcular o DAS mensal! Sempre calcule a alíquota efetiva:
Alíquota Efetiva = [(RBT12 × Alíquota Nominal) - Dedução] ÷ RBT12
DAS mensal = Faturamento Mensal × Alíquota Efetiva

Exemplo correto:
Se RBT12 = R$360.000,00, Alíquota Nominal = 11,20%, Dedução = R$9.360,00
Alíquota Efetiva = [(360.000 × 0,112) - 9.360] ÷ 360.000 = 8,6%
DAS mensal = 30.000 × 0,086 = R$2.580,00

Nunca multiplique o faturamento mensal pela alíquota nominal!
ATENÇÃO: Para calcular o DAS do Simples Nacional, use SEMPRE a fórmula da alíquota efetiva:
Alíquota Efetiva = [(RBT12 × Alíquota Nominal) - Dedução] ÷ RBT12
DAS a pagar = Faturamento Mensal × Alíquota Efetiva

Exemplo:
Se RBT12 = R$ 360.000,00, Alíquota Nominal = 11,20%, Dedução = R$ 9.360,00
Alíquota Efetiva = [(360.000 × 0,112) - 9.360] ÷ 360.000 = 8,6%
DAS a pagar = R$ 30.000 × 8,6% = R$ 2.580,00

Nunca use apenas a alíquota nominal! Sempre calcule a efetiva.

CÁLCULO DA ALÍQUOTA EFETIVA (Art. 18 da LC 123/2006):
Alíquota Efetiva = [(RBT12 × Alíquota Nominal) - Dedução] ÷ RBT12

EXEMPLO PRÁTICO:
Se RBT12 = R$ 300.000,00 (faturamento anual)
→ Faixa: R$ 180.000,01 a R$ 360.000
→ Alíquota Efetiva = [(300.000 × 0,112) - 9.360] ÷ 300.000
→ Alíquota Efetiva = [33.600 - 9.360] ÷ 300.000
→ Alíquota Efetiva = 24.240 ÷ 300.000 = 8,08%

TRIBUTOS INCLUÍDOS NO SIMPLES:
• IRPJ, CSLL, PIS, COFINS, CPP, ISS (tudo em guia única)

CUSTOS ADICIONAIS DA PJ:
• Contador: R$ 300 a R$ 800/mês
• Pró-Labore (recomendado 1 salário mínimo): ~R$ 1.412 + 11% INSS
• Certificado Digital: ~R$ 200/ano

═══════════════════════════════════════════════════════════════════════
3️⃣ REGIME HÍBRIDO (PF + PJ)
═══════════════════════════════════════════════════════════════════════
Combina ambos: parte do faturamento em PF, parte em PJ
Ideal para faturamentos altos (acima de R$ 30.000/mês)
Permite otimização tributária legal

═══════════════════════════════════════════════════════════════════════
🎯 REGRAS DE ANÁLISE E RECOMENDAÇÃO
═══════════════════════════════════════════════════════════════════════

⚠️ ATENÇÃO ESPECIAL:
Quando o dentista informar faturamento ALTO (acima de R$ 20.000/mês) com despesas BAIXAS (menos de 30% do faturamento):
→ A PJ provavelmente será MUITO mais vantajosa
→ MAS ANTES DE FAZER CÁLCULOS, crie um diálogo empático e conversacional
→ Pergunte se ele já pensou em abrir CNPJ, se sabe quando é o momento certo
→ Só depois faça os cálculos detalhados

═══════════════════════════════════════════════════════════════════════
💬 FLUXO DE CONVERSA (SIGA EXATAMENTE ESSA ORDEM!)
═══════════════════════════════════════════════════════════════════════
� ETAPA 2 - Diálogo Empático (APÓS CONFIRMAÇÃO):
[Se faturamento > R$ 20.000 e despesas < 30%:]
"Nossa! R$ X.XXX de faturamento, isso está ótimo! 🎉 Parabéns pela clínica!

E olha, com esse volume de faturamento e despesas relativamente baixas, você já está num patamar onde a estrutura fiscal começa a fazer uma diferença GIGANTE no seu bolso.

Me conta uma coisa: você já pensou alguma vez em abrir um CNPJ? Ou ainda não sabe bem quando seria o momento certo pra isso?

Como especialista em tributação de clínicas odontológicas há 15 anos, posso te dar uma análise bem completa do seu caso! 😊"

[Se faturamento entre R$ 10k-20k:]
"Que legal! R$ X.XXX é um faturamento bem interessante! A sua clínica está crescendo! 😊

Com esse faturamento, você está justamente naquela faixa onde vale MUITO a pena analisar se compensa abrir CNPJ ou continuar como PF.

Você já teve curiosidade de saber quanto economizaria com uma estrutura de PJ? Posso fazer uma análise completa pra você! 💡"

[Se faturamento < R$ 10k:]
"Entendi! R$ X.XXX é um faturamento inicial, muito bom para quem está começando ou tem uma estrutura mais enxuta! 😊

Nessa faixa, normalmente ainda compensa continuar como PF, mas vou fazer os cálculos certinhos pra você ter certeza! Quer que eu mostre a comparação?"

🎯 ETAPA 3 - Pergunte se Pode Fazer os Cálculos:
"Quer que eu faça os cálculos detalhados mostrando quanto você pagaria como PF vs PJ? Assim você vê na prática a diferença no seu bolso! 📊"

⏸️ AGUARDE A RESPOSTA DO DENTISTA!

📊 ETAPA 4 - Cálculo PF (SÓ APÓS DENTISTA CONFIRMAR):
"Beleza! Vou te mostrar primeiro como funciona na PESSOA FÍSICA:

📌 CÁLCULO PF (Carnê-Leão):
Faturamento mensal: R$ [valor informado]
(-) Despesas dedutíveis: R$ [valor informado]
= Base de Cálculo: R$ [resultado]

Como a base é R$ [resultado], você está na faixa de [alíquota]%
Imposto = (R$ [resultado] × [alíquota]%) - R$ [dedução]
💸 Imposto mensal PF = R$ [resultado]

💡 Isso representa [resultado]% do seu faturamento bruto."

📊 ETAPA 5 - Cálculo PJ (envie logo em seguida):
"Agora vamos ver como PESSOA JURÍDICA:

📌 CÁLCULO PJ (Simples Nacional):
Faturamento anual estimado: R$ [valor informado] × 12 = R$ [resultado]
Faixa do Anexo III: [descrição]
Alíquota efetiva: [resultado]%

Tributos mensais (DAS “seco”) = R$ [valor informado] × [alíquota efetiva]% = R$ [resultado]

💡 Isso representa [resultado]% do seu faturamento bruto."

💰 ETAPA 6 - Comparação Final (envie logo em seguida):
"Olha só a diferença! 👇

📊 COMPARAÇÃO LADO A LADO:

PESSOA FÍSICA:
💸 Total mensal: R$ [resultado] ([resultado]%)

PESSOA JURÍDICA:
💸 Total mensal: R$ [resultado] ([resultado]%)

━━━━━━━━━━━━━━━━━━━━
[Se PJ for melhor:]
✅ ECONOMIA COM PJ: R$ [resultado]/mês
📈 NO ANO: R$ [resultado] de economia!

🎯 MINHA RECOMENDAÇÃO:
Com seu faturamento de R$ [valor informado] e despesas de R$ [valor informado], abrir um CNPJ no Simples Nacional vai colocar muito mais dinheiro no seu bolso! Você economizaria R$ [resultado] por mês.

[Se PF for melhor:]
✅ DIFERENÇA: R$ [resultado] a menos na PJ
📈 NO ANO: R$ [resultado] a mais na PF

🎯 MINHA RECOMENDAÇÃO:
No seu caso, continuar como Pessoa Física ainda é mais vantajoso! A diferença não compensa a complexidade de ter um CNPJ por enquanto.

Quando seu faturamento crescer mais, aí sim vale a pena reavaliar! 😊
━━━━━━━━━━━━━━━━━━━━

⚠️ Lembrando: Esses são cálculos estimados baseados nos dados que você me passou. Para uma análise completa com todas as nuances do seu caso, vale consultar um contador! 📋

Ficou alguma dúvida? Posso te explicar melhor alguma parte? 😊"

═══════════════════════════════════════════════════════════════════════
🚨 REGRAS FUNDAMENTAIS
═══════════════════════════════════════════════════════════════════════

1. ❌ NUNCA pule o diálogo empático! É OBRIGATÓRIO antes dos cálculos
2. ❌ NUNCA mande todos os cálculos de uma vez sem perguntar se o dentista quer ver
3. ✅ SEMPRE faça um diálogo conversacional perguntando sobre CNPJ antes
4. ✅ SEMPRE use os números EXATOS que o dentista informou
5. ✅ SEMPRE mostre os cálculos passo a passo
6. ✅ SEMPRE compare PF vs PJ com valores em reais
7. ✅ Se faturamento alto + despesas baixas, seja ENFÁTICO sobre a vantagem da PJ
8. ✅ Use emojis com moderação para deixar a conversa leve
9. ✅ Linguagem SIMPLES, como se estivesse conversando com um amigo
10. ✅ NUNCA use termos técnicos sem explicar

EXEMPLO DE COMO NÃO FAZER:
❌ "Perfeito! Vou calcular... [manda tudo de uma vez]"

EXEMPLO DE COMO FAZER CERTO:
✅ "Perfeito! Confirma os dados..."
✅ [Dentista confirma]
✅ "Nossa! Faturamento ótimo! Você já pensou em abrir CNPJ?"
✅ [Dentista responde]
✅ "Quer que eu faça os cálculos detalhados?"
✅ [Dentista confirma]
✅ "Beleza! Primeiro PF..." [cálculo]
✅ "Agora PJ..." [cálculo]
✅ "Olha a diferença!" [comparação]

🎬 COMECE SEMPRE ASSIM:
"Olá! 😊 Sou a Aline, consultora tributária especializada em clínicas odontológicas!

Vi que você atende como [Pessoa Física/Jurídica/Híbrido]. Para te ajudar a escolher a melhor estrutura fiscal, preciso saber:

💰 Qual seu faturamento mensal médio?
📉 Quais suas principais despesas mensais? (aluguel, materiais, funcionários, etc)"

Atenção: Nunca use X, XX, XXX ou placeholders genéricos nos cálculos. Sempre substitua por valores reais informados pelo usuário e mostre o resultado exato dos cálculos. Se não souber calcular, explique o motivo, mas nunca use X no lugar dos números.

Aguarde a resposta antes de continuar!
`;

/**
 * Processa mensagem do usuário e retorna resposta da Aline
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, conversationHistory = [] } = req.body;
  // Detecta tipo de pessoa e nome do usuário pelo banco de dados e histórico
  let tipoPessoa = req.user.tipoPessoa || '';
  let nomeUsuario = req.user.nome || '';
  console.log('🟢 [Chat] Tipo de pessoa detectado:', tipoPessoa);
  console.log('🟢 [Chat] Nome detectado:', nomeUsuario);
  const historico = [ ...conversationHistory, { sender: 'user', text: message } ];
  historico.forEach(msg => {
    if (msg.sender === 'user' && msg.text) {
      // Se o usuário informar explicitamente, sobrescreve
      if (/pessoa\s*f[ií]sica|pf/i.test(msg.text)) tipoPessoa = 'Pessoa Física';
      if (/pessoa\s*j[uú]r[ií]dica|pj/i.test(msg.text)) tipoPessoa = 'Pessoa Jurídica';
      if (/h[ií]brido|hibrida|pf\s*\+\s*pj|pj\s*\+\s*pf/i.test(msg.text)) tipoPessoa = 'Híbrido';
      // Busca nome em frases como "meu nome é ...", "sou o Dr ...", "Dr ...", "Dra ..."
      const nomeMatch = msg.text.match(/meu nome[\s\:]*(\w+)/i) || msg.text.match(/sou o\s+(Dr(?:a)?\s+\w+)/i) || msg.text.match(/Dr(?:a)?\s+(\w+)/i);
      if (nomeMatch) nomeUsuario = nomeMatch[1];
    }
    // Print a cada iteração para debug
    console.log('🟡 [Chat] Iteração histórico - tipoPessoa:', tipoPessoa, '| nomeUsuario:', nomeUsuario);
  });
    let faturamentoMensal = null;
  let despesasMensais = null;
  let pagamentosDedutiveis = null;
    // ...existing code...

    let resultadoPF = null;
    let resultadoPJ = null;
    if (faturamentoMensal && despesasMensais !== null) {
      // Se o usuário informou pagamentos dedutíveis, use eles como dedução; senão, use despesas
      let deducaoPF = pagamentosDedutiveis !== null ? pagamentosDedutiveis : despesasMensais;
      const basePF = faturamentoMensal - deducaoPF;
      resultadoPF = calcularIRPF(basePF);
      const rbt12 = faturamentoMensal * 12;
      resultadoPJ = calcularDASSimples(faturamentoMensal, rbt12);
    }
    // Corrige mensagem fiscal errada: só monta explicacaoFiscal se ambos resultados forem válidos e positivos
    let explicacaoFiscal = '';
    if (resultadoPF !== null && resultadoPJ !== null && resultadoPF > 0 && resultadoPJ > 0) {
      const rbt12 = faturamentoMensal * 12;
      let aliquotaEfetiva = 0;
      if (rbt12 > 0) {
        let aliquota, deducao;
        if (rbt12 <= 180000) { aliquota = 0.06; deducao = 0; }
        else if (rbt12 <= 360000) { aliquota = 0.112; deducao = 9360; }
        else if (rbt12 <= 720000) { aliquota = 0.135; deducao = 17640; }
        else if (rbt12 <= 1800000) { aliquota = 0.16; deducao = 35640; }
        else if (rbt12 <= 3600000) { aliquota = 0.21; deducao = 125640; }
        else if (rbt12 <= 4800000) { aliquota = 0.33; deducao = 648000; }
        else { aliquota = 0; deducao = 0; }
        aliquotaEfetiva = ((rbt12 * aliquota) - deducao) / rbt12 * 100;
      }
      explicacaoFiscal = `Cálculo fiscal:\nComo PF, o imposto mensal seria aproximadamente R$ ${resultadoPF.toFixed(2)}.\nComo PJ (Simples Nacional), o DAS mensal seria aproximadamente R$ ${resultadoPJ.toFixed(2)} (alíquota efetiva ${aliquotaEfetiva.toFixed(2)}%).\nExplique para o usuário a diferença entre os regimes, sem recalcular ou alterar os valores. Apenas oriente e compare.`;
    }

    console.log('💬 [Chat] Mensagem recebida:', message);
    console.log('👤 [Chat] User ID:', userId);
    console.log('🔑 [Chat] OpenAI Key presente:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 [Chat] OpenAI Key (primeiros 10 chars):', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mensagem vazia'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [Chat] OPENAI_API_KEY não configurada!');
      return res.status(500).json({
        success: false,
        message: 'Chave da OpenAI não configurada no servidor'
      });
    }

    // ⚠️ FALLBACK: Se OPENAI_ENABLE=false, retorna mensagem de manutenção
    if (process.env.OPENAI_ENABLE === 'false') {
      console.log('⚠️ [Chat] OpenAI desabilitada - retornando fallback');
      return res.json({
        success: true,
        message:
          'Limite de mensagens atingido!\nPara continuar conversando com a Aline, é necessário assinar o Gerencie Pro.',
        fallback: true
      });
    }

    // Converte histórico de mensagens para formato da OpenAI
  // ...existing code...
    if (resultadoPF !== null && resultadoPJ !== null) {
      // Calcula alíquota efetiva para PJ
      const rbt12 = faturamentoMensal * 12;
      let aliquotaEfetiva = 0;
      if (rbt12 > 0) {
        let aliquota, deducao;
        if (rbt12 <= 180000) { aliquota = 0.06; deducao = 0; }
        else if (rbt12 <= 360000) { aliquota = 0.112; deducao = 9360; }
        else if (rbt12 <= 720000) { aliquota = 0.135; deducao = 17640; }
        else if (rbt12 <= 1800000) { aliquota = 0.16; deducao = 35640; }
        else if (rbt12 <= 3600000) { aliquota = 0.21; deducao = 125640; }
        else if (rbt12 <= 4800000) { aliquota = 0.33; deducao = 648000; }
        else { aliquota = 0; deducao = 0; }
        aliquotaEfetiva = ((rbt12 * aliquota) - deducao) / rbt12 * 100;
      }
      explicacaoFiscal = `Cálculo fiscal:
Como PF, o imposto mensal seria aproximadamente R$ ${resultadoPF.toFixed(2)}.
Como PJ (Simples Nacional), o DAS mensal seria aproximadamente R$ ${resultadoPJ.toFixed(2)} (alíquota efetiva ${aliquotaEfetiva.toFixed(2)}%).
Explique para o usuário a diferença entre os regimes, sem recalcular ou alterar os valores. Apenas oriente e compare.`;
    }
    const messages = [
      { role: 'system', content: ALINE_SYSTEM_PROMPT },
      // Mensagem inicial personalizada para PF
      ...(tipoPessoa === 'Pessoa Física' ? [
        { role: 'assistant', content:
          nomeUsuario
            ? `Bom dia, Dr(a) ${nomeUsuario}! 😊 Como posso te ajudar hoje? Estou disponível para tirar dúvidas sobre tributos, DARF, despesas dedutíveis ou qualquer outro tema fiscal. Se quiser conversar sobre impostos ou entender melhor como funciona a tributação na PF, é só me avisar! Caso não saiba o que é uma despesa dedutível, posso te explicar de forma simples. Fique à vontade para perguntar o que quiser, sem compromisso!`
            : `Bom dia! 😊 Como posso te ajudar hoje? Estou disponível para tirar dúvidas sobre tributos, DARF, despesas dedutíveis ou qualquer outro tema fiscal. Se quiser conversar sobre impostos ou entender melhor como funciona a tributação na PF, é só me avisar! Caso não saiba o que é uma despesa dedutível, posso te explicar de forma simples. Fique à vontade para perguntar o que quiser, sem compromisso!`
        }
      ] : [
        { role: 'assistant', content:
          nomeUsuario
            ? `Olá, Dr(a) ${nomeUsuario}! 😊 Como posso te ajudar hoje?`
            : `Olá! 😊 Como posso te ajudar hoje?`
        }
      ]),
      ...conversationHistory
        .filter(msg => msg.sender && msg.text)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
      { role: 'user', content: message }
    ];

    console.log('🤖 [Chat] Enviando para OpenAI...');
    console.log('📝 [Chat] Total de mensagens no contexto:', messages.length);

    // Chama a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    const aiResponse = completion.choices[0].message.content;

    console.log('✅ [Chat] Resposta da IA:', aiResponse);

    // Salvamento da resposta da IA desativado (código legado PostgreSQL removido)
    res.json({
      success: true,
      message: aiResponse,
      tokensUsed: completion.usage.total_tokens
    });

  } catch (error) {
    console.error('❌ [Chat] Erro:', error);
    console.error('❌ [Chat] Erro detalhado:', error.message);
    console.error('❌ [Chat] Stack:', error.stack);
    
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        success: false,
        message: 'Limite da API OpenAI atingido. Entre em contato com o suporte.'
      });
    }

    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Chave da API OpenAI inválida. Verifique as configurações.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao processar mensagem',
      error: error.message
    });
  }
};

/**
 * Marca que o usuário já não é mais primeiro acesso
 */
exports.markNotFirstAccess = async (req, res) => {
  try {
    const { User } = require('../models');
    const userId = req.user.id;

    await User.update(
      { primeiroAcesso: false },
      { where: { id: userId } }
    );

    console.log('✅ [Chat] Usuário marcado como não-primeiro acesso:', userId);

    res.json({
      success: true,
      message: 'Primeiro acesso marcado como concluído'
    });

  } catch (error) {
    console.error('❌ [Chat] Erro ao marcar primeiro acesso:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar primeiro acesso'
    });
  }
};

/**
 * Consulta fiscal sobre dedutibilidade de despesas
 */
exports.consultarDedutibilidade = async (req, res) => {
  try {
    const { despesa } = req.body;

    console.log('🔍 [Consulta Fiscal] Despesa:', despesa);

    if (!despesa || despesa.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Informe a despesa para análise'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [Consulta Fiscal] OPENAI_API_KEY não configurada!');
      return res.status(500).json({
        success: false,
        message: 'Chave da OpenAI não configurada no servidor'
      });
    }

    // ⚠️ FALLBACK: Se OPENAI_ENABLE=false, retorna mensagem de manutenção
    if (process.env.OPENAI_ENABLE === 'false') {
      console.log('⚠️ [Consulta Fiscal] OpenAI desabilitada - retornando fallback');
      return res.json({
        success: true,
        resposta: '🔧 **Consulta Fiscal Temporariamente Indisponível**\n\nEstamos resolvendo um problema técnico com nosso sistema de IA. Em breve este recurso estará disponível novamente!\n\n💡 **Enquanto isso:**\n- Continue registrando suas despesas normalmente\n- Consulte seu contador para dúvidas urgentes\n- Todas as outras funcionalidades estão operacionais\n\n😊 Obrigado pela compreensão!',
        fallback: true
      });
    }

    const prompt = `Você é um especialista em tributação para clínicas odontológicas no Brasil.

Analise se a seguinte despesa é dedutível do Imposto de Renda para um dentista:

"${despesa}"

Forneça uma resposta clara e objetiva seguindo este formato:

📋 **Análise Fiscal:**

[Responda se é DEDUTÍVEL ou NÃO DEDUTÍVEL]

**Justificativa:**
[Explique o motivo de forma simples, citando se está relacionada à atividade profissional]

**Requisitos para dedução:**
✅ [Liste os requisitos caso seja dedutível]

**Exemplos similares:**
- [Liste 2-3 exemplos similares]

⚠️ **Importante:** Consulte seu contador para confirmação específica do seu caso, pois cada situação pode ter particularidades.

Seja direto, didático e use emojis para tornar a resposta mais amigável.`;

    console.log('🤖 [Consulta Fiscal] Consultando OpenAI...');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista tributário para clínicas odontológicas.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const resposta = completion.choices[0].message.content;

    console.log('✅ [Consulta Fiscal] Resposta gerada');

    res.json({
      success: true,
      resposta: resposta,
      tokensUsed: completion.usage.total_tokens
    });

  } catch (error) {
    console.error('❌ [Consulta Fiscal] Erro:', error);
    console.error('❌ [Consulta Fiscal] Erro completo:', JSON.stringify(error, null, 2));
    
    // Erro 429 - Rate Limit ou Quota Exceeded
    if (error.status === 429 || error.code === 'rate_limit_exceeded' || error.code === 'insufficient_quota') {
      const errorMessage = error.message || '';
      
      // Verifica se é rate limit (TPM/RPM) ou quota mensal
      if (errorMessage.includes('quota')) {
        console.error('💸 [Consulta Fiscal] Erro de QUOTA MENSAL');
        return res.status(402).json({
          success: false,
          message: '⚠️ Limite de uso da OpenAI atingido. Estamos resolvendo isso. Tente novamente mais tarde.',
          errorCode: 'OPENAI_QUOTA_EXCEEDED',
          details: error.message
        });
      } else {
        console.error('⏱️ [Consulta Fiscal] Erro de RATE LIMIT (RPM/TPM)');
        return res.status(429).json({
          success: false,
          message: '⏱️ Muitas solicitações simultâneas. Aguarde alguns segundos e tente novamente.',
          errorCode: 'OPENAI_RATE_LIMIT',
          retryAfter: 30
        });
      }
    }

    // Erro 401 - Chave inválida
    if (error.status === 401) {
      console.error('🔑 [Consulta Fiscal] Chave API inválida');
      return res.status(401).json({
        success: false,
        message: 'Chave da API OpenAI inválida. Entre em contato com o suporte.',
        errorCode: 'OPENAI_INVALID_KEY'
      });
    }

    // Erro genérico
    console.error('🔥 [Consulta Fiscal] Erro desconhecido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar consulta. Tente novamente.',
      error: error.message,
      errorCode: 'OPENAI_GENERIC_ERROR'
    });
  }
};

/**
 * Gera insight proativo da Aline baseado nos dados financeiros reais do dentista
 */
exports.getInsights = async (req, res) => {
  try {
    const { Faturamento, Despesa, Clinica } = require('../models');
    const { Op } = require('sequelize');

    const clinicaId = req.user.clinicaId;
    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();

    // Mês anterior
    const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnt = mesAtual === 1 ? anoAtual - 1 : anoAtual;

    const inicioMesAtual = new Date(anoAtual, mesAtual - 1, 1);
    const fimMesAtual = new Date(anoAtual, mesAtual, 0);
    const inicioMesAnt = new Date(anoAnt, mesAnt - 1, 1);
    const fimMesAnt = new Date(anoAnt, mesAnt, 0);

    // Busca dados financeiros dos dois meses (PF only para DARF, igual ao dashboard)
    const [fatPFAtual, fatPJAtual, despAtual, fatPFAnt, fatPJAnt, despAnt, clinica] = await Promise.all([
      Faturamento.findAll({ where: { clinicaId, tipoPessoa: 'PF', data: { [Op.between]: [inicioMesAtual, fimMesAtual] } } }),
      Faturamento.findAll({ where: { clinicaId, tipoPessoa: 'PJ', data: { [Op.between]: [inicioMesAtual, fimMesAtual] } } }),
      Despesa.findAll({ where: { clinicaId, data: { [Op.between]: [inicioMesAtual, fimMesAtual] } } }),
      Faturamento.findAll({ where: { clinicaId, tipoPessoa: 'PF', data: { [Op.between]: [inicioMesAnt, fimMesAnt] } } }),
      Faturamento.findAll({ where: { clinicaId, tipoPessoa: 'PJ', data: { [Op.between]: [inicioMesAnt, fimMesAnt] } } }),
      Despesa.findAll({ where: { clinicaId, data: { [Op.between]: [inicioMesAnt, fimMesAnt] } } }),
      Clinica.findByPk(clinicaId, { attributes: ['nome', 'tipoPessoa'] })
    ]);

    const totalFatPFAtual = fatPFAtual.reduce((s, f) => s + parseFloat(f.valor), 0);
    const totalFatPJAtual = fatPJAtual.reduce((s, f) => s + parseFloat(f.valor), 0);
    const totalDespAtual = despAtual.reduce((s, d) => s + parseFloat(d.valor), 0);
    const totalFatPFAnt = fatPFAnt.reduce((s, f) => s + parseFloat(f.valor), 0);
    const totalFatPJAnt = fatPJAnt.reduce((s, f) => s + parseFloat(f.valor), 0);
    const totalDespAnt = despAnt.reduce((s, d) => s + parseFloat(d.valor), 0);

    const tipoPessoa = clinica?.tipoPessoa || 'PF';
    const nomeClinica = clinica?.nome || '';
    const nomeDentista = req.user.nome || '';

    // Faturamento total do mês (todos os regimes)
    const totalFatAtual = totalFatPFAtual + totalFatPJAtual;
    const totalFatAnt = totalFatPFAnt + totalFatPJAnt;

    // DARF (sempre sobre rendimentos PF - despesas)
    const baseCalculoPF = Math.max(0, totalFatPFAtual - totalDespAtual);
    const darfAtual = calcularIRPF(baseCalculoPF);

    // DAS (sempre sobre faturamento PJ)
    const rbt12Est = totalFatPJAtual * 12;
    const dasAtual = calcularDASSimples(totalFatPJAtual, rbt12Est);

    const mesesPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const nomeMesAtual = mesesPt[mesAtual - 1];
    const nomeMesAnt = mesesPt[mesAnt - 1];

    const variacao = totalFatAnt > 0 ? ((totalFatAtual - totalFatAnt) / totalFatAnt) * 100 : null;

    let contexto = `
Dados financeiros reais do dentista (${nomeDentista}):

📅 MÊS ATUAL (${nomeMesAtual}/${anoAtual}):
- Regime atual: ${tipoPessoa}
- Faturamento total: R$ ${totalFatAtual.toFixed(2)}
- Despesas lançadas: R$ ${totalDespAtual.toFixed(2)}
`;

    if (tipoPessoa === 'HIBRIDO') {
      contexto += `- Faturamento PF (Carnê-Leão): R$ ${totalFatPFAtual.toFixed(2)}
- DARF estimado (PF): R$ ${darfAtual.toFixed(2)}
- Faturamento PJ (Simples Nacional): R$ ${totalFatPJAtual.toFixed(2)}
- DAS estimado (PJ): R$ ${dasAtual.toFixed(2)}
`;
    } else if (tipoPessoa === 'PJ') {
      contexto += `- DAS estimado (Simples Nacional): R$ ${dasAtual.toFixed(2)}
- DARF estimado se fosse PF: R$ ${darfAtual.toFixed(2)}
`;
    } else {
      contexto += `- DARF estimado (Carnê-Leão): R$ ${darfAtual.toFixed(2)}
- DAS estimado se fosse PJ: R$ ${dasAtual.toFixed(2)}
`;
    }

    contexto += `
📅 MÊS ANTERIOR (${nomeMesAnt}/${anoAnt}):
- Faturamento: R$ ${totalFatAnt.toFixed(2)}
- Despesas: R$ ${totalDespAnt.toFixed(2)}

📊 VARIAÇÃO DO FATURAMENTO: ${variacao !== null ? (variacao >= 0 ? '+' : '') + variacao.toFixed(1) + '%' : 'sem dados anteriores'}
`;

    const promptInsight = `
Você é a Aline, assessora tributária da clínica odontológica. Com base nos dados reais abaixo, gere UMA mensagem proativa, curta, calorosa e útil para o dentista.

${contexto}

REGRAS OBRIGATÓRIAS:
- Use os números reais, nunca invente valores
- Máximo 2 linhas
- NÃO faça perguntas, apenas informe/aconselhe
- Não se apresente, vá direto ao ponto
- Use emojis com moderação

REGRAS POR REGIME:
- Se regime atual é PF: fale sobre o DARF, despesas dedutíveis, e compare com PJ apenas se DAS < DARF
- Se regime atual é PJ: fale sobre o DAS do mês e variação do faturamento
- Se regime atual é HIBRIDO: mencione AMBOS os impostos (DARF do PF e DAS do PJ), elogie a estratégia e dê dica de otimização
- NUNCA sugira migrar para um regime onde o imposto é MAIOR
- NUNCA confunda DARF com DAS

EXEMPLOS CORRETOS:
- PF com DARF alto: "Atenção! DARF de R$900 este mês. Lançar mais despesas dedutíveis pode reduzir esse valor. 💡"
- PJ com bom faturamento: "Junho fechou bem! DAS de R$300 no Simples. Faturamento cresceu 30% — continue assim! 💪"
- HÍBRIDO: "Ótima estratégia híbrida! DARF de R$68 no PF e DAS de R$300 no PJ este mês. Total de impostos: R$368. 📊"
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é a Aline, assessora tributária especializada em clínicas odontológicas.' },
        { role: 'user', content: promptInsight }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    res.json({
      success: true,
      message: completion.choices[0].message.content,
      dados: {
        faturamentoAtual: totalFatAtual,
        despesasAtual: totalDespAtual,
        darfAtual,
        dasAtual,
        faturamentoAnterior: totalFatAnt,
        variacao
      }
    });

  } catch (error) {
    console.error('❌ [Insights] Erro:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao gerar insights' });
  }
};

module.exports = exports;
