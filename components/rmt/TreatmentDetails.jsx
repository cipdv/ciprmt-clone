"use client";

import { useState } from "react";

const TreatmentDetails = ({ treatment, onSelectTreatment }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(treatment));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    onSelectTreatment(treatment);
  };

  const handleDNS = (e) => {
    e.preventDefault();
    console.log(
      "DNS clicked - add DNS count to user's profile (if 2 or more, user can't book online), set appointment status to DNS, add DNS balance to user's profile"
    );
  };

  // Format the appointment date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div
      className={`border-2 border-black bg-white p-4 cursor-move max-w-sm ${
        isDragging ? "opacity-50" : ""
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
    >
      <div className="space-y-2 mb-3">
        <p className="font-medium">
          Date: {formatDate(treatment.appointmentDate)}
        </p>
        {treatment.duration && (
          <p className="font-medium">Duration: {treatment.duration} minutes</p>
        )}
      </div>

      <button
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
        onClick={handleDNS}
      >
        Did not show
      </button>
    </div>
  );
};

export default TreatmentDetails;

// // components/rmt/TreatmentDetails.jsx
// "use client";

// import { useState } from "react";

// const TreatmentDetails = ({ treatment, onSelectTreatment }) => {
//   const [isDragging, setIsDragging] = useState(false);

//   const handleDragStart = (e) => {
//     e.dataTransfer.setData("text/plain", JSON.stringify(treatment));
//     setIsDragging(true);
//   };

//   const handleDragEnd = () => {
//     setIsDragging(false);
//   };

//   const handleTouchStart = (e) => {
//     e.preventDefault();
//     onSelectTreatment(treatment);
//   };

//   const handleDNS = (e) => {
//     e.preventDefault();
//     console.log(
//       "DNS clicked - add DNS count to user's profile (if 2 or more, user can't book online), set appointment status to DNS, add DNS balance to user's profile"
//     );
//   };

//   // Format the appointment date
//   const formatDate = (dateString) => {
//     try {
//       return new Date(dateString).toLocaleDateString();
//     } catch (e) {
//       return dateString;
//     }
//   };

//   return (
//     <div
//       className={`bg-white shadow-md rounded-lg p-6 cursor-move ${
//         isDragging ? "opacity-50" : ""
//       }`}
//       draggable
//       onDragStart={handleDragStart}
//       onDragEnd={handleDragEnd}
//       onTouchStart={handleTouchStart}
//     >
//       <h2 className="text-2xl font-bold mb-4">Appointment Details</h2>
//       <div className="space-y-2">
//         <p>
//           <span className="font-semibold">Date:</span>{" "}
//           {formatDate(treatment.appointmentDate)}
//         </p>
//         {treatment.duration && (
//           <p>
//             <span className="font-semibold">Duration:</span>{" "}
//             {treatment.duration} minutes
//           </p>
//         )}
//       </div>
//       <div>
//         <button className="btn mt-4" onClick={handleDNS}>
//           DNS
//         </button>
//       </div>
//       <p className="mt-4 text-sm text-gray-500">
//         Tap or drag this card to add treatment notes
//       </p>
//     </div>
//   );
// };

// export default TreatmentDetails;
