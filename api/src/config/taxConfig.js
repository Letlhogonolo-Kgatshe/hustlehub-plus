// SARS income tax tables for individuals, 2027 tax year
// (1 March 2026 – 28 February 2027).
// Source: South African Revenue Service, "Rates of tax for individuals",
// https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
// (accessed 7 November 2026).
//
// Each bracket: income from `min` up to and including `max` is taxed as
// `base + rate * (income - threshold)`, where threshold is the top of the
// previous bracket. All amounts are in rand.

const TAX_CONFIG = Object.freeze({
  taxYear: '2026/27', // SARS calls this the 2027 tax year
  periodStart: '2026-03-01',
  periodEnd: '2027-02-28',
  source:
    'SARS, Rates of tax for individuals, 2027 tax year: ' +
    'https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/',

  brackets: Object.freeze([
    { min: 0,         max: 245100,   base: 0,      rate: 0.18, threshold: 0 },
    { min: 245101,    max: 383100,   base: 44118,  rate: 0.26, threshold: 245100 },
    { min: 383101,    max: 530200,   base: 79998,  rate: 0.31, threshold: 383100 },
    { min: 530201,    max: 695800,   base: 125599, rate: 0.36, threshold: 530200 },
    { min: 695801,    max: 887000,   base: 185215, rate: 0.39, threshold: 695800 },
    { min: 887001,    max: 1878600,  base: 259783, rate: 0.41, threshold: 887000 },
    { min: 1878601,   max: Infinity, base: 666339, rate: 0.45, threshold: 1878600 },
  ].map(Object.freeze)),

  // Rebates reduce the tax owed. We only apply the primary rebate because
  // HustleHub+ does not collect users' ages (data minimisation).
  rebates: Object.freeze({
    primary: 17820,   // everyone
    secondary: 9765,  // 65 and older (not applied)
    tertiary: 3249,   // 75 and older (not applied)
  }),

  // Income below this pays no tax for someone under 65 (17 820 / 0.18).
  thresholdUnder65: 99000,
});

module.exports = { TAX_CONFIG };