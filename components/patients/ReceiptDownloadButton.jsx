"use client";
import React from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { jsPDF } from "jspdf";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const ReceiptDownloadButton = ({ receipt, user }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add background color
    doc.setFillColor(180, 200, 194); // Light green color
    doc.rect(
      0,
      0,
      doc.internal.pageSize.width,
      doc.internal.pageSize.height,
      "F"
    );

    // Set text color to dark for better contrast
    doc.setTextColor(0, 0, 0);

    // Add content to the PDF
    doc.setFontSize(18);
    doc.text("Cip de Vries, RMT", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.text(
      "268 Shuter St, Toronto, ON, M5A 1W3",
      105,
      30,
      null,
      null,
      "center"
    );
    doc.text("Phone: 416-258-1230", 105, 35, null, null, "center");
    doc.text("Registration Number: U035", 105, 40, null, null, "center");
    doc.text("HST Number: 845 918 200 RT0001", 105, 45, null, null, "center");

    doc.setFontSize(16);
    doc.text("Official Receipt", 105, 60, null, null, "center");

    doc.setFontSize(12);
    doc.text(
      `For Massage Therapy Services provided to: ${user.firstName} ${user.lastName}`,
      105,
      70,
      null,
      null,
      "center"
    );
    doc.text(
      `Date of treatment: ${new Date(
        receipt.appointmentDate
      ).toLocaleDateString()}`,
      105,
      80,
      null,
      null,
      "center"
    );
    doc.text(
      `Time of treatment: ${receipt.appointmentBeginsAt}`,
      105,
      85,
      null,
      null,
      "center"
    );
    doc.text(
      `Treatment duration: ${receipt.duration} minutes`,
      105,
      90,
      null,
      null,
      "center"
    );
    doc.text(
      `Payment received: $${receipt.price} from ${user.firstName} ${user.lastName}`,
      105,
      95,
      null,
      null,
      "center"
    );
    doc.text(`Receipt number: ${receipt._id}`, 105, 100, null, null, "center");

    doc.setFontSize(14);
    doc.text("RMT Signature:", 20, 120);

    // Add a line for the signature
    doc.line(20, 130, 100, 130);

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

// "use client";
// import React from "react";
// import pdfMake from "pdfmake/build/pdfmake";
// import pdfFonts from "pdfmake/build/vfs_fonts";

// pdfMake.vfs = pdfFonts.pdfMake.vfs;

// const ReceiptDownloadButton = ({ receipt }) => {
//   const receiptId = receipt.id;

//   const generatePDF = () => {
//     const documentDefinition = {
//       pageSize: "A4",
//       pageOrientation: "portrait",
//       content: [
//         { text: "Cip de Vries, RMT", style: "header" },
//         {
//           text: "268 Shuter St, Toronto, ON, M5A 1W3",
//           alignment: "center",
//         },
//         { text: "Phone: 416-258-1230", alignment: "center" },
//         { text: "Registration Number: U035", alignment: "center" },
//         { text: "HST Number: 845 918 200 RT0001", alignment: "center" },
//         {
//           text: "Official Receipt",
//           style: "subheader",
//         },
//         {
//           text: `For Massage Therapy Services provided to: ${receipt.firstName} ${receipt.lastName}`,
//           alignment: "center",
//         },
//         { text: `Date of treatment: ${receipt.date}`, alignment: "center" },
//         { text: `Time of treatment: ${receipt.time}`, alignment: "center" },
//         {
//           text: `Treatment duration: ${receipt.duration} minutes`,
//           alignment: "center",
//         },
//         {
//           text: `Payment received: $${receipt.price} from ${receipt.firstName} ${receipt.lastName}`,
//           alignment: "center",
//         },
//         {
//           text: `Duration: ${receipt.duration} minutes`,
//           alignment: "center",
//         },

//         { text: `Receipt number: ${receiptId}`, alignment: "center" },
//         { text: "RMT Signature:", style: "subheader" },
//         {
//           image:
//             "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAhYAAADdCAYAAADn9zuNAAAAAXNSR0IArs4c6QAAIABJREFUeF7tnQn4f09V148simiikUKaYJaaiZDEYoIboCAEilYqqGhiYlAuLAEqJQmooAlhaAYZpkIhioIbiopYKKWylJqpLZJaipFopkQ9L/9z4DTdz+duc+/M3Ps+z/N9fsv33lneM3fm7OftTCQEhIAQEAJCQAgIgUIIvF2hdtSMEBACQkAICAEhIARMjIU2gRAQAkJACAgBIVAMATEWxaBUQ0JACAgBISAEhIAYC+0BISAEhIAQEAJCoBgCYiyKQamGhIAQEAJCQAgIATEW2gNCQAgIASEgBIRAMQTEWBSDUg0JASEgBISAEBACYiy0B4SAEBACQkAICIFiCIixKAalGhICQkAICAEhIATEWGgPCAEhIASEgBAQAsUQEGNRDEo1JASEgBAQAkJACIix0B4QAkJACAgBISAEiiEgxqIYlGpICAgBISAEhIAQEGOhPSAEhIAQEAJCQAgUQ0CMRTEo1ZAQEAJCQAgIASEgxkJ7QAgIASEgBISAECiGgBiLYlCqISEgBISAEBACQkCMhfaAEBACQkAICAEhUAwBMRbFoFRDQkAICAEhIASEgBgL7QEhIASEgBAQAkKgGAJiLIpBqYaEgBAQAkJACAgBMRbaA0JACAgBISAEhEAxBMRYFINSDQkBISAEhIAQEAJiLLQHhIAQEAJCQAgIgWIIiLEoBqUaEgJCQAgIASEgBMRYaA8IASEgBISAEBACxRAQY1EMSjUkBISAEBACQkAIiLHQHhACQkAICAEhIASKISDGohiUakgICAEhIASEgBAQY6E9IASEgBAQAkJACBRDQIxFMSjVkBAQAkJACAgBISDGQntACAgBISAEhIAQKIaAGItiUKohISAEhIAQEAJCQIyF9oAQEAJCQAgIASFQDAExFsWgVENCQAgIASEgBISAGAvtASEgBISAEBACQqAYAmIsikGphoSAEBACQkAICAExFtoDQkAICAEhIASEQDEExFgUg1INCQEhIASEgBAQAmIstAeEgBAQAkJACAiBYgiIsSgGpRoSAkJACAgBISAExFhoDwgBISAEhIAQEALFEBBjUQxKNSQEhIAQEAJCQAiIsdAeEAJCQAgIASEgBIohIMaiGJRqSAgIASEgBISAEBBj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", // Use the actual base64 string
//           width: 150,
//           alignment: "center",
//         },
//       ],
//       background: function (currentPage, pageSize) {
//         return {
//           canvas: [
//             {
//               type: "rect",
//               x: 0,
//               y: 0,
//               w: pageSize.width,
//               h: pageSize.height,
//               color: "#b4c8c2", // Example: Yellow background color
//             },
//           ],
//         };
//       },
//       styles: {
//         header: {
//           fontSize: 18,
//           bold: true,
//           alignment: "center",
//           margin: [0, 0, 0, 20],
//         },
//         subheader: {
//           fontSize: 14,
//           bold: true,
//           margin: [10, 15, 5, 5],
//           alignment: "center", // Ensure subheader is also centered
//         },
//       },
//     };

//     pdfMake.createPdf(documentDefinition).download(`${receiptId}.pdf`);
//   };

//   return <button onClick={generatePDF}>Download Receipt</button>;
// };

// export default ReceiptDownloadButton;
