"use client";

import { useState } from "react";
import { AdditionalIncomeForm } from "./additional-income-form";
import { ExpensesForm } from "./expenses-form";

function Chevron({ isOpen }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 5L12 10L7 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkedFinanceForms() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] overflow-hidden">
        <button
          type="button"
          onClick={toggleOpen}
          className="w-full flex items-center justify-between px-4 py-3 text-left border-b border-[#b7c7b0] hover:bg-[#e8efe4] transition-colors"
        >
          <span className="font-semibold text-[#1f2a1f]">Add Additional Income</span>
          <Chevron isOpen={isOpen} />
        </button>
        {isOpen && (
          <div className="p-4">
            <AdditionalIncomeForm />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] overflow-hidden">
        <button
          type="button"
          onClick={toggleOpen}
          className="w-full flex items-center justify-between px-4 py-3 text-left border-b border-[#b7c7b0] hover:bg-[#e8efe4] transition-colors"
        >
          <span className="font-semibold text-[#1f2a1f]">Add Additional Expense</span>
          <Chevron isOpen={isOpen} />
        </button>
        {isOpen && (
          <div className="p-4">
            <ExpensesForm />
          </div>
        )}
      </div>
    </div>
  );
}
