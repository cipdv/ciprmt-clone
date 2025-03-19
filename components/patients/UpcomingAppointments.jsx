"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAppointmentStatus, keepAppointment } from "@/app/_actions";
import AppointmentNeedToKnow from "./AppointmentNeedToKnow";
import { CancelAppointmentForm } from "./CancelAppointmentButton";
import AppointmentConsent from "./AppointmentConsentForm";

const formatAppointment = (appointment) => {
  // Handle the new PostgreSQL date format
  const appointmentDate = new Date(appointment.date);

  // Parse the time from appointment_begins_at (format: "HH:MM:SS")
  if (appointment.appointment_begins_at) {
    const [hours, minutes] = appointment.appointment_begins_at
      .split(":")
      .map(Number);

    // Set the time on the date object
    appointmentDate.setHours(hours, minutes, 0);
  }

  const formattedDate = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayHours = appointmentDate.getHours() % 12 || 12;
  const displayMinutes = appointmentDate.getMinutes();
  const ampm = appointmentDate.getHours() >= 12 ? "PM" : "AM";
  const formattedTime = `${displayHours}:${displayMinutes
    .toString()
    .padStart(2, "0")} ${ampm}`;

  return {
    ...appointment,
    formattedDate,
    formattedTime,
    // Add compatibility fields for the rest of the component
    _id: appointment.id,
    appointmentDate: appointment.date,
    appointmentBeginsAt: appointment.appointment_begins_at,
    RMTLocationId: appointment.rmt_location_id,
    consentFormSubmittedAt: appointment.consent_form_submitted_at,
  };
};

const AppointmentItem = ({ appointment, locations }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  console.log(locations);

  const location = locations.find(
    (location) => location.id === appointment.rmt_location_id
  );

  const handleReschedule = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await setAppointmentStatus(appointment.id, "rescheduling");
      if (result.success) {
        router.push(
          `/dashboard/patient/book-a-massage/reschedule/${appointment.id}`
        );
      } else {
        setError("Failed to initiate rescheduling. Please try again.");
      }
    } catch (error) {
      console.error("Error setting appointment to rescheduling:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeepAppointment = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await keepAppointment(appointment.id);
      if (result.success) {
        router.refresh();
      } else {
        setError("Failed to keep appointment. Please try again.");
      }
    } catch (error) {
      console.error("Error keeping appointment:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const appointmentDetailsString = `${appointment.formattedDate} at ${appointment.formattedTime} for ${appointment.duration} minutes`;

  return (
    <div className="mb-6 p-4 border border-gray-600 rounded-lg shadow-sm">
      <h2 className="text-xl mb-2">
        {appointment.formattedDate} at {appointment.formattedTime} for{" "}
        {appointment.duration} minutes.
      </h2>

      {appointment.status === "rescheduling" ? (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4"
          role="alert"
        >
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                You recently tried to reschedule this appointment. Would you
                like to reschedule, keep the appointment, or cancel it?
              </p>
            </div>
          </div>
          <div className="flex flex-wrap space-x-2">
            <button
              className="btn-small"
              onClick={handleReschedule}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Reschedule"}
            </button>
            <button
              className="btn-small"
              onClick={handleKeepAppointment}
              disabled={isProcessing}
            >
              Keep Appointment
            </button>
            <CancelAppointmentForm
              id={appointment.id.toString()}
              appointmentDetails={appointmentDetailsString}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap mt-4">
          <button
            className="btn-small mr-2"
            onClick={handleReschedule}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Reschedule appointment"}
          </button>
          <Link href="/dashboard/patient/book-a-massage">
            <button className="btn-small">Book another appointment</button>
          </Link>
          <CancelAppointmentForm
            id={appointment.id.toString()}
            appointmentDetails={appointmentDetailsString}
          />
        </div>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
      <div className="mt-4">
        {appointment.consent_form_submitted_at ? (
          <></>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Please complete the consent form:
            </h3>
            <AppointmentConsent id={appointment.id} />
          </div>
        )}
      </div>
      <div className="mt-4">
        <AppointmentNeedToKnow location={location} />
      </div>
    </div>
  );
};

const AppointmentList = ({ appointments, locations }) => (
  <div className="space-y-4 flex-grow w-full">
    <h1 className="text-3xl mb-6">
      Your upcoming massage{" "}
      {appointments.length > 1 ? "appointments are" : "appointment is"}{" "}
      scheduled for:
    </h1>
    {appointments.map((appointment) => (
      <div key={appointment.id}>
        <AppointmentItem appointment={appointment} locations={locations} />
      </div>
    ))}
  </div>
);

const NoAppointments = () => (
  <div className="space-y-4 flex-grow w-full">
    <h1 className="text-3xl mb-6">
      You have no upcoming massage appointments scheduled.
    </h1>
    <Link href="/dashboard/patient/book-a-massage">
      <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2">
        Book a massage
      </button>
    </Link>
  </div>
);

export default function UpcomingAppointments({ appointments, locations }) {
  // Filter and sort upcoming appointments using the new PostgreSQL data format
  const upcomingAppointments = appointments
    ? appointments
        .filter((appointment) => {
          // Create a date object from the appointment date and time
          const appointmentDate = new Date(appointment.date);

          if (appointment.appointment_begins_at) {
            const [hours, minutes] = appointment.appointment_begins_at
              .split(":")
              .map(Number);
            appointmentDate.setHours(hours, minutes, 0);
          }

          // Compare with current date
          return appointmentDate >= new Date();
        })
        .sort((a, b) => {
          // Sort by date and time
          const dateA = new Date(a.date);
          if (a.appointment_begins_at) {
            const [hoursA, minutesA] = a.appointment_begins_at
              .split(":")
              .map(Number);
            dateA.setHours(hoursA, minutesA, 0);
          }

          const dateB = new Date(b.date);
          if (b.appointment_begins_at) {
            const [hoursB, minutesB] = b.appointment_begins_at
              .split(":")
              .map(Number);
            dateB.setHours(hoursB, minutesB, 0);
          }

          return dateA - dateB;
        })
        .map(formatAppointment)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <div className="flex flex-col items-start space-y-8">
        {upcomingAppointments.length > 0 ? (
          <>
            <AppointmentList
              appointments={upcomingAppointments}
              locations={locations}
            />
          </>
        ) : (
          <NoAppointments />
        )}
      </div>
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { setAppointmentStatus, keepAppointment } from "@/app/_actions";
// import AppointmentNeedToKnow from "./AppointmentNeedToKnow";
// import { CancelAppointmentForm } from "./CancelAppointmentButton";
// import AppointmentConsent from "./AppointmentConsentForm";

// const formatAppointment = (appointment) => {
//   // Handle the new PostgreSQL date format
//   const appointmentDate = new Date(appointment.date);

//   // Parse the time from appointment_begins_at (format: "HH:MM:SS")
//   const [hours, minutes] = appointment.appointment_begins_at
//     .split(":")
//     .map(Number);

//   // Set the time on the date object
//   appointmentDate.setHours(hours, minutes, 0);

//   const formattedDate = appointmentDate.toLocaleDateString("en-US", {
//     weekday: "long",
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });

//   const displayHours = appointmentDate.getHours() % 12 || 12;
//   const displayMinutes = appointmentDate.getMinutes();
//   const ampm = appointmentDate.getHours() >= 12 ? "PM" : "AM";
//   const formattedTime = `${displayHours}:${displayMinutes
//     .toString()
//     .padStart(2, "0")} ${ampm}`;

//   return {
//     ...appointment,
//     formattedDate,
//     formattedTime,
//     // Add compatibility fields for the rest of the component
//     _id: appointment.id,
//     appointmentDate: appointment.date,
//     appointmentBeginsAt: appointment.appointment_begins_at,
//     RMTLocationId: appointment.rmt_location_id,
//     consentFormSubmittedAt: appointment.consent_form_submitted_at,
//   };
// };

// const AppointmentItem = ({ appointment, locations }) => {
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [error, setError] = useState(null);
//   const router = useRouter();

//   console.log(locations);

//   const location = locations.find(
//     (location) => location.id === appointment.rmt_location_id
//   );

//   const handleReschedule = async () => {
//     setIsProcessing(true);
//     setError(null);
//     try {
//       const result = await setAppointmentStatus(appointment.id, "rescheduling");
//       if (result.success) {
//         router.push(
//           `/dashboard/patient/book-a-massage/reschedule/${appointment.id}`
//         );
//       } else {
//         setError("Failed to initiate rescheduling. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error setting appointment to rescheduling:", error);
//       setError("An error occurred. Please try again.");
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const handleKeepAppointment = async () => {
//     setIsProcessing(true);
//     setError(null);
//     try {
//       const result = await keepAppointment(appointment.id);
//       if (result.success) {
//         router.refresh();
//       } else {
//         setError("Failed to keep appointment. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error keeping appointment:", error);
//       setError("An error occurred. Please try again.");
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const appointmentDetailsString = `${appointment.formattedDate} at ${appointment.formattedTime} for ${appointment.duration} minutes`;

//   return (
//     <div className="mb-6 p-4 border border-gray-600 rounded-lg shadow-sm">
//       <h2 className="text-xl mb-2">
//         {appointment.formattedDate} at {appointment.formattedTime} for{" "}
//         {appointment.duration} minutes.
//       </h2>

//       {appointment.status === "rescheduling" ? (
//         <div
//           className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4"
//           role="alert"
//         >
//           <div className="flex items-center mb-3">
//             <div className="flex-shrink-0">
//               <svg
//                 className="h-5 w-5 text-yellow-500"
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 20 20"
//                 fill="currentColor"
//                 aria-hidden="true"
//               >
//                 <path
//                   fillRule="evenodd"
//                   d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
//                   clipRule="evenodd"
//                 />
//               </svg>
//             </div>
//             <div className="ml-3">
//               <p className="text-sm">
//                 You recently tried to reschedule this appointment. Would you
//                 like to reschedule, keep the appointment, or cancel it?
//               </p>
//             </div>
//           </div>
//           <div className="flex flex-wrap space-x-2">
//             <button
//               className="btn-small"
//               onClick={handleReschedule}
//               disabled={isProcessing}
//             >
//               {isProcessing ? "Processing..." : "Reschedule"}
//             </button>
//             <button
//               className="btn-small"
//               onClick={handleKeepAppointment}
//               disabled={isProcessing}
//             >
//               Keep Appointment
//             </button>
//             <CancelAppointmentForm
//               id={appointment.id.toString()}
//               appointmentDetails={appointmentDetailsString}
//             />
//           </div>
//         </div>
//       ) : (
//         <div className="flex flex-wrap mt-4">
//           <button
//             className="btn-small mr-2"
//             onClick={handleReschedule}
//             disabled={isProcessing}
//           >
//             {isProcessing ? "Processing..." : "Reschedule appointment"}
//           </button>
//           <Link href="/dashboard/patient/book-a-massage">
//             <button className="btn-small">Book another appointment</button>
//           </Link>
//           <CancelAppointmentForm
//             id={appointment.id.toString()}
//             appointmentDetails={appointmentDetailsString}
//           />
//         </div>
//       )}

//       {error && <p className="text-red-500 mt-2">{error}</p>}
//       <div className="mt-4">
//         {appointment.consent_form_submitted_at ? (
//           <></>
//         ) : (
//           <div>
//             <h3 className="text-lg font-semibold mb-4">
//               Please complete the consent form:
//             </h3>
//             <AppointmentConsent id={appointment.id} />
//           </div>
//         )}
//       </div>
//       <div className="mt-4">
//         <AppointmentNeedToKnow location={location} />
//       </div>
//     </div>
//   );
// };

// const AppointmentList = ({ appointments, locations }) => (
//   <div className="space-y-4 flex-grow w-full">
//     <h1 className="text-3xl mb-6">
//       Your upcoming massage{" "}
//       {appointments.length > 1 ? "appointments are" : "appointment is"}{" "}
//       scheduled for:
//     </h1>
//     {appointments.map((appointment) => (
//       <div key={appointment.id}>
//         <AppointmentItem appointment={appointment} locations={locations} />
//       </div>
//     ))}
//   </div>
// );

// const NoAppointments = () => (
//   <div className="space-y-4 flex-grow w-full">
//     <h1 className="text-3xl mb-6">
//       You have no upcoming massage appointments scheduled.
//     </h1>
//     <Link href="/dashboard/patient/book-a-massage">
//       <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2">
//         Book a massage
//       </button>
//     </Link>
//   </div>
// );

// export default function UpcomingAppointments({ appointments, locations }) {
//   // Filter and sort upcoming appointments using the new PostgreSQL data format
//   const upcomingAppointments = appointments
//     ? appointments
//         .filter((appointment) => {
//           // Create a date object from the appointment date and time
//           const appointmentDate = new Date(appointment.date);
//           const [hours, minutes] = appointment.appointment_begins_at
//             .split(":")
//             .map(Number);
//           appointmentDate.setHours(hours, minutes, 0);

//           // Compare with current date
//           return appointmentDate >= new Date();
//         })
//         .sort((a, b) => {
//           // Sort by date and time
//           const dateA = new Date(a.date);
//           const [hoursA, minutesA] = a.appointment_begins_at
//             .split(":")
//             .map(Number);
//           dateA.setHours(hoursA, minutesA, 0);

//           const dateB = new Date(b.date);
//           const [hoursB, minutesB] = b.appointment_begins_at
//             .split(":")
//             .map(Number);
//           dateB.setHours(hoursB, minutesB, 0);

//           return dateA - dateB;
//         })
//         .map(formatAppointment)
//     : [];

//   return (
//     <div className="mx-auto max-w-4xl px-4 py-14">
//       <div className="flex flex-col items-start space-y-8">
//         {upcomingAppointments.length > 0 ? (
//           <>
//             <AppointmentList
//               appointments={upcomingAppointments}
//               locations={locations}
//             />
//           </>
//         ) : (
//           <NoAppointments />
//         )}
//       </div>
//     </div>
//   );
// }
