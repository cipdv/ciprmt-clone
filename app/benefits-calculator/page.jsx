"use client";

import { useMemo, useState } from "react";

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

export default function BenefitsCalculatorPage() {
  const [allowance, setAllowance] = useState("");

  const parsedAllowance = useMemo(() => {
    const value = Number(allowance);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [allowance]);

  return (
    <main className="min-h-screen bg-[#d5e1d0] text-black">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-9">
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#5a6a5a]">
            Benefits Calculator
          </p>
          <h1 className="text-3xl font-semibold text-[#251a0e] sm:text-4xl">
            Plan your massage schedule around your annual benefits allowance.
          </h1>
          <p className="max-w-2xl text-base text-[#3a3a3a] sm:text-lg">
            Enter your total yearly benefits for massage, then see how often you
            can book each session length while staying within your budget.
          </p>
        </section>

        <section className="rounded-2xl border border-[#c3d1be] bg-[#eef3eb] p-4">
          <form className="flex flex-col gap-1 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm text-[#3a3a3a]">
              Annual massage allowance
              <input
                className="w-full rounded-lg border border-[#b9c8b4] bg-white px-4 py-3 text-base text-[#251a0e] outline-none ring-0 transition focus:border-[#6b845d] focus:ring-2 focus:ring-[#6b845d]/30"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1200"
                value={allowance}
                onChange={(event) => setAllowance(event.target.value)}
              />
            </label>
            <div className="text-xs text-[#6b6b6b]">
              Uses 52 weeks per year for the timing estimate.
            </div>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {MASSAGE_OPTIONS.map((option) => {
            const sessionsPerYear =
              parsedAllowance > 0 ? parsedAllowance / option.cost : 0;
            const weeksBetween =
              sessionsPerYear > 0 ? 52 / sessionsPerYear : 0;

            return (
              <div
                key={option.minutes}
                className="flex h-full flex-col justify-between rounded-2xl border border-[#c3d1be] bg-[#f7faf5] p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6b845d]">
                    {option.minutes} min
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-semibold text-[#3a3a3a]">
                      {formatMoney(option.cost)}
                    </h2>
                    <span className="text-xs text-[#7a7a7a]">per session</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-[#d1ddd0] pt-4 text-sm text-[#2f2f2f]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7a7a7a]">
                    Estimated frequency
                  </p>
                  {sessionsPerYear > 0 ? (
                    <>
                      <p className="text-2xl font-semibold text-[#251a0e]">
                        About every {formatNumber(weeksBetween)} weeks
                      </p>
                      <p className="text-sm text-[#4a4a4a]">
                        Roughly {formatNumber(sessionsPerYear)} sessions per
                        year
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#6b6b6b]">
                      Enter your allowance to see the schedule.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
