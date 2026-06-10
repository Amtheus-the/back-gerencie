import psycopg2
import mysql.connector

pg = psycopg2.connect(host='cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com', port=5432, database='ddcojs3bgb93c', user='u4aocqmekiloko', password='p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008', sslmode='require')
cur = pg.cursor()
cur.execute("""
    SELECT r.id, r.descricao, r.valor, r.data, p.nome as paciente
    FROM rendimentos r
    LEFT JOIN pacientes p ON p.id = r.paciente_id
    WHERE r.usuario_id = 10
    AND r.data >= '2026-05-01' AND r.data <= '2026-05-31'
    ORDER BY r.data, r.valor
""")
antigo = cur.fetchall()
total_antigo = sum(float(r[2]) for r in antigo)
print(f"ANTIGO - {len(antigo)} registros, total: R$ {total_antigo:.2f}")
for r in antigo:
    print(f"  {r[3]} | {str(r[4])[:30]:30s} | R$ {float(r[2]):>10.2f} | {str(r[1])[:40]}")
pg.close()

print()

my = mysql.connector.connect(host='srv1722.hstgr.io', port=3306, database='u410205205_gerencie', user='u410205205_rootgerencie', password='Gerencie1@')
cur2 = my.cursor()
cur2.execute("""
    SELECT id, descricao, valor, data, paciente
    FROM faturamentos
    WHERE user_id = 'c957de3e-d6f2-4144-a61f-8247b53a7d49'
    AND data >= '2026-05-01' AND data <= '2026-05-31'
    ORDER BY data, valor
""")
novo = cur2.fetchall()
total_novo = sum(float(r[2]) for r in novo)
print(f"NOVO - {len(novo)} registros, total: R$ {total_novo:.2f}")
for r in novo:
    print(f"  {r[3]} | {str(r[4])[:30]:30s} | R$ {float(r[2]):>10.2f} | {str(r[1])[:40]}")
my.close()

print()
print(f"DIFERENCA: R$ {total_novo - total_antigo:.2f}")
