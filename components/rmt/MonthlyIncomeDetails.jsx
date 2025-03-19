"use client";

import { useState } from "react";

const MonthlyIncomeDetails = ({ year, month, incomeData }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!incomeData || !incomeData.incomes || incomeData.incomes.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
      >
        <span>{isOpen ? "Hide" : "Show"} Details</span>
        <svg
          className={`ml-1 h-4 w-4 transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Details</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right">HST</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {incomeData.incomes.map((income) => (
                <tr key={income.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{formatDate(income.date)}</td>
                  <td className="p-2">{income.details || "N/A"}</td>
                  <td className="p-2 text-right">
                    {formatCurrency(income.amount)}
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(income.hstAmount)}
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(income.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MonthlyIncomeDetails;
