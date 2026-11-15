// Tax estimation for freelancers. Pure functions only: no database access,
// so the logic can be unit-tested on its own and reused by the controller.
//
// Assumptions (also stated in the README and returned by the API):
// 1. The freelancer's HustleHub+ income is their only taxable income.
// 2. No deductions (expenses, retirement contributions, medical credits).
// 3. Under 65, so only the primary rebate applies.
// 4. The result is an estimate, not tax advice.

const { TAX_CONFIG } = require('../config/taxConfig');

const round2 = (n) => Math.round(n * 100) / 100;

function assertValidIncome(income) {
  if (typeof income !== 'number' || !Number.isFinite(income) || income < 0) {
    throw new TypeError('income must be a finite, non-negative number');
  }
}

// Find the bracket that a given annual taxable income falls in.
function findBracket(income, config = TAX_CONFIG) {
  assertValidIncome(income);
  return config.brackets.find((b) => income <= b.max);
}

// Annual tax before and after the primary rebate.
function calculateAnnualTax(income, config = TAX_CONFIG) {
  assertValidIncome(income);
  const bracket = findBracket(income, config);
  const taxBeforeRebate = bracket.base + bracket.rate * (income - bracket.threshold);
  const estimatedTax = Math.max(0, taxBeforeRebate - config.rebates.primary);

  return {
    taxYear: config.taxYear,
    taxableIncome: round2(income),
    taxBeforeRebate: round2(taxBeforeRebate),
    rebate: config.rebates.primary,
    estimatedTax: round2(estimatedTax),
    net: round2(income - estimatedTax),
    marginalRate: bracket.rate,
    effectiveRate: income > 0 ? round2((estimatedTax / income) * 100) / 100 : 0,
  };
}

// Month keys for the tax year, March to February, e.g. "2026-03" ... "2027-02".
function taxYearMonths(config = TAX_CONFIG) {
  const [startYear] = config.periodStart.split('-').map(Number);
  const months = [];
  for (let i = 0; i < 12; i += 1) {
    const monthIndex = (2 + i) % 12; // 2 = March
    const year = startYear + (2 + i >= 12 ? 1 : 0);
    months.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}`);
  }
  return months;
}

// Build the tax summary from a list of { amount, createdAt } transactions
// that already belong to ONE freelancer (the controller scopes the query).
// Tax is worked out per SARS tax year, so only transactions dated inside the
// current tax year (1 March - 28 February) count. The controller's existing
// `total` field stays as all-time income for the rest of the dashboard.
function buildIncomeSummary(transactions, config = TAX_CONFIG) {
  const months = taxYearMonths(config);
  const byMonth = new Map(months.map((m) => [m, { total: 0, count: 0 }]));
  let taxYearIncome = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    const key = new Date(t.createdAt).toISOString().slice(0, 7);
    const bucket = byMonth.get(key);
    if (!bucket) continue; // outside this tax year
    bucket.total += amount;
    bucket.count += 1;
    taxYearIncome += amount;
  }

  const annual = calculateAnnualTax(taxYearIncome, config);

  // Spread the annual estimate across months in proportion to income,
  // so the chart's monthly tax adds up to the annual figure.
  const monthly = months.map((month) => {
    const { total, count } = byMonth.get(month);
    const share = taxYearIncome > 0 ? total / taxYearIncome : 0;
    return {
      month,
      total: round2(total),
      count,
      estimatedTax: round2(annual.estimatedTax * share),
    };
  });

  return {
    taxYear: annual.taxYear,
    taxYearIncome: annual.taxableIncome,
    estimatedTax: annual.estimatedTax,
    net: annual.net,
    taxBeforeRebate: annual.taxBeforeRebate,
    rebate: annual.rebate,
    marginalRate: annual.marginalRate,
    effectiveRate: annual.effectiveRate,
    threshold: config.thresholdUnder65,
    belowThreshold: annual.taxableIncome <= config.thresholdUnder65,
    monthly,
    assumptions: [
      'Only income earned in the current tax year (1 March - 28 February) is taxed',
      'HustleHub+ income is treated as your only taxable income',
      'No deductions are applied',
      'Only the primary rebate is applied (under 65)',
      'This is an estimate, not tax advice',
    ],
    source: config.source,
  };
}

module.exports = { calculateAnnualTax, findBracket, buildIncomeSummary, taxYearMonths };