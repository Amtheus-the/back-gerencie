"""
Script de migração de pacientes do PostgreSQL (sistema antigo) para MySQL (sistema novo).
Dentista: DEISE DOS SANTOS MERUCCI (dsodontologia2019@gmail.com)
"""

import psycopg2
import mysql.connector
import uuid
from datetime import datetime

# ─── Conexão PostgreSQL (sistema antigo) ────────────────────────────────────
PG_CONN = {
    "host":     "cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    "port":     5432,
    "database": "ddcojs3bgb93c",
    "user":     "u4aocqmekiloko",
    "password": "p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    "sslmode":  "require",
}

# ─── Conexão MySQL (sistema novo - Hostinger) ────────────────────────────────
MYSQL_CONN = {
    "host":     "srv1722.hstgr.io",
    "port":     3306,
    "database": "u410205205_gerencie",
    "user":     "u410205205_rootgerencie",
    "password": "Gerencie1@",
}

# ─── IDs do dentista no sistema novo ─────────────────────────────────────────
NEW_USER_ID    = "c957de3e-d6f2-4144-a61f-8247b53a7d49"
NEW_CLINICA_ID = "06e831a4-03c9-4a27-b2b2-5ee867d3c4e2"
DENTISTA_EMAIL = "deise1979@gmail.com"


def buscar_usuario_id_antigo(pg):
    cur = pg.cursor()
    cur.execute("SELECT id FROM usuarios WHERE email = %s LIMIT 1", (DENTISTA_EMAIL,))
    row = cur.fetchone()
    cur.close()
    if not row:
        raise Exception(f"Usuário {DENTISTA_EMAIL} não encontrado no banco antigo.")
    return row[0]


def buscar_pacientes_antigos(pg, usuario_id):
    cur = pg.cursor()
    cur.execute("""
        SELECT
            nome, cpf, sexo, data_nascimento, data_cadastro,
            cep, estado, municipio, bairro, rua, numero,
            email, telefone, rg, status, tipo_atendimento, nome_convenio
        FROM pacientes
        WHERE usuario_id = %s
        ORDER BY id
    """, (usuario_id,))
    rows = cur.fetchall()
    cur.close()
    return rows


def inserir_pacientes_mysql(mysql_conn, pacientes):
    cur = mysql_conn.cursor()

    sql = """
        INSERT INTO pacientes (
            id, nome, cpf_cnpj, tipo_pessoa, email, telefone,
            cep, logradouro, numero, bairro, cidade, estado,
            data_nascimento, dataCadastro, ativo,
            observacoes, user_id, clinica_id,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, 'PF', %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            NOW(), NOW()
        )
    """

    inseridos = 0
    ignorados = 0
    agora = datetime.now()

    for p in pacientes:
        (nome, cpf, sexo, data_nasc, data_cad,
         cep, estado, municipio, bairro, rua, numero,
         email, telefone, rg, status, tipo_atend, nome_convenio) = p

        novo_id = str(uuid.uuid4())

        # Monta observações extras
        obs_partes = []
        if sexo:
            obs_partes.append(f"Sexo: {sexo}")
        if rg:
            obs_partes.append(f"RG: {rg}")
        if tipo_atend and tipo_atend != 'particular':
            obs_partes.append(f"Tipo atendimento: {tipo_atend}")
        if nome_convenio:
            obs_partes.append(f"Convênio: {nome_convenio}")
        observacoes = " | ".join(obs_partes) if obs_partes else None

        data_cadastro = data_cad if data_cad else agora

        try:
            cur.execute(sql, (
                novo_id, nome, cpf, email, telefone,
                cep, rua, numero, bairro, municipio, estado,
                data_nasc, data_cadastro, bool(status),
                observacoes, NEW_USER_ID, NEW_CLINICA_ID
            ))
            inseridos += 1
        except mysql.connector.errors.IntegrityError as e:
            print(f"  [IGNORADO] {nome}: {e}")
            ignorados += 1

    mysql_conn.commit()
    cur.close()
    return inseridos, ignorados


def main():
    print("=== Migracao de Pacientes: PostgreSQL -> MySQL ===\n")

    print("Conectando ao PostgreSQL...")
    pg = psycopg2.connect(**PG_CONN)
    print("OK")

    print("Conectando ao MySQL...")
    mysql_conn = mysql.connector.connect(**MYSQL_CONN)
    print("OK\n")

    print(f"Buscando ID do dentista ({DENTISTA_EMAIL}) no sistema antigo...")
    usuario_id_antigo = buscar_usuario_id_antigo(pg)
    print(f"  usuario_id antigo: {usuario_id_antigo}\n")

    print("Buscando pacientes...")
    pacientes = buscar_pacientes_antigos(pg, usuario_id_antigo)
    print(f"  {len(pacientes)} pacientes encontrados.\n")

    print("Inserindo no MySQL...")
    inseridos, ignorados = inserir_pacientes_mysql(mysql_conn, pacientes)

    pg.close()
    mysql_conn.close()

    print(f"\n=== Concluído ===")
    print(f"  Inseridos:  {inseridos}")
    print(f"  Ignorados:  {ignorados}")
    print(f"  Total:      {len(pacientes)}")


if __name__ == "__main__":
    main()
