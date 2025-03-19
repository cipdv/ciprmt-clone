"use client";

import React from "react";
import { jsPDF } from "jspdf";

const ReceiptDownloadButton = ({ receipt, user }) => {
  // Format date to "Month Day, Year" format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC", // Use UTC to avoid timezone issues
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Format time to 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";

    const timeParts = timeString.split(":");
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    const date = new Date(2000, 0, 1, hours, minutes);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageCenter = pageWidth / 2;

    // Format the date and time
    const formattedDate = formatDate(receipt.date);
    const formattedTime = formatTime(
      receipt.appointment_begins_at || receipt.appointment_start_time
    );

    // Add background color
    doc.setFillColor(180, 200, 194); // Light green color
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.height, "F");

    // Set text color to dark for better contrast
    doc.setTextColor(0, 0, 0);

    // Add content to the PDF
    doc.setFontSize(18);
    doc.text("Cip de Vries, RMT", pageCenter, 20, null, null, "center");

    doc.setFontSize(12);
    doc.text(
      "268 Shuter St, Toronto, ON, M5A 1W3",
      pageCenter,
      30,
      null,
      null,
      "center"
    );
    doc.text("Phone: 416-258-1230", pageCenter, 35, null, null, "center");
    doc.text("Registration Number: U035", pageCenter, 40, null, null, "center");
    doc.text(
      "HST Number: 845 918 200 RT0001",
      pageCenter,
      45,
      null,
      null,
      "center"
    );

    doc.setFontSize(16);
    doc.text("Official Receipt", pageCenter, 60, null, null, "center");

    doc.setFontSize(12);
    doc.text(
      `For Massage Therapy Services provided to: ${user.firstName} ${user.lastName}`,
      pageCenter,
      70,
      null,
      null,
      "center"
    );
    doc.text(
      `Date of treatment: ${formattedDate}`,
      pageCenter,
      80,
      null,
      null,
      "center"
    );
    doc.text(
      `Time of treatment: ${formattedTime}`,
      pageCenter,
      85,
      null,
      null,
      "center"
    );
    doc.text(
      `Treatment duration: ${receipt.duration} minutes`,
      pageCenter,
      90,
      null,
      null,
      "center"
    );
    doc.text(
      `Payment received: $${receipt.price} from ${user.firstName} ${user.lastName}`,
      pageCenter,
      95,
      null,
      null,
      "center"
    );
    doc.text(
      `Receipt number: ${receipt.id}`,
      pageCenter,
      100,
      null,
      null,
      "center"
    );

    doc.setFontSize(14);
    doc.text("RMT Signature:", pageCenter, 120, null, null, "center");

    // Add the signature image
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/images/signature.png";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const imgWidth = 80;
      const imgHeight = 40;
      const imgX = pageCenter - imgWidth / 2;
      doc.addImage(img, "PNG", imgX, 130, imgWidth, imgHeight);
    } catch (error) {
      console.error("Error loading signature image:", error);
      // If there's an error loading the image, add a centered line for manual signature
      doc.line(pageCenter - 40, 140, pageCenter + 40, 140);
    }

    // Save the PDF
    doc.save(`RMTreceipt-${receipt.id}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="bg-buttons hover:bg-buttonsHover text-white font-bold py-2 px-4 rounded"
    >
      Download Receipt
    </button>
  );
};

export default ReceiptDownloadButton;
