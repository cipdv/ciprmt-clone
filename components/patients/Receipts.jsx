"use client";

import React, { useState } from "react";
import Link from "next/link";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const formatPrice = (price) => {
  if (typeof price === "number") {
    return price.toFixed(2);
  }
  return price || "N/A";
};

export default function Receipts({ receipts }) {
  const [currentPage, setCurrentPage] = useState(1);
  const receiptsPerPage = 8;

  // Calculate total pages
  const totalPages = Math.ceil(receipts.length / receiptsPerPage);

  // Get current receipts
  const indexOfLastReceipt = currentPage * receiptsPerPage;
  const indexOfFirstReceipt = indexOfLastReceipt - receiptsPerPage;
  const currentReceipts = receipts.slice(
    indexOfFirstReceipt,
    indexOfLastReceipt
  );

  // Change page
  const paginate = (direction) => {
    if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-3xl mb-6">Receipts</h2>
      {receipts.length === 0 ? (
        <p className="text-gray-500 italic">No receipts available.</p>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {currentReceipts.map((receipt) => (
              <li
                key={receipt._id}
                className="bg-white shadow hover:bg-gray-200 rounded-lg p-4"
              >
                <Link href={`/dashboard/patient/receipts/${receipt._id}`}>
                  <div className="flex justify-between items-center transition-colors duration-150 ease-in-out">
                    <div>
                      <p className="font-semibold">
                        {formatDate(
                          receipt.type === "appointment"
                            ? receipt.appointmentDate
                            : receipt.date
                        )}
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      ${formatPrice(receipt.price)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav
              className="flex justify-between items-center mt-4"
              aria-label="Receipts pagination"
            >
              <button
                onClick={() => paginate("prev")}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <p className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </p>
              <button
                onClick={() => paginate("next")}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
