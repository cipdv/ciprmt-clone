"use client";

import { useState } from "react";
import { addMaintenanceLog } from "@/app/_actions";

export function MaintenanceLogForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.target);
    const result = await addMaintenanceLog(formData);

    if (result.success) {
      setMessage({
        type: "success",
        text: "Maintenance log saved.",
      });
      event.target.reset();
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to save maintenance log.",
      });
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            name="massage_mat"
            className="w-4 h-4 border-gray-300 rounded"
          />
          <span>Massage mat</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            name="speaker_and_cables"
            className="w-4 h-4 border-gray-300 rounded"
          />
          <span>Speaker &amp; cables</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            name="towels_and_linens"
            className="w-4 h-4 border-gray-300 rounded"
          />
          <span>Towels and linens</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            name="lighting"
            className="w-4 h-4 border-gray-300 rounded"
          />
          <span>Lighting</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            name="accessories"
            className="w-4 h-4 border-gray-300 rounded"
          />
          <span>Accessories</span>
        </label>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Additional Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows="4"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any details..."
        />
      </div>

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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 text-sm rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Saving..." : "Save Maintenance Log"}
      </button>
    </form>
  );
}
