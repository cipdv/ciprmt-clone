"use client";

import React, { useState } from "react";
import Link from "next/link";
import ReceiptDownloadButton from "./ReceiptDownloadButton";

// Helper function to format date consistently
const formatDate = (dateString) => {
  const date = new Date(dateString);
  // Use UTC methods to prevent timezone issues
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };
  return date.toLocaleDateString("en-US", options);
};

const formatTime = (timeString) => {
  if (!timeString) return "N/A";

  const [hours, minutes] = timeString.split(":");
  const date = new Date(2000, 0, 1, hours, minutes); // Year, month, and day are arbitrary
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const Receipts = ({ user, receipts }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const receiptsPerPage = 10;

  // Filter receipts with valid prices and past dates
  const validReceipts = receipts.filter(
    (receipt) =>
      receipt.price != null &&
      receipt.price !== undefined &&
      new Date(receipt.appointmentDate) < new Date()
  );

  // Sort receipts by date, most recent first
  validReceipts.sort(
    (a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)
  );

  const latestReceipt = validReceipts[0];

  // Get current receipts
  const indexOfLastReceipt = currentPage * receiptsPerPage;
  const indexOfFirstReceipt = indexOfLastReceipt - receiptsPerPage;
  const currentReceipts = validReceipts.slice(
    indexOfFirstReceipt,
    indexOfLastReceipt
  );

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="mx-auto max-w-4xl px-4 mb-28">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl mb-4">
            Here are your massage appointment receipts:
          </h1>
          {latestReceipt && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-2xl mb-4">Latest Receipt</h2>
              <p>Date: {formatDate(latestReceipt.appointmentDate)}</p>
              <p>Time: {formatTime(latestReceipt.appointmentBeginsAt)}</p>
              <p>Duration: {latestReceipt.duration} minutes</p>
              <p>
                Price: $
                {typeof latestReceipt.price === "number"
                  ? latestReceipt.price.toFixed(2)
                  : latestReceipt.price}
              </p>
              <div className="mt-4">
                <ReceiptDownloadButton receipt={latestReceipt} user={user} />
              </div>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl mb-4">All Receipts</h2>
          {validReceipts.length === 0 ? (
            <p className="text-gray-500 italic">No receipts available.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {currentReceipts.map((receipt) => (
                  <li
                    key={receipt._id}
                    className="bg-white shadow rounded-lg p-4"
                  >
                    <Link href={`/dashboard/patient/receipts/${receipt._id}`}>
                      <h2 className="hover:underline">
                        {formatDate(receipt.appointmentDate)} - $
                        {typeof receipt.price === "number"
                          ? receipt.price.toFixed(2)
                          : receipt.price}
                      </h2>
                    </Link>
                  </li>
                ))}
              </ul>
              {validReceipts.length > receiptsPerPage && (
                <div className="flex justify-center mt-4">
                  <nav className="inline-flex rounded-md shadow">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from(
                      {
                        length: Math.ceil(
                          validReceipts.length / receiptsPerPage
                        ),
                      },
                      (_, i) => (
                        <button
                          key={i}
                          onClick={() => paginate(i + 1)}
                          className={`px-3 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === i + 1
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {i + 1}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={
                        currentPage ===
                        Math.ceil(validReceipts.length / receiptsPerPage)
                      }
                      className="px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Receipts;
