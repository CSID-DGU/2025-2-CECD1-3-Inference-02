import sqlite3
c = sqlite3.connect('mindcare.db')
try:
    c.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"')
except:
    pass
try:
    c.execute('ALTER TABLE users ADD COLUMN specialty TEXT')
except:
    pass
try:
    c.execute('ALTER TABLE users ADD COLUMN license_number TEXT')
except:
    pass
try:
    c.execute('CREATE TABLE IF NOT EXISTS doctor_patients (id INTEGER PRIMARY KEY AUTOINCREMENT, doctor_id INTEGER NOT NULL, patient_id INTEGER NOT NULL, note TEXT, created_date TIMESTAMP)')
except:
    pass
c.commit()
c.close()
print('DB 마이그레이션 완료!')