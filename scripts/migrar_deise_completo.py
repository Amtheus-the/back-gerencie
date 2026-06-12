import psycopg2
import mysql.connector
import uuid
from datetime import datetime, date

PG = psycopg2.connect(
    host="cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    port=5432, database="ddcojs3bgb93c", user="u4aocqmekiloko",
    password="p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    sslmode="require"
)
MY = mysql.connector.connect(
    host="srv1722.hstgr.io", port=3306,
    database="u410205205_gerencie",
    user="u410205205_rootgerencie", password="Gerencie1@"
)
pg = PG.cursor()
my = MY.cursor()

# Busca Deise no PostgreSQL
pg.execute("SELECT * FROM usuarios WHERE id = 10")
cols = [d[0] for d in pg.description]
row = pg.fetchone()
if not row:
    print("Deise não encontrada no PostgreSQL!")
    exit(1)
deise_pg = dict(zip(cols, row))
deise_pg_id = deise_pg['id']
print(f"Deise PG id: {deise_pg_id}")

# Busca Deise no MySQL novo
my.execute("SELECT id, clinica_id FROM users WHERE email = 'dsodontologia2019@gmail.com'")
deise_my = my.fetchone()
if not deise_my:
    print("Deise não encontrada no MySQL novo!")
    exit(1)
deise_my_id, clinica_id = deise_my
print(f"Deise MySQL id: {deise_my_id}, clinica_id: {clinica_id}")

now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# ── PACIENTES ────────────────────────────────────────────────────────────────
pg.execute("SELECT * FROM pacientes WHERE usuario_id = %s", (int(deise_pg_id),))
cols = [d[0] for d in pg.description]
pacientes = [dict(zip(cols, r)) for r in pg.fetchall()]
print(f"\nPacientes encontrados: {len(pacientes)}")

# Mapa pg_id -> mysql_id
paciente_id_map = {}
inseridos = 0
for p in pacientes:
    novo_id = str(uuid.uuid4())
    paciente_id_map[p['id']] = novo_id
    dn = p.get('data_nascimento')
    try:
        my.execute("""
            INSERT INTO pacientes (id, nome, cpf_cnpj, tipo_pessoa, email, telefone,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                data_nascimento, observacoes, ativo, user_id, clinica_id, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            novo_id,
            p.get('nome',''),
            p.get('cpf') or p.get('cnpj') or '',
            'PF',
            p.get('email',''),
            p.get('telefone',''),
            p.get('cep',''),
            p.get('rua','') or p.get('logradouro',''),
            p.get('numero',''),
            p.get('complemento',''),
            p.get('bairro',''),
            p.get('municipio','') or p.get('cidade',''),
            p.get('estado',''),
            dn,
            p.get('observacoes',''),
            True,
            deise_my_id,
            clinica_id,
            now, now
        ))
        inseridos += 1
    except Exception as e:
        print(f"  Erro paciente {p.get('nome')}: {e}")
MY.commit()
print(f"OK {inseridos} pacientes inseridos")

# ── RENDIMENTOS → FATURAMENTOS ──────────────────────────────────────────────
pg.execute("SELECT * FROM rendimentos WHERE usuario_id = %s", (int(deise_pg_id),))
cols = [d[0] for d in pg.description]
rendimentos = [dict(zip(cols, r)) for r in pg.fetchall()]
print(f"\nRendimentos encontrados: {len(rendimentos)}")

inseridos = 0
for r in rendimentos:
    novo_id = str(uuid.uuid4())
    paciente_my_id = paciente_id_map.get(r.get('paciente_id'))
    try:
        my.execute("""
            INSERT INTO faturamentos (id, descricao, valor, data, forma_pagamento,
                paciente, cpf, procedimento, tipo_pessoa, observacoes,
                paciente_id, user_id, clinica_id, nota_emitida, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            novo_id,
            r.get('descricao') or r.get('procedimento') or 'Consulta',
            float(r.get('valor') or 0),
            r.get('data') or r.get('created_at', now),
            r.get('forma_pagamento') or 'Dinheiro',
            '',
            r.get('cpf') or r.get('cpf_beneficiario') or '',
            r.get('descricao') or '',
            'PF',
            r.get('observacoes') or '',
            paciente_my_id,
            deise_my_id,
            clinica_id,
            False,
            now, now
        ))
        inseridos += 1
    except Exception as e:
        print(f"  Erro rendimento: {e}")
MY.commit()
print(f"OK {inseridos} faturamentos inseridos")

my.execute("SET FOREIGN_KEY_CHECKS=0")
# ── AGENDAMENTOS ─────────────────────────────────────────────────────────────
pg.execute("SELECT * FROM agendamentos WHERE dentista_executor_usuario_id = %s", (int(deise_pg_id),))
cols = [d[0] for d in pg.description]
agendamentos = [dict(zip(cols, r)) for r in pg.fetchall()]
print(f"\nAgendamentos encontrados: {len(agendamentos)}")

inseridos = 0
for a in agendamentos:
    novo_id = str(uuid.uuid4())
    paciente_my_id = paciente_id_map.get(a.get('paciente_id'))
    if not paciente_my_id:
        continue  # paciente não migrado, pula
    data_hora = a.get('data_hora') or a.get('inicio') or a.get('data')
    if not data_hora:
        continue
    try:
        my.execute("""
            INSERT INTO agendamentos (id, clinica_id, user_id, paciente_id,
                data_hora, duracao_minutos, status, observacoes, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            novo_id, clinica_id, deise_my_id, paciente_my_id,
            data_hora, a.get('duracao') or 30,
            a.get('status') or 'confirmado',
            a.get('observacoes') or '',
            now, now
        ))
        # procedimento_id ignorado (não existem procedimentos migrados ainda)
        inseridos += 1
    except Exception as e:
        print(f"  Erro agendamento: {e}")
MY.commit()
print(f"OK {inseridos} agendamentos inseridos")

my.execute("SET FOREIGN_KEY_CHECKS=1")
MY.commit()
pg.close(); PG.close()
my.close(); MY.close()
print("\nPRONTO Migração da Deise concluída!")
