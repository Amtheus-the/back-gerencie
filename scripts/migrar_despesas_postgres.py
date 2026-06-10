"""
Script de migracao de despesas (pagamentos) do PostgreSQL (antigo) para MySQL (Hostinger).
Dentista: DEISE DOS SANTOS MERUCCI (usuario_id antigo = 10)
"""

import psycopg2
import mysql.connector
import uuid
from datetime import datetime

# Conexao PostgreSQL (sistema antigo)
PG_CONN = {
    "host":     "cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    "port":     5432,
    "database": "ddcojs3bgb93c",
    "user":     "u4aocqmekiloko",
    "password": "p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    "sslmode":  "require",
}

# Conexao MySQL (Hostinger)
MYSQL_CONN = {
    "host":     "srv1722.hstgr.io",
    "port":     3306,
    "database": "u410205205_gerencie",
    "user":     "u410205205_rootgerencie",
    "password": "Gerencie1@",
}

NEW_USER_ID    = "c957de3e-d6f2-4144-a61f-8247b53a7d49"
NEW_CLINICA_ID = "06e831a4-03c9-4a27-b2b2-5ee867d3c4e2"
USUARIO_ID_ANTIGO = 10

# Mapeamento plano de contas antigo -> categoria do novo sistema
MAPA_CATEGORIA = {
    100:  "Aluguel",        # Aluguel do Consultorio
    101:  "Materiais",      # Despesas com Material Odontologico
    102:  "Salarios",       # Salarios e Encargos
    103:  "Equipamentos",   # Despesas com Manutencao de Equipamentos
    104:  "Outros",         # Telefonia e Internet
    105:  "Outros",         # Energia Eletrica
    106:  "Outros",         # Contabilidade
    107:  "Marketing",      # Propaganda e Publicidade
    108:  "Materiais",      # Produtos de Limpeza e Esterilizacao
    133:  "Outros",         # Honorarios Juridicos
    497:  "Salarios",       # Diarista
    498:  "Materiais",      # Laboratorio de protese
    499:  "Outros",         # Sabesp
    727:  "Salarios",       # Dentistas Parceiros
    1354: "Outros",         # Taxa do lixo
    1355: "Outros",         # Taxa do Bombeiro
    1356: "Outros",         # FB Consultoria
    1420: "Impostos",       # INSS
    1421: "Impostos",       # DAS
    1422: "Salarios",       # Protetico Prestador
    1423: "Salarios",       # Dentista Gerente
    1424: "Outros",         # Conducao
}

# Mapeamento tipo_lancamento -> tipo no novo sistema
MAPA_TIPO = {
    "unico":   "variavel",
    "parcelado": "variavel",
    "recorrente": "fixa",
}


def buscar_despesas(pg):
    cur = pg.cursor()
    cur.execute("""
        SELECT
            p.id, p.valor, p.data_vencimento, p.descricao,
            p.status, p.tipo_lancamento, p.parcela_atual, p.total_parcelas,
            p.natureza_id, pc.nome as natureza_nome, pc.tipo as natureza_tipo
        FROM pagamentos p
        LEFT JOIN plano_de_contas pc ON pc.id = p.natureza_id
        WHERE p.usuario_id = %s
        ORDER BY p.data_vencimento
    """, (USUARIO_ID_ANTIGO,))
    rows = cur.fetchall()
    cur.close()
    return rows


def inserir_despesas(mysql_conn, despesas):
    cur = mysql_conn.cursor()

    sql = """
        INSERT INTO despesas (
            id, descricao, valor, categoria, data, tipo,
            observacoes, dedutivel, user_id, clinica_id,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            NOW(), NOW()
        )
    """

    inseridos = 0
    ignorados = 0

    for d in despesas:
        (old_id, valor, data_venc, descricao,
         status, tipo_lanc, parcela_atual, total_parcelas,
         natureza_id, natureza_nome, natureza_tipo) = d

        novo_id = str(uuid.uuid4())

        # Categoria
        categoria = MAPA_CATEGORIA.get(natureza_id, "Outros")
        # Corrige nome da categoria para o ENUM correto
        categoria = categoria.replace("Salarios", "Salários").replace("Manutencao", "Manutenção")

        # Tipo
        tipo = MAPA_TIPO.get(tipo_lanc, "variavel")

        # Dedutivel (plano_de_contas.tipo == 'dedutivel')
        dedutivel = 1 if natureza_tipo == 'dedutivel' else 0

        # Descricao
        desc = descricao or natureza_nome or "Despesa importada"

        # Observacoes
        obs_partes = []
        if natureza_nome:
            obs_partes.append(f"Categoria original: {natureza_nome}")
        if status and status != "Pendente":
            obs_partes.append(f"Status: {status}")
        if total_parcelas and total_parcelas > 1:
            obs_partes.append(f"Parcela {parcela_atual}/{total_parcelas}")
        observacoes = " | ".join(obs_partes) if obs_partes else None

        try:
            cur.execute(sql, (
                novo_id, desc, float(valor), categoria, data_venc, tipo,
                observacoes, dedutivel, NEW_USER_ID, NEW_CLINICA_ID
            ))
            inseridos += 1
        except mysql.connector.errors.IntegrityError as e:
            print(f"  [IGNORADO] {desc}: {e}")
            ignorados += 1

    mysql_conn.commit()
    cur.close()
    return inseridos, ignorados


def main():
    print("=== Migracao de Despesas: PostgreSQL -> MySQL (Hostinger) ===\n")

    print("Conectando ao PostgreSQL...")
    pg = psycopg2.connect(**PG_CONN)
    print("OK")

    print("Conectando ao MySQL (Hostinger)...")
    mysql_conn = mysql.connector.connect(**MYSQL_CONN)
    print("OK\n")

    print("Buscando despesas da Deise no sistema antigo...")
    despesas = buscar_despesas(pg)
    print(f"  {len(despesas)} despesas encontradas.\n")

    print("Inserindo no MySQL...")
    inseridos, ignorados = inserir_despesas(mysql_conn, despesas)

    pg.close()
    mysql_conn.close()

    print(f"\n=== Concluido ===")
    print(f"  Inseridos:  {inseridos}")
    print(f"  Ignorados:  {ignorados}")
    print(f"  Total:      {len(despesas)}")


if __name__ == "__main__":
    main()
