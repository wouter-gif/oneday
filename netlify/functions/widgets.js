// Netlify serverless function — widget CRUD via Supabase
// GET  /api/widgets          → { widgets: [...] }
// POST /api/widgets          → upsert widgets array for userId
//
// Supabase table (run once in the Supabase SQL editor):
//   CREATE TABLE IF NOT EXISTS widgets (
//     user_id   TEXT NOT NULL DEFAULT 'default',
//     widgets   JSONB NOT NULL DEFAULT '[]',
//     updated_at TIMESTAMPTZ DEFAULT NOW(),
//     PRIMARY KEY (user_id)
//   );

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
// Optional: a fixed userId until auth is added
const USER_ID = 'default';

function supabaseHeaders() {
  return {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  };
}

exports.handler = async function (event) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Supabase credentials not configured.' }),
    };
  }

  // ── GET: load widgets ──────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/widgets?user_id=eq.${USER_ID}&select=widgets`,
        { headers: supabaseHeaders() }
      );
      if (!resp.ok) throw new Error(`Supabase HTTP ${resp.status}`);
      const rows = await resp.json();
      const widgets = rows.length ? rows[0].widgets : [];
      return {
        statusCode: 200,
        headers: { ...cors, 'Cache-Control': 'no-store' },
        body: JSON.stringify({ widgets }),
      };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── POST: save widgets (upsert) ────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const { widgets } = JSON.parse(event.body || '{}');
      if (!Array.isArray(widgets)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'widgets must be an array' }) };
      }

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/widgets`,
        {
          method:  'POST',
          headers: { ...supabaseHeaders(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body:    JSON.stringify({ user_id: USER_ID, widgets, updated_at: new Date().toISOString() }),
        }
      );
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt);
      }
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
};
