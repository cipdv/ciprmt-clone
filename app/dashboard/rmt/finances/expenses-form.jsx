"use client";

import { useState } from "react";
import { addExpense } from "@/app/_actions";

export function ExpensesForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.target);
    const result = await addExpense(formData);

    if (result.success) {
      setMessage({ type: "success", text: "Expense added successfully!" });
      event.target.reset();
      setSelectedCategory("");
      event.target.date.value = today;
    } else {
      setMessage({ type: "error", text: result.error });
    }

    setIsSubmitting(false);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Add Expense</h2>
        <p className="text-xs text-gray-600 mt-1">Record business expenses</p>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              min="0"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          {/* Includes HST Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includesHst"
              name="includesHst"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="includesHst"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Includes HST?
            </label>
          </div>

          {/* Category Field */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              onChange={(e) => setSelectedCategory(e.target.value)}
              value={selectedCategory}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              <option value="Advertising">Advertising</option>
              <option value="Other">Other</option>
              <option value="Travel">Travel</option>
              <option value="Licenses and Business Taxes">
                Licenses and Business Taxes
              </option>
              <option value="Insurance">Insurance</option>
              <option value="Interest Paid">Interest Paid</option>
              <option value="Repairs and Maintenance">
                Repairs and Maintenance
              </option>
              <option value="Other Supplies">Other Supplies</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Bank Fees">Bank Fees</option>
              <option value="Admin Fees">Admin Fees</option>
              <option value="Other Expenses">Other Expenses</option>
              <option value="Home Office Expenses">Home Office Expenses</option>
            </select>
          </div>

          {selectedCategory === "Home Office Expenses" && (
            <div>
              <label
                htmlFor="subcategory"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Subcategory <span className="text-red-500">*</span>
              </label>
              <select
                id="subcategory"
                name="subcategory"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a subcategory</option>
                <option value="Rent">Rent</option>
                <option value="Heat">Heat</option>
                <option value="Electricity">Electricity</option>
                <option value="Cell Phone">Cell Phone</option>
                <option value="Internet">Internet</option>
              </select>
            </div>
          )}

          {/* Details Field */}
          <div>
            <label
              htmlFor="details"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Details <span className="text-sm text-gray-500">(optional)</span>
            </label>
            <textarea
              id="details"
              name="details"
              rows="2"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional details..."
            />
          </div>

          {/* Date Field */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              defaultValue={today}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`p-3 text-sm rounded-md ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 text-sm rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Adding..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
