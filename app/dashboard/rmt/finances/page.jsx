import {
  getTreatmentsRevenueByMonth,
  getAvailableYears,
  getAdditionalIncomeByMonth,
  getAdditionalTreatmentsRevenueByMonth,
  getExpensesByMonth,
  getActualTaxPaidForYear,
} from "@/app/_actions";
import { YearSelector } from "./year-selector";
import { MonthlyBreakdown } from "./monthly-breakdown";
import { LinkedFinanceForms } from "./linked-finance-forms";
import { ExpenseBreakdown } from "./expense-breakdown";
import { ActualTaxPaidForm } from "./actual-tax-paid-form";
import {
  calculateMonthlyFinance,
  calculateQuarterlyFinance,
  calculateYearlyFinance,
  financeCalculationConfig,
} from "./finance-calculations";

const formatCurrency = (value) =>
  `$${(Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default async function FinancesPage({ searchParams }) {
  const params = await searchParams;
  const selectedYear = params.year
    ? Number.parseInt(params.year, 10)
    : new Date().getFullYear();

  const availableYearsResult = await getAvailableYears();
  const treatmentsRevenueResult = await getTreatmentsRevenueByMonth(selectedYear);
  const additionalIncomeResult = await getAdditionalIncomeByMonth(selectedYear);
  const additionalTreatmentsResult =
    await getAdditionalTreatmentsRevenueByMonth(selectedYear);
  const expensesResult = await getExpensesByMonth(selectedYear);
  const actualTaxPaidResult = await getActualTaxPaidForYear(selectedYear);

  const treatments = treatmentsRevenueResult.success ? treatmentsRevenueResult.data : [];
  const additionalIncomeRaw = additionalIncomeResult.success
    ? additionalIncomeResult.data
    : [];
  const additionalTreatments = additionalTreatmentsResult.success
    ? additionalTreatmentsResult.data
    : [];
  const expenses = expensesResult.success ? expensesResult.data : [];

  const monthlyFinance = calculateMonthlyFinance({
    treatments,
    additionalIncome: additionalIncomeRaw,
    additionalTreatments,
    expenses,
    estimatedIncomeTaxRate: 0.2,
    line107Threshold: financeCalculationConfig.LINE_107_THRESHOLD,
    gstFiscalYearStartMonth: financeCalculationConfig.GST_FISCAL_YEAR_START_MONTH,
  });

  const quarterlyFinance = calculateQuarterlyFinance(monthlyFinance);
  const yearlyFinance = calculateYearlyFinance(monthlyFinance);

  const warningMessages = [];
  if (!treatmentsRevenueResult.success) {
    warningMessages.push(
      treatmentsRevenueResult.error || "Failed to load treatment revenue data."
    );
  }
  if (!additionalIncomeResult.success) {
    warningMessages.push(
      additionalIncomeResult.error || "Failed to load additional income data."
    );
  }
  if (!additionalTreatmentsResult.success) {
    warningMessages.push(
      additionalTreatmentsResult.error ||
        "Failed to load additional treatments data."
    );
  }
  if (!expensesResult.success) {
    warningMessages.push(expensesResult.error || "Failed to load expenses data.");
  }

  const additionalIncomeByMonth = {};
  const additionalTreatmentsByMonth = {};
  const expensesByMonth = {};

  for (let month = 1; month <= 12; month += 1) {
    additionalIncomeByMonth[month] = {
      incomes: monthlyFinance[month].additionalIncome || [],
      totalAmount: monthlyFinance[month].grossAdditionalIncomeCollected || 0,
    };
    additionalTreatmentsByMonth[month] = {
      treatments: monthlyFinance[month].additionalTreatments || [],
      totalAmount: monthlyFinance[month].excludedAdditionalTreatmentsRevenue || 0,
    };
    expensesByMonth[month] = {
      expenses: monthlyFinance[month].expenses || [],
      totalAmount: monthlyFinance[month].totalDeductibleExpensesForIncomeTax || 0,
    };
  }

  const quarterSummaryByEndMonth = {};
  quarterlyFinance.forEach((quarter) => {
    quarterSummaryByEndMonth[quarter.endMonth] = quarter;
  });

  const actualTaxPaidForYear =
    actualTaxPaidResult.success &&
    actualTaxPaidResult.data?.actualTaxPaid !== null &&
    actualTaxPaidResult.data?.actualTaxPaid !== undefined
      ? Number(actualTaxPaidResult.data.actualTaxPaid)
      : null;
  const taxUsedForYear =
    actualTaxPaidForYear !== null
      ? actualTaxPaidForYear
      : yearlyFinance.yearlyEstimatedIncomeTax;
  const yearlyPostTaxUsingSelectedTax =
    yearlyFinance.yearlyTaxableBusinessProfitBeforeTax - taxUsedForYear;
  const yearlyFinalCashUsingSelectedTax =
    yearlyPostTaxUsingSelectedTax +
    yearlyFinance.totalExcludedAdditionalTreatmentsRevenue;
  const yearlyFinalCashUsingEstimatedTax =
    yearlyFinance.yearlyPostTaxBusinessCash +
    yearlyFinance.totalExcludedAdditionalTreatmentsRevenue;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Finances</h1>
        </div>
        <YearSelector
          availableYears={availableYearsResult.data}
          selectedYear={selectedYear}
        />
      </div>

      <LinkedFinanceForms />

      {warningMessages.length > 0 && (
        <div className="space-y-2">
          {warningMessages.map((warningMessage, index) => (
            <div
              key={`${warningMessage}-${index}`}
              className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm"
            >
              {warningMessage}
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#f4f7f2] rounded-xl border border-[#b7c7b0]">
        <div className="p-6 border-b border-[#b7c7b0]">
          <h2 className="text-2xl font-semibold">Treatment Revenue - {selectedYear}</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <div key={month} className="space-y-3">
                  <MonthlyBreakdown
                    month={month}
                    data={monthlyFinance[month]}
                    additionalIncome={additionalIncomeByMonth[month]}
                    additionalTreatments={additionalTreatmentsByMonth[month]}
                    expenses={expensesByMonth[month]}
                  />

                  {month % 3 === 0 && quarterSummaryByEndMonth[month] && (
                    <div className="rounded-lg border border-[#b7c7b0] bg-[#f4f7f2] p-4 space-y-3">
                      <h4 className="font-semibold text-[#1f2a1f]">
                        Quarter {quarterSummaryByEndMonth[month].quarter} HST Filing Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] p-3">
                          <p className="text-sm text-gray-900">
                            Put{" "}
                            <span className="font-semibold">
                              {formatCurrency(quarterSummaryByEndMonth[month].line101Amount)}
                            </span>{" "}
                            on line 101
                          </p>
                        </div>
                        <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] p-3">
                          <p className="text-sm text-gray-900">
                            Put{" "}
                            <span className="font-semibold">
                              {formatCurrency(quarterSummaryByEndMonth[month].line103Amount)}
                            </span>{" "}
                            on line 103
                          </p>
                        </div>
                        <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] p-3">
                          <p className="text-sm text-gray-900">
                            Put{" "}
                            <span className="font-semibold">
                              {formatCurrency(quarterSummaryByEndMonth[month].line107Amount)}
                            </span>{" "}
                            on line 107
                          </p>
                        </div>
                      </div>
                      <details className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] p-3">
                        <summary className="cursor-pointer list-none font-medium text-[#1f2a1f]">
                          Show details
                        </summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Eligible quick-method revenue
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(
                                quarterSummaryByEndMonth[month].grossEligibleQuickMethodRevenue
                              )}
                            </p>
                          </div>
                          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Net HST to remit after line 107
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(quarterSummaryByEndMonth[month].netHstToRemit)}
                            </p>
                          </div>
                          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Threshold used YTD
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(
                                quarterSummaryByEndMonth[month].thresholdUsedYtdAtQuarterEnd
                              )}
                            </p>
                          </div>
                          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                              Threshold remaining YTD
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(
                                quarterSummaryByEndMonth[month].thresholdRemainingYtdAtQuarterEnd
                              )}
                            </p>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-lg border border-[#b7c7b0] bg-[#f4f7f2] p-6 mt-6">
                <h3 className="text-xl font-bold mb-4">Year Total ({selectedYear})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Gross Revenue Collected (incl. HST)
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.totalGrossRevenueCollectedInclHst)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Income-Tax-Included Revenue
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.totalIncomeTaxIncludedRevenue)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Eligible Quick-Method Revenue
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.totalEligibleQuickMethodRevenue)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Excluded Additional Treatments
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(
                        yearlyFinance.totalExcludedAdditionalTreatmentsRevenue
                      )}
                    </div>
                  </div>

                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      HST Collected (display only)
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.yearlyHstCollectedDisplay)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Quick Method Remittance Before Line 107
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(
                        yearlyFinance.yearlyQuickMethodRemittanceBefore107
                      )}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">Line 107 Credit</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.yearlyLine107Credit)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Net HST to Remit / Set Aside
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.yearlyNetHstToRemit)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Net Income Before Expenses (incl. under-the-table)
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(
                        yearlyFinance.yearlyNetIncomeBeforeExpensesIncludingUnderTable
                      )}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Estimated Income Tax Before Expenses
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.yearlyEstimatedIncomeTaxBeforeExpenses)}
                    </div>
                  </div>

                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Deductible Expenses for Income Tax
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(
                        yearlyFinance.totalDeductibleExpensesForIncomeTax
                      )}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Taxable Business Profit Before Tax
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(
                        yearlyFinance.yearlyTaxableBusinessProfitBeforeTax
                      )}
                    </div>
                  </div>
                  {actualTaxPaidForYear !== null ? (
                    <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                      <div className="text-sm text-gray-600 mb-1">
                        Actual Tax Paid (override for yearly summary only)
                      </div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(actualTaxPaidForYear)}
                      </div>
                    </div>
                  ) : null}
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Estimated Income Tax (20%)
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinance.yearlyEstimatedIncomeTax)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Year-End Final Cash Using Estimated Tax
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearlyFinalCashUsingEstimatedTax)}
                    </div>
                  </div>
                  <div className="bg-[#f4f7f2] p-4 rounded-md border border-[#b7c7b0]">
                    <div className="text-sm text-gray-600 mb-1">
                      Year-End Final Cash Using Actual Tax
                    </div>
                    <div className="text-lg font-semibold">
                      {actualTaxPaidForYear !== null
                        ? formatCurrency(yearlyFinalCashUsingSelectedTax)
                        : "N/A"}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <ActualTaxPaidForm
                    year={selectedYear}
                    initialActualTaxPaid={actualTaxPaidForYear}
                  />
                </div>
              </div>
          </div>
        </div>
      </div>

      {expensesResult.success && expensesResult.data.length > 0 && (
        <ExpenseBreakdown
          expensesData={expensesResult.data}
          deductibleSummary={{
            deductibleRegularExpenses: sumDeductibleRegular(monthlyFinance),
            deductibleHomeOfficeExpenses: sumDeductibleHomeOffice(monthlyFinance),
            totalDeductibleExpensesForIncomeTax:
              yearlyFinance.totalDeductibleExpensesForIncomeTax,
          }}
        />
      )}
    </div>
  );
}

function sumDeductibleRegular(monthlyFinance) {
  return Array.from({ length: 12 }, (_, index) => index + 1).reduce(
    (sum, month) =>
      sum + Number(monthlyFinance?.[month]?.deductibleRegularExpenses || 0),
    0
  );
}

function sumDeductibleHomeOffice(monthlyFinance) {
  return Array.from({ length: 12 }, (_, index) => index + 1).reduce(
    (sum, month) =>
      sum + Number(monthlyFinance?.[month]?.deductibleHomeOfficeExpenses || 0),
    0
  );
}

