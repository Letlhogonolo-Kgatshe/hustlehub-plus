// Unit tests for the tax logic. Run with: node --test test/
// (node:test is built into Node 18+, so no extra dependency is needed.)

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateAnnualTax,
  findBracket,
  buildIncomeSummary,
  taxYearMonths,
} = require('../src/services/taxService');

test('zero income pays no tax', () => {
  const r = calculateAnnualTax(0);
  assert.equal(r.estimatedTax, 0);
  assert.equal(r.net, 0);
  assert.equal(r.effectiveRate, 0);
});

test('income at the tax threshold (R99 000) pays no tax', () => {
  assert.equal(calculateAnnualTax(99000).estimatedTax, 0);
});

test('income just above the threshold pays a little tax', () => {
  // 18% of 100 000 = 18 000; minus rebate 17 820 = 180
  assert.equal(calculateAnnualTax(100000).estimatedTax, 180);
});

test('worked example: R300 000 (used in the README)', () => {
  // 44 118 + 26% x (300 000 - 245 100) = 58 392; minus 17 820 = 40 572
  const r = calculateAnnualTax(300000);
  assert.equal(r.taxBeforeRebate, 58392);
  assert.equal(r.estimatedTax, 40572);
  assert.equal(r.net, 259428);
  assert.equal(r.marginalRate, 0.26);
});

// The top of each bracket must give exactly the next bracket's base amount,
// which proves the table and the formula agree at every edge.
const edges = [
  [245100, 44118],
  [383100, 79998],
  [530200, 125599],
  [695800, 185215],
  [887000, 259783],
  [1878600, 666339],
];
for (const [income, expectedBeforeRebate] of edges) {
  test(`bracket edge R${income} gives R${expectedBeforeRebate} before rebate`, () => {
    assert.equal(calculateAnnualTax(income).taxBeforeRebate, expectedBeforeRebate);
  });
}

test('one rand over an edge moves into the next bracket', () => {
  assert.equal(findBracket(245100).rate, 0.18);
  assert.equal(findBracket(245101).rate, 0.26);
});

test('top bracket is taxed at 45%', () => {
  // 666 339 + 45% x 121 400 = 720 969; minus 17 820 = 703 149
  assert.equal(calculateAnnualTax(2000000).estimatedTax, 703149);
});

test('rejects negative, NaN and non-number income', () => {
  assert.throws(() => calculateAnnualTax(-1), TypeError);
  assert.throws(() => calculateAnnualTax(NaN), TypeError);
  assert.throws(() => calculateAnnualTax('1000'), TypeError);
});

test('tax year runs March to February', () => {
  const m = taxYearMonths();
  assert.equal(m.length, 12);
  assert.equal(m[0], '2026-03');
  assert.equal(m[11], '2027-02');
});

test('summary groups income by month and ignores other tax years', () => {
  const s = buildIncomeSummary([
    { amount: 200000, createdAt: '2026-04-10T10:00:00Z' },
    { amount: 100000, createdAt: '2026-09-01T10:00:00Z' },
    { amount: 999999, createdAt: '2026-02-27T10:00:00Z' }, // previous tax year
  ]);
  assert.equal(s.taxYearIncome, 300000);
  assert.equal(s.estimatedTax, 40572);
  assert.equal(s.net, 259428);
  assert.equal(s.belowThreshold, false);
  const april = s.monthly.find((x) => x.month === '2026-04');
  const sept = s.monthly.find((x) => x.month === '2026-09');
  assert.deepEqual([april.total, april.count], [200000, 1]);
  assert.deepEqual([sept.total, sept.count], [100000, 1]);
  // monthly tax is split in proportion to income and adds up to the annual figure
  const monthlyTaxTotal = s.monthly.reduce((sum, x) => sum + x.estimatedTax, 0);
  assert.equal(Math.round(monthlyTaxTotal), 40572);
});

test('summary with no transactions returns zeros, not errors', () => {
  const s = buildIncomeSummary([]);
  assert.equal(s.taxYearIncome, 0);
  assert.equal(s.estimatedTax, 0);
  assert.equal(s.belowThreshold, true);
  assert.equal(s.monthly.length, 12);
});

test('summary skips invalid amounts', () => {
  const s = buildIncomeSummary([
    { amount: -500, createdAt: '2026-05-01T00:00:00Z' },
    { amount: 'abc', createdAt: '2026-05-01T00:00:00Z' },
    { amount: 1000, createdAt: '2026-05-01T00:00:00Z' },
  ]);
  assert.equal(s.taxYearIncome, 1000);
  assert.equal(s.monthly.find((x) => x.month === '2026-05').count, 1);
});

test('demo-sized income below the threshold gives R0 and says why', () => {
  const s = buildIncomeSummary([
    { amount: 1500, createdAt: '2026-10-05T09:00:00Z' },
    { amount: 2500, createdAt: '2026-10-20T09:00:00Z' },
  ]);
  assert.equal(s.estimatedTax, 0);
  assert.equal(s.net, 4000);
  assert.equal(s.belowThreshold, true);
  assert.equal(s.threshold, 99000);
  assert.equal(s.taxYear, '2026/27');
});