"""
Corrige o campo tipo_pessoa nos faturamentos migrados:
  - tipo_rendimento = 'Recibo'      -> tipo_pessoa = 'PF'
  - tipo_rendimento = 'Nota Fiscal' -> tipo_pessoa = 'PJ'
"""
import psycopg2
import mysql.connector

PG_CONN = {
    "host":     "cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    "port":     5432,
    "database": "ddcojs3bgb93c",
    "user":     "u4aocqmekiloko",
    "password": "p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    "sslmode":  "require",
}

MYSQL_CONN = {
    "host":     "srv1722.hstgr.io",
    "port":     3306,
    "database": "u410205205_gerencie",
    "user":     "u410205205_rootgerencie",
    "password": "Gerencie1@",
}

NEW_USER_ID       = "c957de3e-d6f2-4144-a61f-8247b53a7d49"
USUARIO_ID_ANTIGO = 10

# Busca tipo_rendimento de cada lançamento pelo valor+data+descricao para cruzar
pg = psycopg2.connect(**PG_CONN)
cur_pg = pg.cursor()
cur_pg.execute("""
    SELECT valor, data, descricao, tipo_rendimento
    FROM rendimentos
    WHERE usuario_id = %s
""", (USUARIO_ID_ANTIGO,))
antigos = cur_pg.fetchall()
pg.close()

# Monta lookup: (valor, data, descricao[:40]) -> tipo
lookup = {}
for (valor, data, descricao, tipo) in antigos:
    chave = (float(valor), str(data), (descricao or '')[:40])
    lookup[chave] = tipo

print(f"Lançamentos no antigo: {len(antigos)}")
print(f"  Nota Fiscal: {sum(1 for v in lookup.values() if v == 'Nota Fiscal')}")
print(f"  Recibo:      {sum(1 for v in lookup.values() if v == 'Recibo')}")

# Agora corrige no MySQL
my = mysql.connector.connect(**MYSQL_CONN)
cur_my = my.cursor()
cur_my.execute("""
    SELECT id, valor, data, descricao FROM faturamentos
    WHERE user_id = %s
""", (NEW_USER_ID,))
novos = cur_my.fetchall()

pf = 0
pj = 0
nao_encontrados = 0

for (fid, valor, data, descricao) in novos:
    chave = (float(valor), str(data), (descricao or '')[:40])
    tipo = lookup.get(chave)

    if tipo == 'Nota Fiscal':
        cur_my.execute("UPDATE faturamentos SET tipo_pessoa = 'PJ' WHERE id = %s", (fid,))
        pj += 1
    elif tipo == 'Recibo':
        cur_my.execute("UPDATE faturamentos SET tipo_pessoa = 'PF' WHERE id = %s", (fid,))
        pf += 1
    else:
        nao_encontrados += 1

my.commit()
cur_my.close()
my.close()

print(f"\nCorrecoes aplicadas:")
print(f"  PF (Recibo):      {pf}")
print(f"  PJ (Nota Fiscal): {pj}")
print(f"  Nao encontrados:  {nao_encontrados}")
