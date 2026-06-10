-- Insere 13 despesas para teste de limite do plano FREE
INSERT INTO despesas (id, descricao, valor, categoria, data, tipo, observacoes, dedutivel, plano_conta_id, user_id, created_at, updated_at, clinica_id)
VALUES
  (UUID(), 'Despesa Teste 1', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 2', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 3', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 4', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 5', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 6', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 7', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 8', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 9', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 10', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 11', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 12', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734'),
  (UUID(), 'Despesa Teste 13', 100.00, 'Teste', '2026-04-15', 'variavel', '', 0, NULL, '5b96ad4f-adb0-4d39-8ed0-bfddfb1e3923', NOW(), NOW(), 'c55b8c97-2fad-4731-968a-4a9973bcd734');
-- Execute este script no banco para testar o bloqueio de 15 despesas por mês.
