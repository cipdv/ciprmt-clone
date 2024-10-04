"use client";

import React from "react";
import { jsPDF } from "jspdf";

const ReceiptDownloadButton = ({ receipt, user }) => {
  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageCenter = pageWidth / 2;

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
      `Date of treatment: ${receipt.appointmentDate}`,
      pageCenter,
      80,
      null,
      null,
      "center"
    );
    doc.text(
      `Time of treatment: ${receipt.appointmentBeginsAt}`,
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
      `Receipt number: ${receipt._id}`,
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
    doc.save(`RMTreceipt-${receipt._id}.pdf`);
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
