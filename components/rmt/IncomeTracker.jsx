"use client";

import { useState, useEffect } from "react";
import { getIncomeByMonth } from "@/app/_actions";
import MonthlyIncomeDetails from "./MonthlyIncomeDetails";

const IncomeTracker = () => {
  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchIncomeData() {
      try {
        setLoading(true);
        const result = await getIncomeByMonth();

        if (result.success) {
          setIncomeData(result.data);
        } else {
          setError(result.message || "Failed to fetch income data");
        }
      } catch (err) {
        console.error("Error fetching income data:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchIncomeData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  // Get month name
  const getMonthName = (monthIndex) => {
    const months = [
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
    return months[monthIndex];
  };

  if (loading) {
    return <div className="text-center py-8">Loading income data...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!incomeData || Object.keys(incomeData).length === 0) {
    return <div className="text-center py-8">No income data available.</div>;
  }

  // Sort years in descending order
  const sortedYears = Object.keys(incomeData).sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold mb-6">Income Tracker</h1>

      {sortedYears.map((year) => {
        const yearData = incomeData[year];
        const currentDate = new Date();
        const isCurrentYear = year === currentDate.getFullYear().toString();

        // Get months with income data
        const monthsWithData = Object.keys(yearData.months)
          .map(Number)
          .sort((a, b) => b - a); // Sort in descending order

        return (
          <div key={year} className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{year} Income</h2>

            {isCurrentYear && (
              <div className="mb-4 p-4 bg-blue-50 rounded-md">
                <p className="text-lg font-medium">
                  Year-to-Date Total: {formatCurrency(yearData.yearToDateTotal)}
                </p>
              </div>
            )}

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 border-b">Month</th>
                  <th className="text-right p-3 border-b">Total Income</th>
                </tr>
              </thead>
              <tbody>
                {monthsWithData.map((month) => (
                  <tr key={month} className="hover:bg-gray-50">
                    <td className="p-3 border-b">
                      <div>
                        {getMonthName(month)}
                        <MonthlyIncomeDetails
                          year={year}
                          month={month}
                          incomeData={yearData.months[month]}
                        />
                      </div>
                    </td>
                    <td className="text-right p-3 border-b">
                      {formatCurrency(yearData.months[month].monthTotal)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-3 border-b">Total</td>
                  <td className="text-right p-3 border-b">
                    {formatCurrency(yearData.yearTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default IncomeTracker;
