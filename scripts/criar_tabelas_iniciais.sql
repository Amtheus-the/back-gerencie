-- Criação das tabelas principais para inicialização do banco no Heroku

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE enum_users_tipo_pessoa AS ENUM ('PF', 'PJ');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  cro VARCHAR(255),
  telefone VARCHAR(255),
  tipo_pessoa enum_users_tipo_pessoa NOT NULL DEFAULT 'PF',
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  foto VARCHAR(255),
  profissao VARCHAR(255) DEFAULT 'Dentista',
  nome_clinica VARCHAR(255),
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  clinica_id UUID REFERENCES clinicas(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
