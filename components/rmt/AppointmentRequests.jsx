"use client";
import { updateAppointmentStatus } from "@/app/_actions";
import { useFormStatus } from "react-dom";

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full px-3 py-1.5 rounded text-sm font-medium text-white transition-colors duration-200 ${
        pending
          ? "bg-gray-400 cursor-not-allowed"
          : children === "Accept"
          ? "bg-green-500 hover:bg-green-600"
          : "bg-red-500 hover:bg-red-600"
      }`}
    >
      {pending ? "Processing..." : children}
    </button>
  );
}

const AppointmentRequests = ({ requestedAppointments }) => {
  // Function to format date in UTC to avoid timezone issues
  const formatDateInUTC = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  };

  // Function to format time from HH:MM:SS format
  const formatTime = (timeString) => {
    if (!timeString) return "";

    const [hours, minutes] = timeString.split(":").map(Number);
    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Appointment Requests</h2>
      {requestedAppointments.length === 0 ? (
        <div className="p-8 bg-yellow-50 rounded-md shadow-sm">
          <p className="text-gray-600 text-center text-lg">
            There are currently no appointment requests.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {requestedAppointments.map((appointment, index) => (
            <div
              key={appointment.id || `appointment-${index}`}
              className={`shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 ${
                appointment.code
                  ? "bg-red-50 border-2 border-red-300"
                  : "bg-yellow-50"
              }`}
            >
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-800">
                  {appointment.firstName || "N/A"}{" "}
                  {appointment.lastName || "N/A"}
                </h3>
                {appointment.code && (
                  <div className="inline-block bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded mb-2">
                    Gift Card
                  </div>
                )}
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    {appointment.appointmentDate
                      ? formatDateInUTC(appointment.appointmentDate)
                      : "No date specified"}
                    {appointment.appointmentBeginsAt &&
                      ` at ${formatTime(appointment.appointmentBeginsAt)}`}
                  </p>
                  <p>Duration: {appointment.duration} minutes</p>
                  {appointment.email && <p>Email: {appointment.email}</p>}
                  {appointment.phoneNumber && (
                    <p>Phone: {appointment.phoneNumber}</p>
                  )}
                  {appointment.code && (
                    <p className="font-medium text-red-700">
                      Code: {appointment.code}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-4 space-x-2">
                <form action={updateAppointmentStatus} className="flex-1">
                  <input
                    type="hidden"
                    name="appointmentId"
                    value={appointment.id || ""}
                  />
                  <input type="hidden" name="status" value="booked" />
                  <SubmitButton>Accept</SubmitButton>
                </form>
                <form action={updateAppointmentStatus} className="flex-1">
                  <input
                    type="hidden"
                    name="appointmentId"
                    value={appointment.id || ""}
                  />
                  <input type="hidden" name="status" value="available" />
                  <SubmitButton>Deny</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentRequests;

// "use client";
// import { updateAppointmentStatus } from "@/app/_actions";
// import { useFormStatus } from "react-dom";

// function SubmitButton({ children }) {
//   const { pending } = useFormStatus();
//   return (
//     <button
//       type="submit"
//       disabled={pending}
//       className={`w-full px-3 py-1.5 rounded text-sm font-medium text-white transition-colors duration-200 ${
//         pending
//           ? "bg-gray-400 cursor-not-allowed"
//           : children === "Accept"
//           ? "bg-green-500 hover:bg-green-600"
//           : "bg-red-500 hover:bg-red-600"
//       }`}
//     >
//       {pending ? "Processing..." : children}
//     </button>
//   );
// }

// const AppointmentRequests = ({ requestedAppointments }) => {
//   // Function to format date in UTC to avoid timezone issues
//   const formatDateInUTC = (dateString) => {
//     const date = new Date(dateString);
//     return new Intl.DateTimeFormat("en-US", {
//       weekday: "long",
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//       timeZone: "UTC", // Force UTC interpretation
//     }).format(date);
//   };

//   // Function to format time from HH:MM:SS format
//   const formatTime = (timeString) => {
//     if (!timeString) return "";

//     const [hours, minutes] = timeString.split(":").map(Number);
//     const displayHours = hours % 12 || 12;
//     const ampm = hours >= 12 ? "PM" : "AM";
//     return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
//   };

//   return (
//     <div>
//       <h2 className="text-xl font-semibold mb-4">Appointment Requests</h2>
//       {requestedAppointments.length === 0 ? (
//         <div className="p-8 bg-white rounded-md shadow-sm">
//           <p className="text-gray-600 text-center text-lg">
//             There are currently no appointment requests.
//           </p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//           {requestedAppointments.map((appointment, index) => (
//             <div
//               key={appointment.id || `appointment-${index}`}
//               className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
//             >
//               <div className="mb-4">
//                 <h3 className="font-semibold text-lg mb-2 text-gray-800">
//                   {appointment.firstName || "N/A"}{" "}
//                   {appointment.lastName || "N/A"}
//                 </h3>
//                 <div className="space-y-1 text-sm text-gray-600">
//                   <p>
//                     {appointment.appointmentDate
//                       ? formatDateInUTC(appointment.appointmentDate)
//                       : "No date specified"}
//                     {appointment.appointmentBeginsAt &&
//                       ` at ${formatTime(appointment.appointmentBeginsAt)}`}
//                   </p>
//                   {/* <p>for {appointment.duration} minutes</p>
//                   <p>
//                     <span className="font-medium">Reason:</span>{" "}
//                     {appointment?.consentForm?.reasonForMassage || "Unknown"}
//                   </p> */}
//                 </div>
//               </div>
//               <div className="flex justify-between mt-4 space-x-2">
//                 <form action={updateAppointmentStatus} className="flex-1">
//                   <input
//                     type="hidden"
//                     name="appointmentId"
//                     value={appointment.id || ""}
//                   />
//                   <input type="hidden" name="status" value="booked" />
//                   <SubmitButton>Accept</SubmitButton>
//                 </form>
//                 <form action={updateAppointmentStatus} className="flex-1">
//                   <input
//                     type="hidden"
//                     name="appointmentId"
//                     value={appointment.id || ""}
//                   />
//                   <input type="hidden" name="status" value="available" />
//                   <SubmitButton>Deny</SubmitButton>
//                 </form>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default AppointmentRequests;
