// Netlify serverless function — widget CRUD via Supabase
// GET  /api/widgets          → { widgets: [...] }
// POST /api/widgets          → upsert widgets array for userId
//
// Supabase table:
//   CREATE TABLE widgets (
//     id         TEXT        NOT NULL PRIMARY KEY,
//     user_id    TEXT        NOT NULL DEFAULT 'default',
//     title      TEXT        NOT NULL DEFAULT '',
//     size       TEXT        NOT NULL DEFAULT 'medium',
//     code       TEXT        NOT NULL DEFAULT '',
//     created_at BIGINT      NOT NULL DEFAULT 0,
//     updated_at TIMESTAMPTZ DEFAULT NOW()
//   );

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
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
        `${SUPABASE_URL}/rest/v1/widgets?user_id=eq.${USER_ID}&select=id,title,size,code,created_at&order=created_at.asc`,
        { headers: supabaseHeaders() }
      );
      if (!resp.ok) throw new Error(`Supabase HTTP ${resp.status}`);
      const rows = await resp.json();
      const widgets = rows.map(r => ({
        id:        r.id,
        title:     r.title,
        size:      r.size,
        code:      r.code,
        createdAt: r.created_at,
      }));
      return {
        statusCode: 200,
        headers: { ...cors, 'Cache-Control': 'no-store' },
        body: JSON.stringify({ widgets }),
      };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── POST: save widgets (replace all for user) ──────────
  if (event.httpMethod === 'POST') {
    try {
      const { widgets } = JSON.parse(event.body || '{}');
      if (!Array.isArray(widgets)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'widgets must be an array' }) };
      }

      // Delete all existing widgets for this user
      const delResp = await fetch(
        `${SUPABASE_URL}/rest/v1/widgets?user_id=eq.${USER_ID}`,
        { method: 'DELETE', headers: supabaseHeaders() }
      );
      if (!delResp.ok) {
        const txt = await delResp.text();
        throw new Error(`Delete failed: ${txt}`);
      }

      // Insert each widget as its own row
      if (widgets.length > 0) {
        const rows = widgets.map(w => ({
          id:         w.id,
          user_id:    USER_ID,
          title:      w.title     || '',
          size:       w.size      || 'medium',
          code:       w.code      || '',
          created_at: w.createdAt || Date.now(),
          updated_at: new Date().toISOString(),
        }));
        const insResp = await fetch(
          `${SUPABASE_URL}/rest/v1/widgets`,
          {
            method:  'POST',
            headers: { ...supabaseHeaders(), 'Prefer': 'return=minimal' },
            body:    JSON.stringify(rows),
          }
        );
        if (!insResp.ok) {
          const txt = await insResp.text();
          throw new Error(`Insert failed: ${txt}`);
        }
      }

      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
};
