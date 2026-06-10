-- ========================================
-- MIGRAÇÃO: Criar tabela plano_contas e atualizar despesas
-- Execute no pgAdmin
-- ========================================

-- 1️⃣ CRIAR TABELA PLANO_CONTAS
CREATE TABLE IF NOT EXISTS plano_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    dedutivel BOOLEAN DEFAULT false,
    categoria VARCHAR(100),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE plano_contas IS 'Plano de contas para classificação de receitas e despesas';
COMMENT ON COLUMN plano_contas.codigo IS 'Código da conta (ex: 1.1, 2.3.1)';
COMMENT ON COLUMN plano_contas.nome IS 'Nome descritivo da conta';
COMMENT ON COLUMN plano_contas.tipo IS 'Tipo de conta: receita ou despesa';
COMMENT ON COLUMN plano_contas.dedutivel IS 'Indica se despesa é dedutível do IR';
COMMENT ON COLUMN plano_contas.ativo IS 'Indica se a conta está ativa';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_plano_contas_user_tipo ON plano_contas(user_id, tipo, ativo);
CREATE INDEX IF NOT EXISTS idx_plano_contas_codigo ON plano_contas(codigo);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_plano_contas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plano_contas_updated_at
    BEFORE UPDATE ON plano_contas
    FOR EACH ROW
    EXECUTE FUNCTION update_plano_contas_updated_at();

-- ========================================

-- 2️⃣ ATUALIZAR TABELA DESPESAS
ALTER TABLE despesas 
    ADD COLUMN IF NOT EXISTS dedutivel BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS plano_conta_id UUID REFERENCES plano_contas(id);

COMMENT ON COLUMN despesas.dedutivel IS 'Indica se a despesa é dedutível do IR';
COMMENT ON COLUMN despesas.plano_conta_id IS 'Referência ao plano de contas';

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_despesas_plano_conta ON despesas(plano_conta_id);

-- ========================================

-- 3️⃣ INSERIR CONTAS PADRÃO (DESPESAS DEDUTÍVEIS E NÃO DEDUTÍVEIS)

-- Função auxiliar para inserir contas para todos os usuários
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM users WHERE ativo = true LOOP
        -- DESPESAS DEDUTÍVEIS (para IR de PJ)
        INSERT INTO plano_contas (codigo, nome, tipo, dedutivel, categoria, user_id, descricao) VALUES
        ('2.1.1', 'Salários e Encargos', 'despesa', true, 'Pessoal', user_record.id, 'Pagamento de funcionários, INSS, FGTS'),
        ('2.1.2', 'Pró-labore', 'despesa', true, 'Pessoal', user_record.id, 'Retirada de pró-labore do sócio'),
        ('2.2.1', 'Aluguel do Consultório', 'despesa', true, 'Fixa', user_record.id, 'Aluguel do espaço físico'),
        ('2.2.2', 'Condomínio', 'despesa', true, 'Fixa', user_record.id, 'Taxa de condomínio'),
        ('2.2.3', 'IPTU', 'despesa', true, 'Fixa', user_record.id, 'Imposto predial'),
        ('2.3.1', 'Energia Elétrica', 'despesa', true, 'Variável', user_record.id, 'Conta de luz'),
        ('2.3.2', 'Água', 'despesa', true, 'Variável', user_record.id, 'Conta de água'),
        ('2.3.3', 'Internet e Telefone', 'despesa', true, 'Variável', user_record.id, 'Serviços de telecomunicação'),
        ('2.4.1', 'Materiais Odontológicos', 'despesa', true, 'Materiais', user_record.id, 'Materiais de consumo'),
        ('2.4.2', 'Medicamentos', 'despesa', true, 'Materiais', user_record.id, 'Medicamentos utilizados'),
        ('2.4.3', 'Material de Limpeza', 'despesa', true, 'Materiais', user_record.id, 'Produtos de higienização'),
        ('2.5.1', 'Manutenção de Equipamentos', 'despesa', true, 'Manutenção', user_record.id, 'Conserto e manutenção'),
        ('2.5.2', 'Depreciação de Equipamentos', 'despesa', true, 'Manutenção', user_record.id, 'Depreciação contábil'),
        ('2.6.1', 'Contador', 'despesa', true, 'Administrativa', user_record.id, 'Honorários contábeis'),
        ('2.6.2', 'Advogado', 'despesa', true, 'Administrativa', user_record.id, 'Honorários advocatícios'),
        ('2.6.3', 'Software e Licenças', 'despesa', true, 'Administrativa', user_record.id, 'Sistemas e programas'),
        ('2.7.1', 'Marketing e Publicidade', 'despesa', true, 'Marketing', user_record.id, 'Divulgação profissional'),
        ('2.7.2', 'Cursos e Capacitação', 'despesa', true, 'Educação', user_record.id, 'Formação profissional'),

        -- DESPESAS NÃO DEDUTÍVEIS
        ('2.8.1', 'Multas e Juros', 'despesa', false, 'Fiscal', user_record.id, 'Penalidades não dedutíveis'),
        ('2.8.2', 'Distribuição de Lucros', 'despesa', false, 'Administrativa', user_record.id, 'Lucros distribuídos aos sócios'),
        ('2.8.3', 'Despesas Pessoais', 'despesa', false, 'Pessoal', user_record.id, 'Gastos não relacionados à atividade'),
        ('2.8.4', 'Brindes e Presentes', 'despesa', false, 'Marketing', user_record.id, 'Cortesias e brindes acima do limite');

    END LOOP;
END $$;

-- ========================================

-- 4️⃣ VERIFICAR CRIAÇÃO

-- Ver total de contas criadas por usuário
SELECT 
    u.email,
    COUNT(pc.id) as total_contas,
    SUM(CASE WHEN pc.dedutivel = true THEN 1 ELSE 0 END) as dedutiveis,
    SUM(CASE WHEN pc.dedutivel = false THEN 1 ELSE 0 END) as nao_dedutiveis
FROM users u
LEFT JOIN plano_contas pc ON pc.user_id = u.id
WHERE u.ativo = true
GROUP BY u.id, u.email;

-- Ver todas as contas criadas
SELECT codigo, nome, tipo, dedutivel, categoria 
FROM plano_contas 
ORDER BY codigo;

SELECT 'Migração concluída! Tabela plano_contas criada e contas padrão inseridas.' AS status;
