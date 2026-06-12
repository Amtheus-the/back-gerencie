import psycopg2

PG = psycopg2.connect(
    host="cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    port=5432, database="ddcojs3bgb93c", user="u4aocqmekiloko",
    password="p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    sslmode="require"
)
pg = PG.cursor()

# Ver colunas da tabela rendimentos
pg.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'rendimentos'
    ORDER BY ordinal_position
""")
print("=== Colunas da tabela rendimentos ===")
for row in pg.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Ver exemplo de registro com recibo
pg.execute("""
    SELECT * FROM rendimentos
    WHERE usuario_id = 10
    LIMIT 3
""")
cols = [d[0] for d in pg.description]
rows = pg.fetchall()
print(f"\n=== Exemplo de registros (colunas: {cols}) ===")
for row in rows:
    d = dict(zip(cols, row))
    for k, v in d.items():
        if v:
            print(f"  {k}: {v}")
    print("---")

pg.close()
PG.close()
