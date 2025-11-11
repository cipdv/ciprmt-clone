"use client";

import { useState, useEffect } from "react";
import { getExpenses, deleteExpense } from "@/app/_actions";

export default function ExpenseList({ rmtId, refreshTrigger }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [rmtId, refreshTrigger]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const result = await getExpenses(rmtId);

      if (result.success) {
        setExpenses(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const result = await deleteExpense(expenseId);
    if (result.success) {
      fetchExpenses();
    } else {
      alert("Failed to delete expense");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Group expenses by year and month
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = new Date(expense.date);
    const year = date.getFullYear();
    const month = date.getMonth();

    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];

    acc[year][month].push(expense);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600">Loading expenses...</div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No expenses recorded yet.
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {Object.keys(groupedExpenses)
        .sort((a, b) => b - a)
        .map((year) => (
          <div key={year}>
            <h3 className="text-xl font-bold mb-4">{year}</h3>
            {Object.keys(groupedExpenses[year])
              .sort((a, b) => b - a)
              .map((month) => {
                const monthExpenses = groupedExpenses[year][month];
                const monthTotal = monthExpenses.reduce(
                  (sum, exp) => sum + Number.parseFloat(exp.amount),
                  0
                );

                return (
                  <div key={month} className="mb-6">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-gray-300">
                      <h4 className="text-lg font-semibold">
                        {monthNames[month]}
                      </h4>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(monthTotal)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {monthExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                  {expense.category}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(expense.date)}
                                </span>
                              </div>
                              {expense.notes && (
                                <p className="text-gray-700 text-sm mt-2">
                                  {expense.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className="text-lg font-bold text-red-600">
                                {formatCurrency(expense.amount)}
                              </span>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-500 hover:text-red-700 p-2"
                                aria-label="Delete expense"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
    </div>
  );
}
