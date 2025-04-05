"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAppointmentStatus, keepAppointment } from "@/app/_actions";
import AppointmentNeedToKnow from "./AppointmentNeedToKnow";
import { CancelAppointmentForm } from "./CancelAppointmentButton";
import AppointmentConsent from "./AppointmentConsentForm";

const formatAppointment = (appointment) => {
  // Create a date object that preserves the UTC date
  const utcDate = new Date(appointment.date);

  // Format the date in UTC to avoid timezone conversion
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // Force UTC interpretation
  }).format(utcDate);

  // Parse the time from appointment_begins_at (format: "HH:MM:SS")
  let formattedTime = "";
  if (appointment.appointment_begins_at) {
    const [hours, minutes] = appointment.appointment_begins_at
      .split(":")
      .map(Number);

    // Format the time
    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    formattedTime = `${displayHours}:${minutes
      .toString()
      .padStart(2, "0")} ${ampm}`;
  }

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
  // Filter and sort upcoming appointments
  const upcomingAppointments = appointments
    ? appointments
        .filter((appointment) => {
          if (
            !appointment ||
            !appointment.date ||
            !appointment.appointment_begins_at
          ) {
            return false;
          }

          // Skip completed appointments
          if (appointment.status === "completed") {
            return false;
          }

          try {
            // Get current date and time
            const now = new Date();
            console.log("Current time:", now.toISOString());

            // IMPORTANT: We need to compare the appointment date and time with the current date and time
            // The appointment date is stored as midnight UTC on the appointment day
            // The appointment_begins_at is the local time of the appointment

            // Get the appointment date in UTC
            const appointmentDateUTC = new Date(appointment.date);

            // Extract the date parts (year, month, day) from the UTC date
            // This gives us the correct date regardless of timezone
            const year = appointmentDateUTC.getUTCFullYear();
            const month = appointmentDateUTC.getUTCMonth();
            const day = appointmentDateUTC.getUTCDate();

            // Parse the time from appointment_begins_at
            const [hours, minutes, seconds] = appointment.appointment_begins_at
              .split(":")
              .map(Number);

            // Create a new Date object in UTC with the correct date and time
            // This is the key step - we're creating a date in UTC that represents
            // the local time of the appointment
            const appointmentDateTime = new Date(
              Date.UTC(year, month, day, hours, minutes, seconds || 0)
            );

            console.log(`Appointment ${appointment.id}:`);
            console.log(`- Date from DB: ${appointmentDateUTC.toISOString()}`);
            console.log(`- Time: ${appointment.appointment_begins_at}`);
            console.log(
              `- Combined datetime (UTC): ${appointmentDateTime.toISOString()}`
            );
            console.log(`- Current time (UTC): ${now.toISOString()}`);

            // Compare with current time
            const isInFuture = appointmentDateTime > now;
            console.log(`- Is in future: ${isInFuture}`);

            return isInFuture;
          } catch (error) {
            console.error("Error comparing appointment dates:", error);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            // Sort by date and time
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            // Extract date parts
            const yearA = dateA.getUTCFullYear();
            const monthA = dateA.getUTCMonth();
            const dayA = dateA.getUTCDate();

            const yearB = dateB.getUTCFullYear();
            const monthB = dateB.getUTCMonth();
            const dayB = dateB.getUTCDate();

            // Parse times
            const [hoursA, minutesA] = a.appointment_begins_at
              .split(":")
              .map(Number);
            const [hoursB, minutesB] = b.appointment_begins_at
              .split(":")
              .map(Number);

            // Create comparable date objects
            const dateTimeA = new Date(
              Date.UTC(yearA, monthA, dayA, hoursA, minutesA, 0)
            );
            const dateTimeB = new Date(
              Date.UTC(yearB, monthB, dayB, hoursB, minutesB, 0)
            );

            return dateTimeA - dateTimeB;
          } catch (error) {
            console.error("Error sorting appointments:", error);
            return 0;
          }
        })
        .map(formatAppointment)
    : [];

  // For debugging in production
  console.log("Total appointments:", appointments?.length || 0);
  console.log("Upcoming appointments:", upcomingAppointments.length);

  // Force include all appointments for debugging if none are upcoming
  if (
    upcomingAppointments.length === 0 &&
    appointments &&
    appointments.length > 0
  ) {
    console.log("DEBUG MODE: Forcing display of all appointments");
    const debugAppointments = appointments.map(formatAppointment);

    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <div className="flex flex-col items-start space-y-8">
          <div className="space-y-4 flex-grow w-full">
            <h1 className="text-3xl mb-6">
              DEBUG MODE: All appointments (none were detected as upcoming)
            </h1>
            {debugAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="mb-6 p-4 border border-red-600 rounded-lg shadow-sm"
              >
                <h2 className="text-xl mb-2">
                  {appointment.formattedDate} at {appointment.formattedTime} for{" "}
                  {appointment.duration} minutes.
                </h2>
                <p>Status: {appointment.status}</p>
                <p>Date from DB: {String(appointment.date)}</p>
                <p>Time: {appointment.appointment_begins_at}</p>
                <p>ID: {appointment.id}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
//   // Create a date object that preserves the UTC date
//   const utcDate = new Date(appointment.date);

//   // Format the date in UTC to avoid timezone conversion
//   const formattedDate = new Intl.DateTimeFormat("en-US", {
//     weekday: "long",
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     timeZone: "UTC", // Force UTC interpretation
//   }).format(utcDate);

//   // Parse the time from appointment_begins_at (format: "HH:MM:SS")
//   let formattedTime = "";
//   if (appointment.appointment_begins_at) {
//     const [hours, minutes] = appointment.appointment_begins_at
//       .split(":")
//       .map(Number);

//     // Format the time
//     const displayHours = hours % 12 || 12;
//     const ampm = hours >= 12 ? "PM" : "AM";
//     formattedTime = `${displayHours}:${minutes
//       .toString()
//       .padStart(2, "0")} ${ampm}`;
//   }

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
//           if (!appointment || !appointment.date) {
//             return false;
//           }

//           // Create a date object from the appointment date
//           const appointmentDate = new Date(appointment.date);

//           // Parse the time from appointment_begins_at
//           if (appointment.appointment_begins_at) {
//             const [hours, minutes] = appointment.appointment_begins_at
//               .split(":")
//               .map(Number);

//             // Create a new date object with the appointment date and time in UTC
//             const appointmentDateTime = new Date(appointmentDate);
//             appointmentDateTime.setUTCHours(hours, minutes, 0);

//             // Compare with current date
//             return appointmentDateTime >= new Date();
//           }

//           // If no time specified, just compare the dates
//           return appointmentDate >= new Date();
//         })
//         .sort((a, b) => {
//           // Sort by date and time
//           const dateA = new Date(a.date);
//           const dateB = new Date(b.date);

//           // If times are available, use them for sorting
//           if (a.appointment_begins_at && b.appointment_begins_at) {
//             const [hoursA, minutesA] = a.appointment_begins_at
//               .split(":")
//               .map(Number);
//             const [hoursB, minutesB] = b.appointment_begins_at
//               .split(":")
//               .map(Number);

//             // Create date objects with the times
//             const dateTimeA = new Date(dateA);
//             dateTimeA.setUTCHours(hoursA, minutesA, 0);

//             const dateTimeB = new Date(dateB);
//             dateTimeB.setUTCHours(hoursB, minutesB, 0);

//             return dateTimeA - dateTimeB;
//           }

//           // Otherwise just sort by date
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
