"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function YearSelector({ availableYears, selectedYear }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const handleYearChange = (year) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative w-32">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="block truncate">{selectedYear}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[5] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => handleYearChange(year)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                year === selectedYear ? "bg-gray-100 font-semibold" : ""
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
