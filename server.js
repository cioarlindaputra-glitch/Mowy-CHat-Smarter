require('dotenv').config();
const path = require('path');
const express = require('express');
const db = require('./src/db');
const { generateReply, evaluateCriteria, MODEL } = require('./src/openai');
const { computeScore, temperature, CRITERIA } = require('./src/scoring');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Helpers -----------------------------------------------------------------

async function getHistory(leadId) {
  const { rows } = await db.query(
    'SELECT role, content FROM messages WHERE lead_id = $1 ORDER BY id ASC',
    [leadId]
  );
  return rows;
}

async function saveMessage(leadId, role, content) {
  await db.query(
    'INSERT INTO messages (lead_id, role, content) VALUES ($1, $2, $3)',
    [leadId, role, content]
  );
}

async function upsertScore(leadId, evaluations) {
  const score = computeScore(evaluations);
  await db.query(
    `INSERT INTO lead_scores (lead_id, criteria, total_score, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (lead_id) DO UPDATE
       SET criteria = EXCLUDED.criteria,
           total_score = EXCLUDED.total_score,
           updated_at = now()`,
    [leadId, JSON.stringify(evaluations), score.total]
  );
  return score;
}

// --- API ---------------------------------------------------------------------

app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }));

// Daftar kriteria scoring (untuk UI).
app.get('/api/criteria', (_req, res) => {
  res.json(CRITERIA.map(({ no, key, label, weight, media, condition }) => ({
    no, key, label, weight, media, condition,
  })));
});

// Kirim pesan customer -> balasan Mowy + update skor.
// body: { leadId?, name?, phone?, message }
app.post('/api/chat', async (req, res) => {
  try {
    const { message, name, phone } = req.body || {};
    let { leadId } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message wajib diisi' });
    }

    // Buat lead baru bila belum ada.
    if (!leadId) {
      const { rows } = await db.query(
        'INSERT INTO leads (name, phone) VALUES ($1, $2) RETURNING id',
        [name || null, phone || null]
      );
      leadId = rows[0].id;
      await db.query(
        `INSERT INTO lead_scores (lead_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [leadId]
      );
    } else if (name || phone) {
      await db.query(
        `UPDATE leads SET name = COALESCE($2, name), phone = COALESCE($3, phone),
         updated_at = now() WHERE id = $1`,
        [leadId, name || null, phone || null]
      );
    }

    await saveMessage(leadId, 'customer', message.trim());
    const history = await getHistory(leadId);

    const reply = await generateReply(history, { name });
    await saveMessage(leadId, 'assistant', reply);

    // Evaluasi ulang skor berdasarkan percakapan terbaru.
    const fullHistory = [...history, { role: 'assistant', content: reply }];
    let score;
    try {
      const evaluations = await evaluateCriteria(fullHistory);
      score = await upsertScore(leadId, evaluations);
    } catch (e) {
      console.error('[scoring] gagal evaluasi:', e.message);
    }

    res.json({
      leadId,
      reply,
      score: score ? { total: score.total, max: score.max, temperature: temperature(score.total), breakdown: score.breakdown } : null,
    });
  } catch (err) {
    console.error('[/api/chat]', err);
    res.status(500).json({ error: 'Terjadi kesalahan di server', detail: err.message });
  }
});

// Detail satu lead: info, skor, percakapan.
app.get('/api/leads/:id', async (req, res) => {
  try {
    const { rows: leadRows } = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (!leadRows.length) return res.status(404).json({ error: 'Lead tidak ditemukan' });

    const { rows: scoreRows } = await db.query('SELECT * FROM lead_scores WHERE lead_id = $1', [req.params.id]);
    const messages = await getHistory(req.params.id);
    const evaluations = scoreRows[0]?.criteria || {};
    const score = computeScore(evaluations);

    res.json({
      lead: leadRows[0],
      score: { total: score.total, max: score.max, temperature: temperature(score.total), breakdown: score.breakdown },
      messages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daftar semua lead + skor (untuk dashboard sederhana).
app.get('/api/leads', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.id, l.name, l.phone, l.created_at,
              COALESCE(s.total_score, 0) AS total_score
       FROM leads l
       LEFT JOIN lead_scores s ON s.lead_id = l.id
       ORDER BY l.created_at DESC
       LIMIT 200`
    );
    res.json(rows.map((r) => ({ ...r, temperature: temperature(Number(r.total_score)) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mowy CS AI jalan di http://localhost:${PORT}  (model: ${MODEL})`);
});
