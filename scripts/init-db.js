// Membuat tabel-tabel di database. Jalankan: npm run init-db
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Database siap. Tabel leads, messages, lead_scores sudah dibuat.');
  } catch (err) {
    console.error('❌ Gagal inisialisasi database:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
