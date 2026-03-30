"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getClientBenefitsCoverage,
  saveClientBenefitsCoverage,
} from "@/app/_actions";

const MASSAGE_OPTIONS = [
  { minutes: 60, cost: 129.95 },
  { minutes: 75, cost: 152.55 },
  { minutes: 90, cost: 175.15 },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);

export default function ClientBenefitsCalculator({
  clientId,
  initialCoverage = null,
}) {
  const [allowance, setAllowance] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [sendReminders, setSendReminders] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [usedAmount, setUsedAmount] = useState(0);

  const parsedAllowance = useMemo(() => {
    const value = Number(allowance);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [allowance]);

  useEffect(() => {
    if (!clientId) return;

    const loadCoverage = async () => {
      const result = await getClientBenefitsCoverage(clientId);
      if (result.success) {
        const value = result.data?.benefitsCoverage;
        const renewal = result.data?.benefitsRenewalDate;
        const used = result.data?.usedAmount || 0;
        const remindersEnabled = Boolean(result.data?.sendReminders);
        const reminderFreq = result.data?.reminderFrequency;
        setAllowance(
          value === null || value === undefined ? "" : String(value),
        );
        setRenewalDate(renewal || `${new Date().getFullYear()}-01-01`);
        setUsedAmount(used);
        setSendReminders(remindersEnabled);

        if (reminderFreq !== null && reminderFreq !== undefined) {
          const allowanceValue =
            value === null || value === undefined ? 0 : Number(value);
          if (allowanceValue > 0) {
            let closest = null;
            let closestDiff = Number.POSITIVE_INFINITY;
            MASSAGE_OPTIONS.forEach((option) => {
              const weeks = 52 / (allowanceValue / option.cost);
              const diff = Math.abs(weeks - Number(reminderFreq));
              if (diff < closestDiff) {
                closestDiff = diff;
                closest = option.minutes;
              }
            });
            setSelectedDuration(closest);
          }
        }
        return;
      }

      if (initialCoverage !== null && initialCoverage !== undefined) {
        setAllowance(String(initialCoverage));
      }
      setRenewalDate(`${new Date().getFullYear()}-01-01`);
    };

    loadCoverage();
  }, [clientId, initialCoverage]);

  const handleSave = async () => {
    if (!clientId) return;

    const selectedOption = MASSAGE_OPTIONS.find(
      (option) => option.minutes === selectedDuration,
    );
    const reminderFrequencyValue =
      sendReminders && parsedAllowance > 0 && selectedOption
        ? Number((52 / (parsedAllowance / selectedOption.cost)).toFixed(2))
        : null;

    setSaveStatus(null);
    setIsSaving(true);
    try {
      const result = await saveClientBenefitsCoverage(
        clientId,
        allowance,
        renewalDate,
        sendReminders,
        reminderFrequencyValue,
      );
      if (!result.success) {
        setSaveStatus({
          type: "error",
          text: result.message || "Failed to save benefits coverage.",
        });
        return;
      }

      const savedValue = result.data?.benefitsCoverage;
      const savedRenewalDate = result.data?.benefitsRenewalDate;
      setAllowance(
        savedValue === null || savedValue === undefined
          ? ""
          : String(savedValue),
      );
      if (savedRenewalDate) {
        setRenewalDate(savedRenewalDate);
      }
      setSendReminders(Boolean(result.data?.sendReminders));

      const refreshed = await getClientBenefitsCoverage(clientId);
      if (refreshed.success) {
        setUsedAmount(refreshed.data?.usedAmount || 0);
      }

      setSaveStatus({
        type: "success",
        text: result.message || "Benefits coverage saved.",
      });
    } catch {
      setSaveStatus({
        type: "error",
        text: "Failed to save benefits coverage.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-gray-300 bg-white rounded-lg p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-lg font-semibold">Benefits Package Calculator</h3>
          <p className="text-sm text-gray-600 mt-1">
            Enter yearly massage coverage to estimate appointments per year.
          </p>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {isExpanded ? "Hide" : "Show"}
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <label
                  htmlFor="allowance"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Annual coverage amount
                </label>
                <input
                  id="allowance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1200"
                  value={allowance}
                  onChange={(event) => setAllowance(event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="renewalDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Yearly renewal date
                </label>
                <input
                  id="renewalDate"
                  type="date"
                  value={renewalDate}
                  onChange={(event) => setRenewalDate(event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="sendReminders"
                  type="checkbox"
                  checked={sendReminders}
                  onChange={(event) => setSendReminders(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="sendReminders"
                  className="text-sm font-medium text-gray-700"
                >
                  Send reminders
                </label>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                Benefit Usage Summary
              </p>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Used this benefit year</span>
                  <span className="font-semibold">{formatMoney(usedAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Remaining</span>
                  <span className="font-semibold">
                    {formatMoney(Math.max(parsedAllowance - usedAmount, 0))}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Select one duration card below to set reminder frequency.
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {MASSAGE_OPTIONS.map((option) => {
              const sessionsPerYear =
                parsedAllowance > 0 ? parsedAllowance / option.cost : 0;
              const weeksBetween =
                sessionsPerYear > 0 ? 52 / sessionsPerYear : 0;
              const isSelected = selectedDuration === option.minutes;

              return (
                <div
                  key={option.minutes}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDuration(option.minutes)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDuration(option.minutes);
                    }
                  }}
                  className={`rounded-md border p-3 cursor-pointer transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-gray-50 hover:border-blue-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.minutes} min</p>
                  <p className="text-sm text-gray-600">
                    {formatMoney(option.cost)} per session
                  </p>

                  {sessionsPerYear > 0 ? (
                    <div className="mt-2 text-sm">
                      <p>
                        <span className="font-medium">
                          {formatNumber(sessionsPerYear)}
                        </span>{" "}
                        sessions/year
                      </p>
                      <p>
                        About every{" "}
                        <span className="font-medium">
                          {formatNumber(weeksBetween)}
                        </span>{" "}
                        weeks
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Enter an amount to view estimates.
                    </p>
                  )}

                  {isSelected && (
                    <p className="mt-2 text-xs font-medium text-blue-700">
                      Selected for reminder frequency
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {saveStatus && (
            <div
              className={`mt-4 text-sm rounded-md px-3 py-2 border ${
                saveStatus.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {saveStatus.text}
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !clientId}
              className="w-full px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
