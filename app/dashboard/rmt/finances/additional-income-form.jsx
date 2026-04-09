"use client";

import { useState } from "react";
import { addAdditionalIncome } from "@/app/_actions";
import {
  ADDITIONAL_INCOME_SOURCE_DEFAULTS,
  ADDITIONAL_INCOME_SOURCE_OPTIONS,
} from "./additional-income-source-defaults";

export function AdditionalIncomeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [includeInIncomeTax, setIncludeInIncomeTax] = useState(true);
  const [includeInHstQuickMethod, setIncludeInHstQuickMethod] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  const sourceHelperText = selectedSource
    ? ADDITIONAL_INCOME_SOURCE_DEFAULTS[selectedSource]?.helperText
    : null;

  const handleSourceChange = (event) => {
    const nextSource = event.target.value;
    setSelectedSource(nextSource);

    if (!nextSource) {
      setIncludeInIncomeTax(true);
      setIncludeInHstQuickMethod(false);
      return;
    }

    const defaults = ADDITIONAL_INCOME_SOURCE_DEFAULTS[nextSource];
    if (defaults) {
      // Re-apply defaults when source changes; user can still override afterward.
      setIncludeInIncomeTax(Boolean(defaults.includeInIncomeTax));
      setIncludeInHstQuickMethod(Boolean(defaults.includeInHstQuickMethod));
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.target);
    const result = await addAdditionalIncome(formData);

    if (result.success) {
      setMessage({
        type: "success",
        text: "Additional income added successfully!",
      });
      event.target.reset();
      // Reset date to today after form reset
      event.target.date.value = today;
      // Reset source/flags to initial empty/default state.
      setSelectedSource("");
      setIncludeInIncomeTax(true);
      setIncludeInHstQuickMethod(false);
    } else {
      setMessage({ type: "error", text: result.error });
    }

    setIsSubmitting(false);
  }

  return (
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

          {/* Source Field */}
          <div>
            <label
              htmlFor="source"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Source <span className="text-red-500">*</span>
            </label>
            <select
              id="source"
              name="source"
              required
              value={selectedSource}
              onChange={handleSourceChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a source</option>
              {ADDITIONAL_INCOME_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            {sourceHelperText ? (
              <p className="mt-1 text-xs text-gray-600">{sourceHelperText}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="includeInIncomeTax"
                checked={includeInIncomeTax}
                onChange={(event) => setIncludeInIncomeTax(event.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Include in income tax
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="includeInHstQuickMethod"
                checked={includeInHstQuickMethod}
                onChange={(event) =>
                  setIncludeInHstQuickMethod(event.target.checked)
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Include in HST quick method
              </span>
            </label>
            <p className="pl-6 text-xs text-gray-600">
              Check this only if I billed the client directly and collected HST myself.
            </p>
          </div>

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
            className="w-full px-3 py-2 text-sm rounded-md font-medium text-[#1f2a1f] border border-gray-300 bg-[#f4f7f2] hover:bg-[#e8efe4] focus:outline-none focus:ring-2 focus:ring-[#b7c7b0] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Adding..." : "Add Income"}
          </button>
    </form>
  );
}
