import {
  getTreatmentsRevenueByMonth,
  getAvailableYears,
  getAdditionalIncomeByMonth,
  getExpensesByMonth,
} from "@/app/_actions";
import { YearSelector } from "./year-selector";
import { MonthlyBreakdown } from "./monthly-breakdown";
import { AdditionalIncomeForm } from "./additional-income-form";
import { ExpensesForm } from "./expenses-form";
import { ExpenseBreakdown } from "./expense-breakdown";

export default async function FinancesPage({ searchParams }) {
  const params = await searchParams;
  const availableYearsResult = await getAvailableYears();
  const selectedYear = params.year
    ? Number.parseInt(params.year)
    : new Date().getFullYear();

  const treatmentsRevenueResult = await getTreatmentsRevenueByMonth(
    selectedYear
  );
  const additionalIncomeResult = await getAdditionalIncomeByMonth(selectedYear);
  const expensesResult = await getExpensesByMonth(selectedYear);

  const treatmentsByMonth = {};
  const additionalIncomeByMonth = {};
  const expensesByMonth = {};
  const yearTotals = {
    totalRevenue: 0,
    hstCollected: 0,
    hstPaid: 0,
    totalExpenses: 0,
    incomeAfterHST: 0,
    incomeAfterExpenses: 0,
    estimatedTax: 0,
    netIncome: 0,
  };

  if (treatmentsRevenueResult.success) {
    treatmentsRevenueResult.data.forEach((treatment) => {
      const month = Number.parseInt(treatment.month);
      const price = Number(treatment.price) || 0;

      if (!treatmentsByMonth[month]) {
        treatmentsByMonth[month] = {
          treatments: [],
          totalRevenue: 0,
          hstCollected: 0,
          hstPaid: 0,
          hstDifference: 0,
          incomeAfterHST: 0,
          totalExpenses: 0,
          incomeAfterExpenses: 0,
          estimatedTax: 0,
          netIncome: 0,
        };
      }

      treatmentsByMonth[month].treatments.push(treatment);
      treatmentsByMonth[month].totalRevenue += price;
    });
  }

  if (additionalIncomeResult.success) {
    additionalIncomeResult.data.forEach((income) => {
      const month = Number.parseInt(income.month);
      const amount = Number(income.amount) || 0;

      if (!additionalIncomeByMonth[month]) {
        additionalIncomeByMonth[month] = {
          incomes: [],
          totalAmount: 0,
        };
      }

      additionalIncomeByMonth[month].incomes.push(income);
      additionalIncomeByMonth[month].totalAmount += amount;
    });
  }

  if (expensesResult.success) {
    expensesResult.data.forEach((expense) => {
      const month = Number.parseInt(expense.month);
      const amount = Number(expense.amount) || 0;
      const hst = Number(expense.hst) || 0;
      const isHomeOffice = expense.category === "Home Office Expenses";

      // For home office expenses: 37% of amount + HST (which is 13% of 37% for non-rent)
      // For regular expenses: full amount + HST
      const deductibleAmount = isHomeOffice
        ? amount * 0.37 + hst
        : amount + hst;

      if (!expensesByMonth[month]) {
        expensesByMonth[month] = {
          expenses: [],
          totalAmount: 0,
        };
      }

      expensesByMonth[month].expenses.push(expense);
      expensesByMonth[month].totalAmount += deductibleAmount;
    });
  }

  Object.keys(treatmentsByMonth).forEach((month) => {
    const monthNum = Number(month);
    const data = treatmentsByMonth[month];

    const treatmentTotal = data.totalRevenue;
    const additionalAmount =
      additionalIncomeByMonth[monthNum]?.totalAmount || 0;
    const expensesAmount = expensesByMonth[monthNum]?.totalAmount || 0;

    // 1. Total Revenue
    data.totalRevenue = treatmentTotal + additionalAmount;

    // 2. HST Calculations
    data.hstCollected = data.totalRevenue * 0.13;
    data.hstPaid = data.totalRevenue * 0.088;
    data.hstDifference = data.hstCollected - data.hstPaid;

    // 3. Income After HST (Total Revenue - HST Paid)
    data.incomeAfterHST = data.totalRevenue - data.hstPaid;

    // 4. Total Expenses
    data.totalExpenses = expensesAmount;

    // 5. Income After Expenses (Income After HST - Total Expenses)
    data.incomeAfterExpenses = data.incomeAfterHST - expensesAmount;

    // 6. Estimated Tax (20% of Income After Expenses, or 0 if negative)
    data.estimatedTax =
      data.incomeAfterExpenses > 0 ? data.incomeAfterExpenses * 0.2 : 0;

    // 7. Net Income (Income After HST - Estimated Tax)
    data.netIncome = data.incomeAfterHST - data.estimatedTax;

    yearTotals.totalRevenue += data.totalRevenue;
    yearTotals.hstCollected += data.hstCollected;
    yearTotals.hstPaid += data.hstPaid;
    yearTotals.totalExpenses += expensesAmount;
    yearTotals.incomeAfterHST += data.incomeAfterHST;
    yearTotals.incomeAfterExpenses += data.incomeAfterExpenses;
  });

  Object.keys(additionalIncomeByMonth).forEach((month) => {
    const monthNum = Number(month);

    if (treatmentsByMonth[monthNum]) {
      return;
    }

    const amount = additionalIncomeByMonth[monthNum].totalAmount;
    const expensesAmount = expensesByMonth[monthNum]?.totalAmount || 0;

    const totalRevenue = amount;
    const hstCollected = totalRevenue * 0.13;
    const hstPaid = totalRevenue * 0.088;
    const incomeAfterHST = totalRevenue - hstPaid;
    const incomeAfterExpenses = incomeAfterHST - expensesAmount;

    const estimatedTax =
      incomeAfterExpenses > 0 ? incomeAfterExpenses * 0.2 : 0;
    const netIncome = incomeAfterHST - estimatedTax;

    treatmentsByMonth[monthNum] = {
      treatments: [],
      totalRevenue,
      hstCollected,
      hstPaid,
      hstDifference: hstCollected - hstPaid,
      incomeAfterHST,
      totalExpenses: expensesAmount,
      incomeAfterExpenses,
      estimatedTax,
      netIncome,
    };

    yearTotals.totalRevenue += totalRevenue;
    yearTotals.hstCollected += hstCollected;
    yearTotals.hstPaid += hstPaid;
    yearTotals.totalExpenses += expensesAmount;
    yearTotals.incomeAfterHST += incomeAfterHST;
    yearTotals.incomeAfterExpenses += incomeAfterExpenses;
  });

  Object.keys(expensesByMonth).forEach((month) => {
    const monthNum = Number(month);

    if (treatmentsByMonth[monthNum]) {
      return;
    }

    const expensesAmount = expensesByMonth[monthNum].totalAmount;

    const estimatedTax = 0; // No income, so no tax
    const netIncome = -expensesAmount; // Negative because only expenses

    treatmentsByMonth[monthNum] = {
      treatments: [],
      totalRevenue: 0,
      hstCollected: 0,
      hstPaid: 0,
      hstDifference: 0,
      incomeAfterHST: 0,
      totalExpenses: expensesAmount,
      incomeAfterExpenses: -expensesAmount,
      estimatedTax,
      netIncome,
    };

    yearTotals.totalExpenses += expensesAmount;
    yearTotals.incomeAfterExpenses -= expensesAmount;
  });

  for (let month = 1; month <= 12; month++) {
    if (!treatmentsByMonth[month]) {
      treatmentsByMonth[month] = {
        treatments: [],
        totalRevenue: 0,
        hstCollected: 0,
        hstPaid: 0,
        hstDifference: 0,
        incomeAfterHST: 0,
        totalExpenses: 0,
        incomeAfterExpenses: 0,
        estimatedTax: 0,
        netIncome: 0,
      };
    }
  }

  // Estimated Tax = 20% of (Yearly Income After HST - Yearly Total Expenses)
  // Net Income = Yearly Income After HST - Estimated Tax
  const yearlyIncomeAfterExpenses =
    yearTotals.incomeAfterHST - yearTotals.totalExpenses;
  yearTotals.estimatedTax =
    yearlyIncomeAfterExpenses > 0 ? yearlyIncomeAfterExpenses * 0.2 : 0;
  yearTotals.netIncome = yearTotals.incomeAfterHST - yearTotals.estimatedTax;

  const formatCurrency = (value) => {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Finances</h1>
          <p className="text-gray-600 text-sm">
            Treatment revenue and HST calculations for {selectedYear}
          </p>
        </div>
        <YearSelector
          availableYears={availableYearsResult.data}
          selectedYear={selectedYear}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdditionalIncomeForm />
        <ExpensesForm />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold">
            Treatment Revenue - {selectedYear}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Monthly breakdown with HST calculations
          </p>
        </div>
        <div className="p-6">
          {!treatmentsRevenueResult.success ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{treatmentsRevenueResult.error}</p>
            </div>
          ) : Object.keys(treatmentsByMonth).length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No treatment revenue found for {selectedYear}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.keys(treatmentsByMonth)
                .map(Number)
                .sort((a, b) => a - b)
                .map((month) => {
                  return (
                    <MonthlyBreakdown
                      key={month}
                      month={month}
                      data={treatmentsByMonth[month]}
                      additionalIncome={
                        additionalIncomeByMonth[month] || {
                          incomes: [],
                          totalAmount: 0,
                        }
                      }
                      expenses={
                        expensesByMonth[month] || {
                          expenses: [],
                          totalAmount: 0,
                        }
                      }
                    />
                  );
                })}

              <div className="rounded-md border-2 border-gray-300 bg-gray-50 p-6 mt-6">
                <h3 className="text-xl font-bold mb-4">
                  Year Total ({selectedYear})
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Revenue
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearTotals.totalRevenue)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Income After HST
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearTotals.incomeAfterHST)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Expenses
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearTotals.totalExpenses)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Estimated Tax (20%)
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearTotals.estimatedTax)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Net Income</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(yearTotals.netIncome)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {expensesResult.success && expensesResult.data.length > 0 && (
        <ExpenseBreakdown expensesData={expensesResult.data} />
      )}
    </div>
  );
}
