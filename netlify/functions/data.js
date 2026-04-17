// Netlify serverless function — fetches dashboard data from Supabase
// GET /api/data  →  returns all modules as a single JSON object

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Supabase credentials are not configured.' }),
    };
  }

  const headers = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  function sb(table, query = '') {
    return fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers })
      .then(r => { if (!r.ok) throw new Error(`${table} HTTP ${r.status}`); return r.json(); });
  }

  try {
    const [
      baseFinRows,
      scenRows,
      scenAdjRows,
      revRows,
      mktRows,
      hrRows,
      logRows,
      prjBurnRows,
      prjHealthRows,
    ] = await Promise.all([
      sb('base_financials',      'select=*&order=month_index.asc'),
      sb('scenarios',            'select=*'),
      sb('scenario_adjustments', 'select=*&order=scenario_id.asc,month_index.asc'),
      sb('revenue_monthly',      'select=*&order=month_index.asc'),
      sb('marketing_monthly',    'select=*&order=month_index.asc'),
      sb('hr_monthly',           'select=*&order=month_index.asc'),
      sb('logistics_monthly',    'select=*&order=month_index.asc'),
      sb('projects_budget_burn', 'select=*&order=month_index.asc'),
      sb('projects_health',      'select=*'),
    ]);

    // ── base_financials ──────────────────────────────────
    const base_financials = {
      rev:     baseFinRows.map(r => r.rev),
      cost:    baseFinRows.map(r => r.cost),
      finInc:  baseFinRows.map(r => r.fin_inc),
      corpTax: baseFinRows.map(r => r.corp_tax),
      liqBal:  baseFinRows.map(r => r.liq_bal),
      liqIn:   baseFinRows.map(r => r.liq_in),
      liqEx:   baseFinRows.map(r => r.liq_ex),
      ca:      baseFinRows.map(r => r.ca),
      fa:      baseFinRows.map(r => r.fa),
      eq:      baseFinRows.map(r => r.eq),
      ncl:     baseFinRows.map(r => r.ncl),
      cl:      baseFinRows.map(r => r.cl),
    };

    // ── scenarios ────────────────────────────────────────
    const scenarios = {};
    for (const s of scenRows) {
      const adjs = scenAdjRows
        .filter(a => a.scenario_id === s.id)
        .sort((a, b) => a.month_index - b.month_index);
      scenarios[s.id] = {
        lbl:      s.lbl,
        dot:      s.dot,
        desc:     s.description,
        prjNote:  s.prj_note,
        rAdj:     adjs.map(a => a.r_adj),
        cAdj:     adjs.map(a => a.c_adj),
        lbAdj:    adjs.map(a => a.lb_adj),
        custAdj:  adjs.map(a => a.cust_adj),
        leadsAdj: adjs.map(a => a.leads_adj),
        poAdj:    adjs.map(a => a.po_adj),
        otdAdj:   adjs.map(a => a.otd_adj),
        wareAdj:  adjs.map(a => a.ware_adj),
        dioAdj:   adjs.map(a => a.dio_adj),
        burnAdj:  adjs.map(a => a.burn_adj),
        hcAdj:    adjs.map(a => a.hc_adj),
        salAdj:   adjs.map(a => a.sal_adj),
      };
    }

    // ── revenue ──────────────────────────────────────────
    const revenue = {
      cStart: revRows.map(r => r.c_start),
      cPro:   revRows.map(r => r.c_pro),
      cEnt:   revRows.map(r => r.c_ent),
    };

    // ── marketing ────────────────────────────────────────
    const marketing = {
      budget: mktRows.map(r => r.budget),
      leads:  mktRows.map(r => r.leads),
      demos:  mktRows.map(r => r.demos),
      trials: mktRows.map(r => r.trials),
      conv:   mktRows.map(r => r.conv),
    };

    // ── hr ───────────────────────────────────────────────
    const hr = {
      hc:     hrRows.map(r => r.hc),
      salary: hrRows.map(r => r.salary),
      depts: {
        Warehouse:  hrRows.map(r => r.dept_warehouse),
        Sales:      hrRows.map(r => r.dept_sales),
        Logistics:  hrRows.map(r => r.dept_logistics),
        Finance:    hrRows.map(r => r.dept_finance),
        Management: hrRows.map(r => r.dept_management),
      },
    };

    // ── logistics ────────────────────────────────────────
    const logistics = {
      inventory:  logRows.map(r => r.inventory),
      shipments:  logRows.map(r => r.shipments),
      poCount:    logRows.map(r => r.po_count),
      suppOTD:    logRows.map(r => r.supp_otd),
      wareUsage:  logRows.map(r => r.ware_usage),
      dio:        logRows.map(r => r.dio),
    };

    // ── projects ─────────────────────────────────────────
    const health = {};
    for (const p of prjHealthRows) health[p.project_name] = p.health_score;
    const projects = {
      budgetBurn: prjBurnRows.map(r => r.budget_burn),
      health,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify({ base_financials, scenarios, revenue, marketing, hr, logistics, projects }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
