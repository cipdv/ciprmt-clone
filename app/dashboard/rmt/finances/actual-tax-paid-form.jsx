"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveActualTaxPaidForYear } from "@/app/_actions";

export function ActualTaxPaidForm({ year, initialActualTaxPaid = null }) {
  const router = useRouter();
  const [value, setValue] = useState(
    initialActualTaxPaid === null || initialActualTaxPaid === undefined
      ? ""
      : String(initialActualTaxPaid),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    setStatus(null);
    setIsSaving(true);
    try {
      const result = await saveActualTaxPaidForYear(year, value === "" ? 0 : value);
      if (!result.success) {
        setStatus({
          type: "error",
          text: result.error || "Failed to save actual tax paid.",
        });
        return;
      }
      setValue(String(result.data?.actualTaxPaid ?? value));
      setStatus({ type: "success", text: "Saved." });
      router.refresh();
    } catch {
      setStatus({ type: "error", text: "Failed to save actual tax paid." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      <div className="text-sm text-gray-600 mb-1">Actual Tax Paid</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 4200.00"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      {status && (
        <p
          className={`mt-2 text-xs ${
            status.type === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}

