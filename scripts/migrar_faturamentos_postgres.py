"""
Script de migracao de faturamentos (rendimentos) do PostgreSQL (antigo) para MySQL (Hostinger).
Os arquivos de recibo ja estao no mesmo bucket S3 - apenas as URLs sao copiadas.
Dentista: DEISE DOS SANTOS MERUCCI (usuario_id antigo = 10)
"""

import psycopg2
import mysql.connector
import uuid
import os
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

NEW_USER_ID       = "c957de3e-d6f2-4144-a61f-8247b53a7d49"
NEW_CLINICA_ID    = "06e831a4-03c9-4a27-b2b2-5ee867d3c4e2"
USUARIO_ID_ANTIGO = 10

# Mapeamento forma de pagamento antigo -> ENUM novo
MAPA_FORMA_PAGAMENTO = {
    "Dinheiro":          "Dinheiro",
    "Pix":               "PIX",
    "PIX":               "PIX",
    "Cartao de Credito": "Cartão de Crédito",
    "Cartao de Debito":  "Cartão de Débito",
    "Transferencia":     "Transferência",
    "Cheque":            "Cheque",
}

def normalizar_forma(forma):
    if not forma:
        return "Outros"
    # Remove acentos para comparacao
    mapa_direto = {
        "Dinheiro":           "Dinheiro",
        "Pix":                "PIX",
        "PIX":                "PIX",
        "Cartão de Crédito":  "Cartão de Crédito",
        "Cartão de Débito":   "Cartão de Débito",
        "Cartão de Crédito": "Cartão de Crédito",
        "Cartão de Débito":  "Cartão de Débito",
        "Transferência":      "Transferência",
        "Transferencia":      "Transferência",
        "Cheque":             "Cheque",
    }
    return mapa_direto.get(forma, "Outros")


def buscar_pacientes_novos(mysql_conn):
    """Retorna dict cpf -> (uuid, nome) dos pacientes ja migrados."""
    cur = mysql_conn.cursor()
    cur.execute("SELECT id, nome, cpf_cnpj FROM pacientes WHERE user_id = %s", (NEW_USER_ID,))
    rows = cur.fetchall()
    cur.close()
    por_cpf  = {}
    por_nome = {}
    for (pid, nome, cpf) in rows:
        if cpf:
            por_cpf[cpf.replace('.','').replace('-','').replace('/','').strip()] = (pid, nome)
        por_nome[nome.strip().upper()] = (pid, nome)
    return por_cpf, por_nome


def buscar_faturamentos(pg):
    cur = pg.cursor()
    cur.execute("""
        SELECT
            r.id, r.valor, r.descricao, r.data,
            r.cpf, r.cpf_beneficiario, r.recibo,
            r.tipo_rendimento, r.forma_pagamento,
            r.numero_parcelas, r.valor_taxa_cartao,
            r.valor_liquido_recebido, r.taxa_assumida_por,
            p.nome as paciente_nome, p.cpf as paciente_cpf
        FROM rendimentos r
        LEFT JOIN pacientes p ON p.id = r.paciente_id
        WHERE r.usuario_id = %s
        ORDER BY r.data
    """, (USUARIO_ID_ANTIGO,))
    rows = cur.fetchall()
    cur.close()
    return rows


def inserir_faturamentos(mysql_conn, faturamentos, por_cpf, por_nome):
    cur = mysql_conn.cursor()

    sql = """
        INSERT INTO faturamentos (
            id, descricao, valor, data, forma_pagamento,
            paciente, cpf, tipo_pessoa,
            observacoes, recibo_url, recibo_nome,
            paciente_id, user_id, clinica_id,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, 'PF',
            %s, %s, %s,
            %s, %s, %s,
            NOW(), NOW()
        )
    """

    inseridos = 0
    ignorados = 0
    sem_paciente = 0

    for f in faturamentos:
        (old_id, valor, descricao, data,
         cpf, cpf_beneficiario, recibo,
         tipo_rendimento, forma_pagamento,
         numero_parcelas, valor_taxa_cartao,
         valor_liquido_recebido, taxa_assumida_por,
         paciente_nome, paciente_cpf) = f

        novo_id = str(uuid.uuid4())

        # Forma de pagamento
        forma = normalizar_forma(forma_pagamento)

        # Nome e CPF do paciente
        nome_pac = paciente_nome or "Paciente nao identificado"
        cpf_pac  = cpf_beneficiario or paciente_cpf or cpf

        # Tentar vincular ao paciente migrado
        paciente_uuid = None
        if cpf_pac:
            cpf_limpo = cpf_pac.replace('.','').replace('-','').replace('/','').strip()
            match = por_cpf.get(cpf_limpo)
            if match:
                paciente_uuid = match[0]
        if not paciente_uuid and paciente_nome:
            match = por_nome.get(paciente_nome.strip().upper())
            if match:
                paciente_uuid = match[0]
        if not paciente_uuid:
            sem_paciente += 1

        # Recibo (URL S3 - ja existe no mesmo bucket)
        recibo_url  = recibo if recibo else None
        recibo_nome = os.path.basename(recibo) if recibo else None

        # Observacoes extras
        obs_partes = []
        if numero_parcelas and numero_parcelas > 1:
            obs_partes.append(f"Parcelas: {numero_parcelas}")
        if valor_taxa_cartao:
            obs_partes.append(f"Taxa cartao: R$ {valor_taxa_cartao:.2f}")
        if valor_liquido_recebido:
            obs_partes.append(f"Valor liquido: R$ {valor_liquido_recebido:.2f}")
        if taxa_assumida_por and taxa_assumida_por != 'dentista':
            obs_partes.append(f"Taxa assumida por: {taxa_assumida_por}")
        observacoes = " | ".join(obs_partes) if obs_partes else None

        desc = descricao or tipo_rendimento or "Faturamento importado"

        try:
            cur.execute(sql, (
                novo_id, desc, float(valor), data, forma,
                nome_pac, cpf_pac,
                observacoes, recibo_url, recibo_nome,
                paciente_uuid, NEW_USER_ID, NEW_CLINICA_ID
            ))
            inseridos += 1
        except Exception as e:
            print(f"  [ERRO] {desc} ({data}): {e}")
            ignorados += 1

    mysql_conn.commit()
    cur.close()
    return inseridos, ignorados, sem_paciente


def main():
    print("=== Migracao de Faturamentos: PostgreSQL -> MySQL (Hostinger) ===\n")

    print("Conectando ao PostgreSQL...")
    pg = psycopg2.connect(**PG_CONN)
    print("OK")

    print("Conectando ao MySQL (Hostinger)...")
    mysql_conn = mysql.connector.connect(**MYSQL_CONN)
    print("OK\n")

    print("Carregando pacientes ja migrados para vinculacao...")
    por_cpf, por_nome = buscar_pacientes_novos(mysql_conn)
    print(f"  {len(por_cpf)} pacientes com CPF, {len(por_nome)} por nome.\n")

    print("Buscando faturamentos no sistema antigo...")
    faturamentos = buscar_faturamentos(pg)
    print(f"  {len(faturamentos)} faturamentos encontrados.\n")

    print("Inserindo no MySQL...")
    inseridos, ignorados, sem_paciente = inserir_faturamentos(mysql_conn, faturamentos, por_cpf, por_nome)

    pg.close()
    mysql_conn.close()

    print(f"\n=== Concluido ===")
    print(f"  Inseridos:        {inseridos}")
    print(f"  Erros/Ignorados:  {ignorados}")
    print(f"  Sem vinculo pac.: {sem_paciente}")
    print(f"  Total:            {len(faturamentos)}")
    print(f"\n  Obs: recibos S3 foram mantidos com a mesma URL (mesmo bucket).")


if __name__ == "__main__":
    main()
