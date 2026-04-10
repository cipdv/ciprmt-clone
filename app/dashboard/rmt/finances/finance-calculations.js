const QUICK_METHOD_RATE = 0.088;
const ONTARIO_HST_RATE = 0.13;
const LINE_107_THRESHOLD = 30000;
const HOME_OFFICE_BUSINESS_USE_RATE = 0.37;
const DEFAULT_ESTIMATED_INCOME_TAX_RATE = 0.2;

// Configuration assumption:
// Treatment and additional-treatment amounts are stored as gross cash collected (HST-included).
const TREATMENT_AMOUNTS_INCLUDE_HST = true;

// Fiscal year config for quick-method line 107 threshold logic.
// 1 = January, 4 = April, etc.
const GST_FISCAL_YEAR_START_MONTH = 1;

const DEFAULT_ADDITIONAL_INCOME_FLAGS = {
  includeInIncomeTax: true,
  includeInHstQuickMethod: false,
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMonth = (value) => {
  const month = Number.parseInt(value, 10);
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : null;
};

const sumBy = (items, getValue) =>
  (items || []).reduce((sum, item) => sum + toNumber(getValue(item)), 0);

const withAdditionalIncomeFlags = (entry) => {
  const includeInIncomeTaxRaw =
    entry?.includeInIncomeTax ??
    entry?.include_in_income_tax ??
    entry?.include_income_tax;
  const includeInHstQuickMethodRaw =
    entry?.includeInHstQuickMethod ??
    entry?.include_in_hst_quick_method ??
    entry?.include_hst_quick_method;

  return {
    ...entry,
    includeInIncomeTax:
      typeof includeInIncomeTaxRaw === "boolean"
        ? includeInIncomeTaxRaw
        : DEFAULT_ADDITIONAL_INCOME_FLAGS.includeInIncomeTax,
    includeInHstQuickMethod:
      typeof includeInHstQuickMethodRaw === "boolean"
        ? includeInHstQuickMethodRaw
        : DEFAULT_ADDITIONAL_INCOME_FLAGS.includeInHstQuickMethod,
  };
};

export function calculateHstCollectedFromGross(gross) {
  // Display-only HST extraction when gross includes HST.
  return (toNumber(gross) * ONTARIO_HST_RATE) / (1 + ONTARIO_HST_RATE);
}

export function calculateQuickMethodRemittanceBefore107(eligibleGrossRevenue) {
  // CRA Ontario quick-method remittance rate for service businesses.
  return toNumber(eligibleGrossRevenue) * QUICK_METHOD_RATE;
}

export function calculateLine107Credit({
  ytdEligibleRevenueBeforePeriod,
  currentPeriodEligibleRevenue,
  threshold = LINE_107_THRESHOLD,
}) {
  const ytdBefore = Math.max(0, toNumber(ytdEligibleRevenueBeforePeriod));
  const currentRevenue = Math.max(0, toNumber(currentPeriodEligibleRevenue));
  const thresholdRemainingAtStart = Math.max(toNumber(threshold) - ytdBefore, 0);
  const revenueEligibleForCredit = Math.min(
    currentRevenue,
    thresholdRemainingAtStart
  );
  const line107Credit = revenueEligibleForCredit * 0.01;
  const thresholdRemainingAtEnd = Math.max(
    thresholdRemainingAtStart - revenueEligibleForCredit,
    0
  );

  return {
    thresholdRemainingAtStart,
    revenueEligibleForCredit,
    line107Credit,
    thresholdRemainingAtEnd,
  };
}

export function calculateIncomeTaxDeductibleExpenses({
  regularExpenses,
  homeOfficeExpenses,
  homeOfficeRate = HOME_OFFICE_BUSINESS_USE_RATE,
}) {
  const deductibleRegularExpenses = sumBy(regularExpenses, (expense) => {
    // Deductible regular expense includes base + unrecoverable tax portion.
    return toNumber(expense.amount) + toNumber(expense.hst);
  });

  const deductibleHomeOfficeExpenses = sumBy(homeOfficeExpenses, (expense) => {
    // Home-office deductible amount uses business-use factor on total cost burden.
    return (toNumber(expense.amount) + toNumber(expense.hst)) * toNumber(homeOfficeRate);
  });

  return {
    deductibleRegularExpenses,
    deductibleHomeOfficeExpenses,
    totalDeductibleExpensesForIncomeTax:
      deductibleRegularExpenses + deductibleHomeOfficeExpenses,
  };
}

export function calculateEstimatedIncomeTaxBeforeExpenses({
  incomeTaxIncludedRevenue,
  netHstToRemit,
  estimatedIncomeTaxRate = DEFAULT_ESTIMATED_INCOME_TAX_RATE,
}) {
  const taxableBeforeExpenses = toNumber(incomeTaxIncludedRevenue) - toNumber(netHstToRemit);
  return Math.max(taxableBeforeExpenses, 0) * toNumber(estimatedIncomeTaxRate);
}

function buildMonthBuckets({
  treatments = [],
  additionalIncome = [],
  additionalTreatments = [],
  expenses = [],
}) {
  const buckets = {};
  for (let month = 1; month <= 12; month += 1) {
    buckets[month] = {
      month,
      treatments: [],
      additionalIncome: [],
      additionalTreatments: [],
      expenses: [],
      regularExpenses: [],
      homeOfficeExpenses: [],
      totalTreatmentHours: 0,
    };
  }

  treatments.forEach((entry) => {
    const month = normalizeMonth(entry.month);
    if (!month) return;
    buckets[month].treatments.push(entry);
    buckets[month].totalTreatmentHours += toNumber(entry.duration) / 60;
  });

  additionalIncome.forEach((entry) => {
    const month = normalizeMonth(entry.month);
    if (!month) return;
    buckets[month].additionalIncome.push(withAdditionalIncomeFlags(entry));
  });

  additionalTreatments.forEach((entry) => {
    const month = normalizeMonth(entry.month);
    if (!month) return;
    buckets[month].additionalTreatments.push(entry);
    buckets[month].totalTreatmentHours += toNumber(entry.duration) / 60;
  });

  expenses.forEach((entry) => {
    const month = normalizeMonth(entry.month);
    if (!month) return;
    buckets[month].expenses.push(entry);
    if (entry.category === "Home Office Expenses") {
      buckets[month].homeOfficeExpenses.push(entry);
    } else {
      buckets[month].regularExpenses.push(entry);
    }
  });

  return buckets;
}

export function calculateMonthlyFinance({
  treatments = [],
  additionalIncome = [],
  additionalTreatments = [],
  expenses = [],
  estimatedIncomeTaxRate = DEFAULT_ESTIMATED_INCOME_TAX_RATE,
  line107Threshold = LINE_107_THRESHOLD,
  gstFiscalYearStartMonth = GST_FISCAL_YEAR_START_MONTH,
  priorFiscalYearEligibleRevenueCarryover = 0,
  includeAdditionalIncomeInHstByDefault =
    DEFAULT_ADDITIONAL_INCOME_FLAGS.includeInHstQuickMethod,
  includeAdditionalIncomeInIncomeTaxByDefault =
    DEFAULT_ADDITIONAL_INCOME_FLAGS.includeInIncomeTax,
}) {
  const buckets = buildMonthBuckets({
    treatments,
    additionalIncome,
    additionalTreatments,
    expenses,
  });

  const results = {};
  let ytdEligibleRevenueForCurrentFiscalYear = Math.max(
    toNumber(priorFiscalYearEligibleRevenueCarryover),
    0
  );

  // NOTE:
  // If fiscal year start month is not January and prior-fiscal-year months are not supplied,
  // months before the fiscal start in this calendar view may need a carryover injection from
  // previous-year data for exact line 107 tracking.
  // TODO: inject prior-year fiscal YTD from backend when non-January fiscal year is used.

  for (let month = 1; month <= 12; month += 1) {
    if (month === gstFiscalYearStartMonth) {
      ytdEligibleRevenueForCurrentFiscalYear = 0;
    }

    const bucket = buckets[month];

    const grossTreatmentRevenueInclHst = sumBy(bucket.treatments, (entry) => entry.price);

    const incomeAccumulator = bucket.additionalIncome.reduce(
      (acc, entry) => {
        const amount = toNumber(entry.amount);
        const source = String(entry?.source || "").trim().toLowerCase();
        const includeInIncomeTax =
          typeof entry.includeInIncomeTax === "boolean"
            ? entry.includeInIncomeTax
            : includeAdditionalIncomeInIncomeTaxByDefault;
        const includeInHstQuickMethod =
          typeof entry.includeInHstQuickMethod === "boolean"
            ? entry.includeInHstQuickMethod
            : includeAdditionalIncomeInHstByDefault;

        acc.grossAdditionalIncomeCollected += amount;
        if (includeInIncomeTax) acc.grossAdditionalIncomeForTax += amount;
        if (includeInHstQuickMethod) acc.grossAdditionalIncomeForHst += amount;
        if (
          source === "under-the-table" ||
          source === "under the table" ||
          source === "under‑the‑table"
        ) {
          acc.underTheTableAdditionalIncomeRevenue += amount;
        }
        return acc;
      },
      {
        grossAdditionalIncomeCollected: 0,
        grossAdditionalIncomeForTax: 0,
        grossAdditionalIncomeForHst: 0,
        underTheTableAdditionalIncomeRevenue: 0,
      }
    );

    const excludedAdditionalTreatmentsRevenue = sumBy(
      bucket.additionalTreatments,
      (entry) => entry.price
    );

    const totalGrossRevenueCollectedInclHst =
      grossTreatmentRevenueInclHst +
      incomeAccumulator.grossAdditionalIncomeCollected +
      excludedAdditionalTreatmentsRevenue;

    const grossEligibleQuickMethodRevenue =
      grossTreatmentRevenueInclHst + incomeAccumulator.grossAdditionalIncomeForHst;
    const incomeTaxIncludedRevenue =
      grossTreatmentRevenueInclHst + incomeAccumulator.grossAdditionalIncomeForTax;

    const hstCollectedDisplay = calculateHstCollectedFromGross(
      grossEligibleQuickMethodRevenue
    );
    const quickMethodRemittanceBefore107 =
      calculateQuickMethodRemittanceBefore107(grossEligibleQuickMethodRevenue);

    const line107 = calculateLine107Credit({
      ytdEligibleRevenueBeforePeriod: ytdEligibleRevenueForCurrentFiscalYear,
      currentPeriodEligibleRevenue: grossEligibleQuickMethodRevenue,
      threshold: line107Threshold,
    });
    ytdEligibleRevenueForCurrentFiscalYear += grossEligibleQuickMethodRevenue;

    const netHstToRemit = quickMethodRemittanceBefore107 - line107.line107Credit;
    const expenseDeduction = calculateIncomeTaxDeductibleExpenses({
      regularExpenses: bucket.regularExpenses,
      homeOfficeExpenses: bucket.homeOfficeExpenses,
      homeOfficeRate: HOME_OFFICE_BUSINESS_USE_RATE,
    });

    const estimatedIncomeTaxBeforeExpenses = calculateEstimatedIncomeTaxBeforeExpenses({
      incomeTaxIncludedRevenue,
      netHstToRemit,
      estimatedIncomeTaxRate,
    });

    // Planning-only monthly estimate:
    // tax is estimated after HST remittance, before any expense deductions.
    // Include under-the-table income streams in this planning cash view.
    const netIncomeBeforeExpensesIncludingUnderTable =
      (incomeTaxIncludedRevenue - netHstToRemit - estimatedIncomeTaxBeforeExpenses) +
      excludedAdditionalTreatmentsRevenue +
      incomeAccumulator.underTheTableAdditionalIncomeRevenue;

    // Formal business-profit estimate:
    // tax base is reduced by deductible expenses.
    const taxableBusinessProfitBeforeTax =
      incomeTaxIncludedRevenue -
      netHstToRemit -
      expenseDeduction.totalDeductibleExpensesForIncomeTax;

    const estimatedIncomeTax =
      Math.max(taxableBusinessProfitBeforeTax, 0) * toNumber(estimatedIncomeTaxRate);
    const postTaxBusinessCash = taxableBusinessProfitBeforeTax - estimatedIncomeTax;
    const finalCashAfterEverything =
      postTaxBusinessCash + excludedAdditionalTreatmentsRevenue;

    results[month] = {
      month,
      treatments: bucket.treatments,
      additionalIncome: bucket.additionalIncome,
      additionalTreatments: bucket.additionalTreatments,
      expenses: bucket.expenses,
      regularExpenses: bucket.regularExpenses,
      homeOfficeExpenses: bucket.homeOfficeExpenses,
      totalTreatmentHours: bucket.totalTreatmentHours,
      grossTreatmentRevenueInclHst,
      grossAdditionalIncomeCollected: incomeAccumulator.grossAdditionalIncomeCollected,
      grossAdditionalIncomeForTax: incomeAccumulator.grossAdditionalIncomeForTax,
      grossAdditionalIncomeForHst: incomeAccumulator.grossAdditionalIncomeForHst,
      underTheTableAdditionalIncomeRevenue:
        incomeAccumulator.underTheTableAdditionalIncomeRevenue,
      excludedAdditionalTreatmentsRevenue,
      totalGrossRevenueCollectedInclHst,
      incomeTaxIncludedRevenue,
      grossEligibleQuickMethodRevenue,
      hstCollectedDisplay,
      quickMethodRemittanceBefore107,
      line107Credit: line107.line107Credit,
      line107RevenueEligibleForCredit: line107.revenueEligibleForCredit,
      netHstToRemit,
      deductibleRegularExpenses: expenseDeduction.deductibleRegularExpenses,
      deductibleHomeOfficeExpenses: expenseDeduction.deductibleHomeOfficeExpenses,
      totalDeductibleExpensesForIncomeTax:
        expenseDeduction.totalDeductibleExpensesForIncomeTax,
      estimatedIncomeTaxBeforeExpenses,
      netIncomeBeforeExpensesIncludingUnderTable,
      taxableBusinessProfitBeforeTax,
      estimatedIncomeTax,
      postTaxBusinessCash,
      finalCashAfterEverything,
      thresholdUsedYtd: line107Threshold - line107.thresholdRemainingAtEnd,
      thresholdRemainingYtd: line107.thresholdRemainingAtEnd,
      line107Threshold,
      gstFiscalYearStartMonth,
      treatmentAmountsIncludeHst: TREATMENT_AMOUNTS_INCLUDE_HST,
    };
  }

  return results;
}

function aggregatePeriods(periodRows) {
  return periodRows.reduce(
    (acc, row) => {
      acc.totalTreatmentHours += toNumber(row.totalTreatmentHours);
      acc.grossTreatmentRevenueInclHst += toNumber(row.grossTreatmentRevenueInclHst);
      acc.grossAdditionalIncomeCollected += toNumber(row.grossAdditionalIncomeCollected);
      acc.grossAdditionalIncomeForTax += toNumber(row.grossAdditionalIncomeForTax);
      acc.grossAdditionalIncomeForHst += toNumber(row.grossAdditionalIncomeForHst);
      acc.excludedAdditionalTreatmentsRevenue += toNumber(
        row.excludedAdditionalTreatmentsRevenue
      );
      acc.totalGrossRevenueCollectedInclHst += toNumber(
        row.totalGrossRevenueCollectedInclHst
      );
      acc.incomeTaxIncludedRevenue += toNumber(row.incomeTaxIncludedRevenue);
      acc.grossEligibleQuickMethodRevenue += toNumber(
        row.grossEligibleQuickMethodRevenue
      );
      acc.hstCollectedDisplay += toNumber(row.hstCollectedDisplay);
      acc.quickMethodRemittanceBefore107 += toNumber(
        row.quickMethodRemittanceBefore107
      );
      acc.line107Credit += toNumber(row.line107Credit);
      acc.netHstToRemit += toNumber(row.netHstToRemit);
      acc.deductibleRegularExpenses += toNumber(row.deductibleRegularExpenses);
      acc.deductibleHomeOfficeExpenses += toNumber(row.deductibleHomeOfficeExpenses);
      acc.totalDeductibleExpensesForIncomeTax += toNumber(
        row.totalDeductibleExpensesForIncomeTax
      );
      acc.estimatedIncomeTaxBeforeExpenses += toNumber(
        row.estimatedIncomeTaxBeforeExpenses
      );
      acc.netIncomeBeforeExpensesIncludingUnderTable += toNumber(
        row.netIncomeBeforeExpensesIncludingUnderTable
      );
      acc.taxableBusinessProfitBeforeTax += toNumber(
        row.taxableBusinessProfitBeforeTax
      );
      acc.estimatedIncomeTax += toNumber(row.estimatedIncomeTax);
      acc.postTaxBusinessCash += toNumber(row.postTaxBusinessCash);
      acc.finalCashAfterEverything += toNumber(row.finalCashAfterEverything);
      return acc;
    },
    {
      totalTreatmentHours: 0,
      grossTreatmentRevenueInclHst: 0,
      grossAdditionalIncomeCollected: 0,
      grossAdditionalIncomeForTax: 0,
      grossAdditionalIncomeForHst: 0,
      excludedAdditionalTreatmentsRevenue: 0,
      totalGrossRevenueCollectedInclHst: 0,
      incomeTaxIncludedRevenue: 0,
      grossEligibleQuickMethodRevenue: 0,
      hstCollectedDisplay: 0,
      quickMethodRemittanceBefore107: 0,
      line107Credit: 0,
      netHstToRemit: 0,
      deductibleRegularExpenses: 0,
      deductibleHomeOfficeExpenses: 0,
      totalDeductibleExpensesForIncomeTax: 0,
      estimatedIncomeTaxBeforeExpenses: 0,
      netIncomeBeforeExpensesIncludingUnderTable: 0,
      taxableBusinessProfitBeforeTax: 0,
      estimatedIncomeTax: 0,
      postTaxBusinessCash: 0,
      finalCashAfterEverything: 0,
    }
  );
}

export function calculateQuarterlyFinance(monthlyResults) {
  const quarterDefinitions = [
    { quarter: 1, startMonth: 1, endMonth: 3 },
    { quarter: 2, startMonth: 4, endMonth: 6 },
    { quarter: 3, startMonth: 7, endMonth: 9 },
    { quarter: 4, startMonth: 10, endMonth: 12 },
  ];

  return quarterDefinitions.map(({ quarter, startMonth, endMonth }) => {
    const months = [];
    for (let month = startMonth; month <= endMonth; month += 1) {
      months.push(monthlyResults[month]);
    }
    const totals = aggregatePeriods(months);
    const endMonthData = monthlyResults[endMonth];
    const grossEligibleQuickMethodRevenue = toNumber(
      totals.grossEligibleQuickMethodRevenue
    );
    const quickMethodRemittanceBefore107 = toNumber(
      totals.quickMethodRemittanceBefore107
    );
    const line107Credit = toNumber(totals.line107Credit);
    const netHstToRemit = quickMethodRemittanceBefore107 - line107Credit;

    return {
      quarter,
      startMonth,
      endMonth,
      ...totals,
      grossEligibleQuickMethodRevenue,
      quickMethodRemittanceBefore107,
      line107Credit,
      netHstToRemit,
      // CRA quick-method filing fields for quarterly recap:
      // line 101 = eligible taxable supplies incl. HST
      line101Amount: grossEligibleQuickMethodRevenue,
      // line 103 = quick-method amount before line 107 credit
      line103Amount: quickMethodRemittanceBefore107,
      // line 107 = quick-method 1% credit
      line107Amount: line107Credit,
      thresholdUsedYtdAtQuarterEnd: toNumber(endMonthData?.thresholdUsedYtd),
      thresholdRemainingYtdAtQuarterEnd: toNumber(
        endMonthData?.thresholdRemainingYtd
      ),
      line107Threshold: toNumber(endMonthData?.line107Threshold || LINE_107_THRESHOLD),
    };
  });
}

export function calculateYearlyFinance(monthlyResults) {
  const monthlyRows = Array.from({ length: 12 }, (_, i) => monthlyResults[i + 1]);
  const totals = aggregatePeriods(monthlyRows);
  const lastMonth = monthlyResults[12];

  return {
    totalGrossRevenueCollectedInclHst: totals.totalGrossRevenueCollectedInclHst,
    totalIncomeTaxIncludedRevenue: totals.incomeTaxIncludedRevenue,
    totalEligibleQuickMethodRevenue: totals.grossEligibleQuickMethodRevenue,
    totalExcludedAdditionalTreatmentsRevenue:
      totals.excludedAdditionalTreatmentsRevenue,
    yearlyHstCollectedDisplay: totals.hstCollectedDisplay,
    yearlyQuickMethodRemittanceBefore107: totals.quickMethodRemittanceBefore107,
    yearlyLine107Credit: totals.line107Credit,
    yearlyNetHstToRemit: totals.netHstToRemit,
    yearlyEstimatedIncomeTaxBeforeExpenses: totals.estimatedIncomeTaxBeforeExpenses,
    yearlyNetIncomeBeforeExpensesIncludingUnderTable:
      totals.netIncomeBeforeExpensesIncludingUnderTable,
    totalDeductibleExpensesForIncomeTax:
      totals.totalDeductibleExpensesForIncomeTax,
    yearlyTaxableBusinessProfitBeforeTax: totals.taxableBusinessProfitBeforeTax,
    yearlyEstimatedIncomeTax: totals.estimatedIncomeTax,
    yearlyPostTaxBusinessCash: totals.postTaxBusinessCash,
    yearlyFinalCashAfterEverything: totals.finalCashAfterEverything,
    thresholdUsedYtd: toNumber(lastMonth?.thresholdUsedYtd),
    thresholdRemainingYtd: toNumber(lastMonth?.thresholdRemainingYtd),
    line107Threshold: toNumber(lastMonth?.line107Threshold || LINE_107_THRESHOLD),
  };
}

export const financeCalculationConfig = {
  QUICK_METHOD_RATE,
  ONTARIO_HST_RATE,
  LINE_107_THRESHOLD,
  HOME_OFFICE_BUSINESS_USE_RATE,
  DEFAULT_ESTIMATED_INCOME_TAX_RATE,
  TREATMENT_AMOUNTS_INCLUDE_HST,
  GST_FISCAL_YEAR_START_MONTH,
  DEFAULT_ADDITIONAL_INCOME_FLAGS,
};

// Validation examples (developer reference):
//
// Example A:
// eligible = 11,300
// hstCollectedDisplay = 11,300 * 13/113 = 1,300.00
// quickMethodRemittanceBefore107 = 11,300 * 0.088 = 994.40
// line107Credit (if fully eligible) = 11,300 * 0.01 = 113.00
// netHstToRemit = 994.40 - 113.00 = 881.40
//
// Example B:
// ytd before = 25,000, current = 10,000
// only 5,000 eligible for line107
// line107Credit = 50.00
// thresholdRemainingYtd = 0.00
//
// Example C:
// gross taxable = 8,475
// additional income tax-only = 2,000
// excluded additional treatments = 600
// deductible expenses = 1,500
// quick before 107 = 745.80
// line107 = 84.75
// netHstToRemit = 661.05
// taxableBusinessProfitBeforeTax = 8,475 + 2,000 - 661.05 - 1,500
// finalCashAfterEverything = postTaxBusinessCash + 600
