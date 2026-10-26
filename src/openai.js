const OpenAI = require('openai');
const { CRITERIA } = require('./scoring');

if (!process.env.OPENAI_API_KEY) {
  console.warn('[openai] OPENAI_API_KEY belum di-set. Isi di file .env sebelum mulai chat.');
}
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'MISSING_KEY' });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Daftar info yang harus digali Mowy, dibuat dari definisi KPI.
const CHECKLIST = CRITERIA.map((c) => `${c.no}. ${c.label} — ${c.condition}`).join('\n');

const SYSTEM_PROMPT = `Kamu adalah "Mowy", customer service AI dari sebuah jasa desain & kontraktor INTERIOR.
Gaya bicaramu ramah, profesional, hangat, dan natural seperti CS manusia yang berpengalaman. Gunakan Bahasa Indonesia.

TUGASMU:
- Melayani calon klien yang tertarik membuat/renovasi interior.
- Secara alami (tidak seperti interogasi) menggali informasi berikut selama percakapan. Tanya 1-2 hal per balasan, mengalir sesuai konteks, jangan menembak semua pertanyaan sekaligus:
${CHECKLIST}

ATURAN:
- Jawab singkat, jelas, dan ramah. Gunakan sapaan yang sopan (Kak/Pak/Bu sesuai konteks).
- Jika customer bertanya hal lain (harga, proses, portofolio), jawab dengan wajar, lalu arahkan kembali untuk melengkapi info di atas.
- Jelaskan alur kerja bila ditanya, dan tawarkan opsi konsep/tema bila relevan.
- Jangan mengarang fakta spesifik perusahaan (alamat kantor, nomor rekening, harga pasti) yang belum kamu ketahui; minta data itu ke tim bila perlu.
- Jangan pernah menyebut skor internal atau sistem penilaian kepada customer.
- Tujuan akhir: mengajak customer survey, bersedia membayar Consultation Fee (CF), dan berkunjung ke kantor.`;

// Hasilkan balasan Mowy berikutnya.
// history: [{ role: 'customer' | 'assistant', content }]
async function generateReply(history, lead = {}) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  if (lead.name) {
    messages.push({ role: 'system', content: `Nama customer: ${lead.name}.` });
  }
  for (const m of history) {
    messages.push({ role: m.role === 'customer' ? 'user' : 'assistant', content: m.content });
  }

  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 400,
  });
  return res.choices[0].message.content.trim();
}

// Skema JSON terstruktur untuk evaluasi 13 kriteria.
const evalSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'met', 'value'],
        properties: {
          key: { type: 'string', enum: CRITERIA.map((c) => c.key) },
          met: { type: 'boolean' },
          value: {
            type: 'string',
            description: 'Ringkasan singkat bukti dari percakapan (output), atau kosong bila belum ada.',
          },
        },
      },
    },
  },
};

const EVAL_INSTRUCTIONS = `Kamu adalah evaluator lead interior. Baca seluruh transkrip percakapan antara customer dan CS.
Untuk SETIAP kriteria di bawah, tentukan apakah "met" (terpenuhi) berdasarkan syaratnya, dan tuliskan "value" berupa ringkasan singkat buktinya (bahasa Indonesia). Jika belum ada info, met=false dan value kosong.
Nilai hanya berdasarkan isi percakapan, jangan mengarang. Kembalikan SEMUA ${CRITERIA.length} kriteria.

KRITERIA:
${CRITERIA.map((c) => `- key="${c.key}" (${c.label}): terpenuhi jika ${c.condition}`).join('\n')}`;

// Evaluasi semua kriteria dari transkrip. Return map { key: { met, value } }.
async function evaluateCriteria(history) {
  const transcript = history
    .map((m) => `${m.role === 'customer' ? 'CUSTOMER' : 'MOWY'}: ${m.content}`)
    .join('\n');

  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: EVAL_INSTRUCTIONS },
      { role: 'user', content: `TRANSKRIP:\n${transcript}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'lead_evaluation', strict: true, schema: evalSchema },
    },
  });

  const parsed = JSON.parse(res.choices[0].message.content);
  const map = {};
  for (const item of parsed.items || []) {
    map[item.key] = { met: !!item.met, value: item.value || '' };
  }
  return map;
}

module.exports = { generateReply, evaluateCriteria, MODEL };
