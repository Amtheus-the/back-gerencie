import psycopg2

pg = psycopg2.connect(host='cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com', port=5432, database='ddcojs3bgb93c', user='u4aocqmekiloko', password='p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008', sslmode='require')
cur = pg.cursor()
cur.execute("""
    SELECT tipo_rendimento, COUNT(*), SUM(valor)
    FROM rendimentos
    WHERE usuario_id = 10
    AND data >= '2026-05-01' AND data <= '2026-05-31'
    GROUP BY tipo_rendimento
    ORDER BY SUM(valor) DESC
""")
total_geral = 0
for r in cur.fetchall():
    t = float(r[2])
    total_geral += t
    print(f"tipo: [{r[0]}] | qtd: {r[1]} | total: R$ {t:.2f}")

print(f"\nTotal geral maio: R$ {total_geral:.2f}")

# Soma apenas tipo 'Recibo' (como o dashboard faz)
cur.execute("""
    SELECT SUM(valor) FROM rendimentos
    WHERE usuario_id = 10
    AND data >= '2026-05-01' AND data <= '2026-05-31'
    AND tipo_rendimento = 'Recibo'
""")
recibo = cur.fetchone()[0] or 0
print(f"Soma apenas 'Recibo': R$ {float(recibo):.2f}")
pg.close()
