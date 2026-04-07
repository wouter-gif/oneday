// Netlify serverless function — fetches dashboard data from Supabase
// GET /api/data  →  returns all modules as a single JSON object

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL     = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables.' }),
    };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/dashboard_data?select=module,data`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: text };
    }

    const rows = await response.json();

    // Transform [{module: 'base_financials', data: {...}}, ...]
    // into      {base_financials: {...}, scenarios: {...}, ...}
    const result = {};
    for (const row of rows) {
      result[row.module] = row.data;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // cache for 60 s
      },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
