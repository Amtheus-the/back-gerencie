import psycopg2

PG_CONN = {
    "host":     "cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    "port":     5432,
    "database": "ddcojs3bgb93c",
    "user":     "u4aocqmekiloko",
    "password": "p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008",
    "sslmode":  "require",
}

pg = psycopg2.connect(**PG_CONN)
cur = pg.cursor()
cur.execute("SELECT id, email, nome FROM usuarios ORDER BY id LIMIT 30")
rows = cur.fetchall()
for r in rows:
    print(r)
cur.close()
pg.close()
