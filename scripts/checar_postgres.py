import psycopg2

conn = psycopg2.connect(
    host="cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    port=5432,
    database="ddcojs3bgb93c",
    user="u4aocqmekiloko",
    password="p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    sslmode="require"
)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tabelas = [r[0] for r in cur.fetchall()]
print("Tabelas:", tabelas)

for tabela in tabelas:
    cur.execute(f"SELECT COUNT(*) FROM {tabela}")
    count = cur.fetchone()[0]
    print(f"  {tabela}: {count} registros")

conn.close()
