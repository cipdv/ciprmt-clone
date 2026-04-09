"use client";

import { useState } from "react";
import { deleteExpense, deleteAdditionalIncome } from "@/app/_actions";
import { useRouter } from "next/navigation";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthlyBreakdown({
  month,
  data,
  additionalIncome,
  additionalTreatments,
  expenses,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  const homeOfficeExpenses =
    expenses?.expenses.filter(
      (exp) => exp.category === "Home Office Expenses"
    ) || [];
  const otherExpenses =
    expenses?.expenses.filter(
      (exp) => exp.category !== "Home Office Expenses"
    ) || [];

  const formatCurrency = (value) => {
    return `$${(Number(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatHours = (hours) => {
    return `${Number(hours || 0).toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}h`;
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const result = await deleteExpense(expenseId);
    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to delete expense");
    }
  };

  const handleDeleteAdditionalIncome = async (incomeId) => {
    if (!confirm("Are you sure you want to delete this additional income?"))
      return;

    const result = await deleteAdditionalIncome(incomeId);
    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to delete additional income");
    }
  };

  return (
    <div className="rounded-md border border-[#b7c7b0] overflow-hidden">
      {/* Summary row - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors p-4 flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="font-semibold text-lg">{monthNames[month - 1]}</span>
        </div>
        <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 text-left">
          <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2">
            <p className="text-sm text-gray-800">
              You worked{" "}
              <span className="font-semibold">{formatHours(data.totalTreatmentHours)}</span>{" "}
              this month
            </p>
          </div>
          <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2">
            <p className="text-sm text-gray-800">
              You brought in{" "}
              <span className="font-semibold">
                {formatCurrency(data.totalGrossRevenueCollectedInclHst)}
              </span>{" "}
              total this month
            </p>
          </div>
          <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2">
            <p className="text-sm text-gray-800">
              Set aside{" "}
              <span className="font-semibold">{formatCurrency(data.netHstToRemit)}</span>{" "}
              for HST
            </p>
          </div>
          <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2">
            <p className="text-sm text-gray-800">
              Set aside{" "}
              <span className="font-semibold">
                {formatCurrency(data.estimatedIncomeTaxBeforeExpenses)}
              </span>{" "}
              for income tax
            </p>
          </div>
          <div className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2">
            <p className="text-sm text-gray-800">
              You really earned{" "}
              <span className="font-semibold">
                {formatCurrency(data.netIncomeBeforeExpensesIncludingUnderTable)}
              </span>{" "}
              this month
            </p>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Transaction details table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Collected Income - Massage Treatments
            </h4>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                      Client Name
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.treatments.map((treatment, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        {formatDate(treatment.date)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {treatment.first_name && treatment.last_name
                          ? `${treatment.first_name} ${treatment.last_name}`
                          : "Unknown Client"}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(Number(treatment.price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Income */}
          {additionalIncome.incomes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Additional Income
              </h4>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Source
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Details
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Tax Flags
                      </th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {additionalIncome.incomes.map((income, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm whitespace-nowrap">
                          {formatDate(income.date)}
                        </td>
                        <td className="px-4 py-2 text-sm">{income.source}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {income.details || "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          {formatCurrency(Number(income.amount))}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                          Tax: {income.includeInIncomeTax ? "Yes" : "No"} / HST:{" "}
                          {income.includeInHstQuickMethod ? "Yes" : "No"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() =>
                              handleDeleteAdditionalIncome(income.id)
                            }
                            className="text-red-600 hover:text-red-800 font-bold text-lg group relative"
                            aria-label="Delete"
                          >
                            ×
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              Delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Additional Treatments (post-tax add-on) */}
          {additionalTreatments?.treatments?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Additional Treatments (No HST/Tax)
              </h4>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Client Name
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {additionalTreatments.treatments.map((treatment, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {formatDate(treatment.date)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {treatment.first_name && treatment.last_name
                            ? `${treatment.first_name} ${treatment.last_name}`
                            : "Unknown Client"}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {formatCurrency(Number(treatment.price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses */}
          {expenses && otherExpenses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Expenses
              </h4>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Details
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        HST
                      </th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {otherExpenses.map((expense, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm whitespace-nowrap">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {expense.category}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {expense.details || "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          {formatCurrency(Number(expense.amount))}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          {formatCurrency(Number(expense.hst))}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800 font-bold text-lg group relative"
                            aria-label="Delete"
                          >
                            ×
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              Delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="3" className="px-4 py-2 text-sm text-right">
                        Total Expenses:
                      </td>
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                        {formatCurrency(
                          otherExpenses.reduce(
                            (sum, exp) => sum + Number(exp.amount),
                            0
                          )
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                        {formatCurrency(
                          otherExpenses.reduce(
                            (sum, exp) => sum + Number(exp.hst),
                            0
                          )
                        )}
                      </td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {homeOfficeExpenses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Home Office Expenses{" "}
                <span className="text-xs font-normal text-gray-600">(37% business-use)</span>
              </h4>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Subcategory
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        Details
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        Total Amount
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        Deductible Amount (37%)
                      </th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {homeOfficeExpenses.map((expense, index) => {
                      const portionAmount =
                        (Number(expense.amount) + Number(expense.hst)) * 0.37;

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm whitespace-nowrap">
                            {formatDate(expense.date)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {expense.subcategory || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {expense.details || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                            {formatCurrency(Number(expense.amount))}
                          </td>
                          <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                            {formatCurrency(portionAmount)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-800 font-bold text-lg group relative"
                              aria-label="Delete"
                            >
                              ×
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                Delete
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="3" className="px-4 py-2 text-sm text-right">
                        Total Home Office Expenses:
                      </td>
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                        {formatCurrency(
                          homeOfficeExpenses.reduce(
                            (sum, exp) => sum + Number(exp.amount),
                            0
                          )
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                        {formatCurrency(
                          homeOfficeExpenses.reduce((sum, exp) => {
                            return sum + (Number(exp.amount) + Number(exp.hst)) * 0.37;
                          }, 0)
                        )}
                      </td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HST & Tax Calculations */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Financial Summary
            </h4>
            <div className="space-y-3">
              {/* 1. Total Revenue */}
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <div className="text-xs text-blue-800 mb-1">
                  1. Gross Revenue Collected (incl. HST)
                </div>
                <div className="font-semibold text-blue-900">
                  {formatCurrency(data.totalGrossRevenueCollectedInclHst)}
                </div>
              </div>

              {/* 2. HST Calculations */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">
                    2. HST Collected (display only)
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(data.hstCollectedDisplay)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                  <div className="text-xs text-purple-800 mb-1">
                    3. Quick Method Remittance Before Line 107
                  </div>
                  <div className="font-semibold text-purple-900">
                    {formatCurrency(data.quickMethodRemittanceBefore107)}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-md border border-indigo-200">
                  <div className="text-xs text-indigo-800 mb-1">
                    4. Line 107 Credit (amount to report on line 107 for this period)
                  </div>
                  <div className="font-semibold text-indigo-900">
                    {formatCurrency(data.line107Credit)}
                  </div>
                </div>
              </div>

              {/* 3. Net HST To Remit */}
              <div className="bg-cyan-50 p-3 rounded-md border border-cyan-200">
                <div className="text-xs text-cyan-800 mb-1">
                  5. Net HST to Remit / Set Aside
                </div>
                <div className="font-semibold text-cyan-900">
                  {formatCurrency(data.netHstToRemit)}
                </div>
              </div>

              {/* 4. Income-Tax Included Revenue */}
              <div className="bg-emerald-50 p-3 rounded-md border border-emerald-200">
                <div className="text-xs text-emerald-800 mb-1">
                  6. Income-Tax-Included Revenue
                </div>
                <div className="font-semibold text-emerald-900">
                  {formatCurrency(data.incomeTaxIncludedRevenue)}
                </div>
              </div>

              <div className="bg-violet-50 p-3 rounded-md border border-violet-200">
                <div className="text-xs text-violet-800 mb-1">
                  7. Estimated Income Tax Before Expenses
                </div>
                <div className="font-semibold text-violet-900">
                  {formatCurrency(data.estimatedIncomeTaxBeforeExpenses)}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="text-xs text-slate-600 mb-1">
                  Excluded Additional Treatments
                </div>
                <div className="font-semibold text-slate-900">
                  {formatCurrency(data.excludedAdditionalTreatmentsRevenue || 0)}
                </div>
              </div>

              <div className="bg-lime-50 p-3 rounded-md border border-lime-200">
                <div className="text-xs text-lime-800 mb-1">
                  8. Net Income Before Expenses (incl. under-the-table)
                </div>
                <div className="font-semibold text-lime-900">
                  {formatCurrency(data.netIncomeBeforeExpensesIncludingUnderTable)}
                </div>
              </div>

              {/* 8. Deductible Expenses */}
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <div className="text-xs text-red-800 mb-1">
                  9. Deductible Expenses for Income Tax
                </div>
                <div className="font-semibold text-red-900">
                  {formatCurrency(data.totalDeductibleExpensesForIncomeTax || 0)}
                </div>
              </div>

              {/* 9. Taxable profit before tax */}
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <div className="text-xs text-amber-800 mb-1">
                  10. Taxable Business Profit Before Tax
                </div>
                <div className="font-semibold text-amber-900">
                  {formatCurrency(data.taxableBusinessProfitBeforeTax || 0)}
                </div>
              </div>

              {/* 10. Estimated Tax */}
              <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                <div className="text-xs text-orange-800 mb-1">
                  11. Estimated Income Tax (after expenses)
                </div>
                <div className="font-semibold text-orange-900">
                  {formatCurrency(data.estimatedIncomeTax)}
                </div>
              </div>

              {/* 11. Post-tax and final cash */}
              <div className="bg-green-50 p-3 rounded-md border-2 border-green-300">
                <div className="text-xs text-green-800 mb-1">
                  12. Post-Tax Business Cash
                </div>
                <div className="font-bold text-green-900 text-lg">
                  {formatCurrency(data.postTaxBusinessCash)}
                </div>
              </div>

              <div className="bg-lime-50 p-3 rounded-md border-2 border-lime-300">
                <div className="text-xs text-lime-800 mb-1">
                  13. Final Cash After Adding Back Additional Treatments
                </div>
                <div className="font-bold text-lime-900 text-lg">
                  {formatCurrency(data.finalCashAfterEverything)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">
                    14. Threshold Used YTD
                  </div>
                  <div className="font-semibold">{formatCurrency(data.thresholdUsedYtd)}</div>
                </div>
                <div className="bg-white p-3 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">
                    15. Threshold Remaining YTD
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(data.thresholdRemainingYtd)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly total */}
          <div className="bg-gray-100 p-3 rounded-md border border-gray-300">
            <div className="flex justify-between items-center">
              <span className="font-semibold">
                Final Cash After Adding Back Additional Treatments
              </span>
              <span className="font-bold text-lg">
                {formatCurrency(data.finalCashAfterEverything)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
