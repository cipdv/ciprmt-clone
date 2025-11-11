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

export function MonthlyBreakdown({ month, data, additionalIncome, expenses }) {
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

  if (homeOfficeExpenses.length > 0) {
    console.log("[v0] Home office expenses:", homeOfficeExpenses);
  }

  const formatCurrency = (value) => {
    return `$${value.toLocaleString("en-US", {
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
    <div className="rounded-md border border-gray-200 overflow-hidden">
      {/* Summary row - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gray-50 hover:bg-gray-100 transition-colors p-4 flex items-center justify-between"
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
        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-xs text-gray-600">Total Revenue</div>
            <div className="font-semibold">
              {formatCurrency(data.totalRevenue)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600">HST (8.8%)</div>
            <div className="font-semibold">{formatCurrency(data.hstPaid)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600">Estimated Taxes (20%)</div>
            <div className="font-semibold">
              {formatCurrency(data.estimatedTax)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600">Net Income</div>
            <div className="font-semibold">
              {formatCurrency(data.netIncome)}
            </div>
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
                <span className="text-xs font-normal text-gray-600">
                  (Home office 275/728)
                </span>
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
                        Portion of HOE (37%)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                        HST
                      </th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {homeOfficeExpenses.map((expense, index) => {
                      const portionAmount = Number(expense.amount) * 0.37;
                      const hstOnPortion =
                        expense.subcategory === "Rent"
                          ? 0
                          : portionAmount * 0.13;

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
                          <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                            {expense.subcategory === "Rent"
                              ? "-"
                              : formatCurrency(hstOnPortion)}
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
                          homeOfficeExpenses.reduce(
                            (sum, exp) => sum + Number(exp.amount) * 0.37,
                            0
                          )
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                        {formatCurrency(
                          homeOfficeExpenses.reduce((sum, exp) => {
                            if (exp.subcategory === "Rent") return sum;
                            return sum + Number(exp.amount) * 0.37 * 0.13;
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
                  1. Total Revenue
                </div>
                <div className="font-semibold text-blue-900">
                  {formatCurrency(data.totalRevenue)}
                </div>
              </div>

              {/* 2. HST Calculations */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">
                    2a. HST Collected (13%)
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(data.hstCollected)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                  <div className="text-xs text-purple-800 mb-1">
                    2b. HST Paid (8.8%)
                  </div>
                  <div className="font-semibold text-purple-900">
                    {formatCurrency(data.hstPaid)}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-md border border-indigo-200">
                  <div className="text-xs text-indigo-800 mb-1">
                    2c. HST Difference
                  </div>
                  <div className="font-semibold text-indigo-900">
                    {formatCurrency(data.hstDifference)}
                  </div>
                </div>
              </div>

              {/* 3. Income After HST */}
              <div className="bg-cyan-50 p-3 rounded-md border border-cyan-200">
                <div className="text-xs text-cyan-800 mb-1">
                  3. Income After HST (Revenue - HST Collected)
                </div>
                <div className="font-semibold text-cyan-900">
                  {formatCurrency(data.incomeAfterHST)}
                </div>
              </div>

              {/* 4. Total Expenses */}
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <div className="text-xs text-red-800 mb-1">
                  4. Total Expenses
                </div>
                <div className="font-semibold text-red-900">
                  {formatCurrency(data.totalExpenses || 0)}
                </div>
              </div>

              {/* 5. Income After Expenses */}
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <div className="text-xs text-amber-800 mb-1">
                  5. Income After Expenses
                </div>
                <div className="font-semibold text-amber-900">
                  {formatCurrency(data.incomeAfterExpenses || 0)}
                </div>
              </div>

              {/* 6. Estimated Tax */}
              <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                <div className="text-xs text-orange-800 mb-1">
                  6. Estimated Tax (20% of Income After Expenses)
                </div>
                <div className="font-semibold text-orange-900">
                  {formatCurrency(data.estimatedTax)}
                </div>
              </div>

              {/* 7. Net Income */}
              <div className="bg-green-50 p-3 rounded-md border-2 border-green-300">
                <div className="text-xs text-green-800 mb-1">
                  7. Net Income (Income After HST - Estimated Tax)
                </div>
                <div className="font-bold text-green-900 text-lg">
                  {formatCurrency(data.netIncome)}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly total */}
          <div className="bg-gray-100 p-3 rounded-md border border-gray-300">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Monthly Income</span>
              <span className="font-bold text-lg">
                {formatCurrency(data.netIncome)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
