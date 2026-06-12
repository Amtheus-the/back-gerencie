import psycopg2

PG = psycopg2.connect(
    host="cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    port=5432, database="ddcojs3bgb93c", user="u4aocqmekiloko",
    password="p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    sslmode="require"
)
pg = PG.cursor()

for tabela in ['pacientes', 'rendimentos', 'agendamentos']:
    pg.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{tabela}'")
    cols = [r[0] for r in pg.fetchall()]
    print(f"{tabela}: {cols}")
    # conta registros da Deise
    usuario_col = next((c for c in cols if 'usuario' in c or 'user' in c or 'dentista' in c), None)
    if usuario_col:
        pg.execute(f"SELECT COUNT(*) FROM {tabela} WHERE {usuario_col} = 10")
        print(f"  -> {pg.fetchone()[0]} registros da Deise (col: {usuario_col})")

PG.close()
