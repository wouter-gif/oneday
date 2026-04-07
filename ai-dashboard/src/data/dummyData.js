export const dummyData = {
  company: {
    name: "TechVision BV",
    founded: 2019,
    employees: 47,
  },
  sales: {
    monthly: [
      { month: "Jan", revenue: 42500, deals: 12, target: 45000 },
      { month: "Feb", revenue: 38200, deals: 9,  target: 45000 },
      { month: "Mar", revenue: 51300, deals: 15, target: 45000 },
      { month: "Apr", revenue: 47800, deals: 14, target: 50000 },
      { month: "Mei", revenue: 53100, deals: 16, target: 50000 },
      { month: "Jun", revenue: 62400, deals: 19, target: 50000 },
      { month: "Jul", revenue: 58900, deals: 17, target: 55000 },
      { month: "Aug", revenue: 67200, deals: 21, target: 55000 },
      { month: "Sep", revenue: 71500, deals: 23, target: 55000 },
      { month: "Okt", revenue: 68300, deals: 20, target: 60000 },
      { month: "Nov", revenue: 74800, deals: 24, target: 60000 },
      { month: "Dec", revenue: 82100, deals: 28, target: 60000 },
    ],
    totalRevenue: 718100,
    totalDeals: 218,
    avgDealSize: 3294,
    topProducts: [
      { name: "Enterprise Suite", revenue: 312000, share: 43.4 },
      { name: "Pro Plan",         revenue: 215000, share: 29.9 },
      { name: "Starter",          revenue: 118000, share: 16.4 },
      { name: "Add-ons",          revenue:  73100, share: 10.2 },
    ],
  },
  customers: {
    total: 284,
    new: 47,
    churned: 12,
    retention: 95.8,
    nps: 72,
    segments: [
      { segment: "Enterprise", count: 28,  revenue: 312000 },
      { segment: "Mid-market", count: 89,  revenue: 215000 },
      { segment: "SMB",        count: 167, revenue: 191100 },
    ],
  },
  team: {
    headcount: 47,
    departments: [
      { dept: "Engineering", count: 18 },
      { dept: "Sales",       count: 11 },
      { dept: "Marketing",   count: 7  },
      { dept: "Support",     count: 6  },
      { dept: "Operations",  count: 5  },
    ],
    openPositions: 8,
  },
  performance: {
    mrr: 68500,
    arr: 822000,
    growth: 34.2,
    churnRate: 2.1,
    cac: 1250,
    ltv: 8900,
    ltvCac: 7.12,
  },
};

/** Compacte samenvatting die meegestuurd wordt naar Claude in het systeem-prompt */
export const dataSummary = {
  beschrijving: "Bedrijfsdata voor TechVision BV — SaaS startup (2019)",
  financieel: {
    MRR: `€${dummyData.performance.mrr.toLocaleString("nl-NL")}`,
    ARR: `€${dummyData.performance.arr.toLocaleString("nl-NL")}`,
    groei: `${dummyData.performance.growth}%`,
    totaleOmzet2024: `€${dummyData.sales.totalRevenue.toLocaleString("nl-NL")}`,
  },
  kpis: {
    CAC: `€${dummyData.performance.cac}`,
    LTV: `€${dummyData.performance.ltv}`,
    "LTV:CAC": dummyData.performance.ltvCac,
    churnRate: `${dummyData.performance.churnRate}%`,
    totaalDeals: dummyData.sales.totalDeals,
    gemDealgrootte: `€${dummyData.sales.avgDealSize}`,
  },
  klanten: {
    totaal: dummyData.customers.total,
    nieuw: dummyData.customers.new,
    opgezegd: dummyData.customers.churned,
    retentie: `${dummyData.customers.retention}%`,
    NPS: dummyData.customers.nps,
  },
  team: {
    headcount: dummyData.team.headcount,
    vacatures: dummyData.team.openPositions,
  },
  maandenData: dummyData.sales.monthly,
  klantSegmenten: dummyData.customers.segments,
  teamVerdeling: dummyData.team.departments,
  topProducten: dummyData.sales.topProducts,
};
