import psycopg2
import mysql.connector
import os

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

# Busca rendimentos de Deise com recibo no PG
pg.execute("""
    SELECT id, valor, data, cpf, cpf_beneficiario, recibo
    FROM rendimentos
    WHERE usuario_id = 10 AND recibo IS NOT NULL AND recibo != ''
""")
cols = [d[0] for d in pg.description]
rendimentos = [dict(zip(cols, r)) for r in pg.fetchall()]
print(f"Rendimentos com recibo no PG: {len(rendimentos)}")

# Busca faturamentos de Deise no MySQL
my.execute("""
    SELECT id, valor, data, cpf
    FROM faturamentos
    WHERE user_id = 'c957de3e-d6f2-4144-a61f-8247b53a7d49'
""")
faturamentos = [{'id': r[0], 'valor': float(r[1]), 'data': str(r[2]), 'cpf': r[3] or ''} for r in my.fetchall()]
print(f"Faturamentos no MySQL: {len(faturamentos)}")

atualizados = 0
nao_encontrados = 0

for r in rendimentos:
    url = r['recibo']
    nome = url.split('/')[-1]  # nome do arquivo
    valor_pg = float(r['valor'])
    data_pg = str(r['data'])
    cpf_pg = (r.get('cpf') or r.get('cpf_beneficiario') or '').replace('.', '').replace('-', '').replace('/', '')

    # Tenta match por valor + data + cpf
    match = None
    for f in faturamentos:
        valor_my = float(f['valor'])
        data_my = str(f['data'])[:10]
        cpf_my = (f['cpf'] or '').replace('.', '').replace('-', '').replace('/', '')

        if abs(valor_pg - valor_my) < 0.01 and data_pg == data_my and cpf_pg == cpf_my:
            match = f
            break

    # Se não achou por CPF, tenta só por valor + data
    if not match:
        for f in faturamentos:
            valor_my = float(f['valor'])
            data_my = str(f['data'])[:10]
            if abs(valor_pg - valor_my) < 0.01 and data_pg == data_my:
                match = f
                break

    if match:
        my.execute("""
            UPDATE faturamentos
            SET recibo_url = %s, recibo_nome = %s
            WHERE id = %s AND (recibo_url IS NULL OR recibo_url = '')
        """, (url, nome, match['id']))
        if my.rowcount > 0:
            atualizados += 1
            print(f"  OK: R${valor_pg} em {data_pg} -> {nome}")
        else:
            print(f"  JÁ TEM: R${valor_pg} em {data_pg}")
    else:
        nao_encontrados += 1
        print(f"  NÃO ENCONTRADO: R${valor_pg} em {data_pg} CPF:{cpf_pg}")

MY.commit()
print(f"\nPRONTO: {atualizados} recibos migrados, {nao_encontrados} não encontrados")

pg.close(); PG.close()
my.close(); MY.close()
