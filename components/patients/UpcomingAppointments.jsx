import React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { getSession, getUsersAppointments } from "@/app/_actions";
import AppointmentNeedToKnow from "./AppointmentNeedToKnow";
import { CancelAppointmentForm } from "./CancelAppointmentButton";

// Helper function to format date and time
const formatAppointment = (appointment) => {
  const appointmentDate = new Date(
    `${appointment.appointmentDate}T${appointment.appointmentBeginsAt}`
  );
  const formattedDate = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hours = appointmentDate.getHours() % 12 || 12;
  const minutes = appointmentDate.getMinutes();
  const ampm = appointmentDate.getHours() >= 12 ? "PM" : "AM";
  const formattedTime = `${hours}:${minutes
    .toString()
    .padStart(2, "0")} ${ampm}`;

  return { ...appointment, formattedDate, formattedTime };
};

// Component for a single appointment
const AppointmentItem = ({ appointment }) => (
  <div className="mb-6">
    <h2 className="text-xl mb-2">
      {appointment.formattedDate} at {appointment.formattedTime} for{" "}
      {appointment.duration} minutes.
    </h2>
    <div className="space-x-3">
      <CancelAppointmentForm id={appointment._id.toString()} />
      <button className="btn-small">Reschedule appointment</button>
      <button className="btn-small">Add to calendar</button>
      <Link href="/dashboard/patient/book-a-massage">
        <button className="btn-small">Book another appointment</button>
      </Link>
    </div>
  </div>
);

// Component for the list of appointments
const AppointmentList = ({ appointments }) => (
  <div className="space-y-4 flex-grow w-1/2">
    <h1 className="text-3xl mb-6">
      Your upcoming massage{" "}
      {appointments.length > 1 ? "appointments are" : "appointment is"}{" "}
      scheduled for:
    </h1>
    {appointments.map((appointment, index) => (
      <AppointmentItem key={appointment._id} appointment={appointment} />
    ))}
  </div>
);

// Component for when there are no appointments
const NoAppointments = () => (
  <div className="space-y-4 flex-grow w-1/2">
    <h1 className="text-3xl mb-6">
      You have no upcoming massage appointments scheduled.
    </h1>
    <Link href="/dashboard/patient/book-a-massage">
      <button className="btn">Book a massage</button>
    </Link>
  </div>
);

export default async function UpcomingAppointments() {
  const currentUser = await getSession();
  const appointments = await getUsersAppointments(currentUser.resultObj._id);

  const today = new Date();
  const upcomingAppointments = appointments
    ?.filter(
      (appointment) =>
        new Date(
          `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
        ) >= today
    )
    .sort(
      (a, b) =>
        new Date(`${a.appointmentDate}T${a.appointmentStartTime}`) -
        new Date(`${b.appointmentDate}T${b.appointmentStartTime}`)
    )
    .map(formatAppointment);

  return (
    <div className="mx-auto max-w-4xl px-4 py-28">
      <Suspense
        fallback={
          <div className="flex justify-center h-screen text-2xl">
            Loading...
          </div>
        }
      >
        <div className="flex items-start space-x-8">
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <>
              <AppointmentList appointments={upcomingAppointments} />
              <div className="w-1/2">
                <AppointmentNeedToKnow />
              </div>
            </>
          ) : (
            <NoAppointments />
          )}
        </div>
      </Suspense>
    </div>
  );
}

// import React from "react";
// import Link from "next/link";
// import { Suspense } from "react";
// import { getSession, getUsersAppointments } from "@/app/_actions";
// import AppointmentNeedToKnow from "./AppointmentNeedToKnow";
// import { CancelAppointmentForm } from "./CancelAppointmentButton";

// const UpcomingAppointments = async () => {
//   const currentUser = await getSession();

//   const appointments = await getUsersAppointments(currentUser.resultObj._id);

//   const today = new Date();

//   // Filter appointments to get all entries where appointmentDate is greater than or equal to today's date
//   const upcomingAppointments = appointments?.filter((appointment) => {
//     const appointmentDate = new Date(
//       `${appointment?.appointmentDate}T${appointment?.appointmentStartTime}`
//     );
//     return appointmentDate >= today;
//   });

//   // Sort the filtered appointments by appointmentDate
//   upcomingAppointments?.sort((a, b) => {
//     const dateA = new Date(`${a?.appointmentDate}T${a?.appointmentStartTime}`);
//     const dateB = new Date(`${b?.appointmentDate}T${b?.appointmentStartTime}`);
//     return dateA - dateB;
//   });

//   // Format the date and time for each upcoming appointment
//   const formattedAppointments = upcomingAppointments?.map((appointment) => {
//     const appointmentDate = new Date(
//       `${appointment?.appointmentDate}T${appointment?.appointmentBeginsAt}`
//     );

//     const options = {
//       weekday: "long",
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     };
//     const formattedDate = appointmentDate?.toLocaleDateString("en-US", options);

//     let hours = appointmentDate?.getHours();
//     const minutes = appointmentDate?.getMinutes();
//     const ampm = hours >= 12 ? "PM" : "AM";
//     hours = hours % 12;
//     hours = hours ? hours : 12; // the hour '0' should be '12'
//     const formattedTime = `${hours}:${
//       minutes < 10 ? "0" + minutes : minutes
//     } ${ampm}`;

//     return {
//       ...appointment,
//       formattedDate,
//       formattedTime,
//     };
//   });

//   return (
//     <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
//       <Suspense
//         fallback={
//           <div className="flex justify-center h-screen text-2xl mt-20">
//             Loading...
//           </div>
//         }
//       >
//         <div>
//           <div className="space-y-5">
//             {formattedAppointments?.length > 0 ? (
//               <div className="flex items-start space-x-8">
//                 <div className="space-y-2 flex-grow w-1/2">
//                   <div className="mb-4">
//                     <h1 className="text-3xl">
//                       Your upcoming massage{" "}
//                       {formattedAppointments?.length > 1
//                         ? "appointments are"
//                         : "appointment is"}{" "}
//                       scheduled for:
//                     </h1>
//                   </div>
//                   {formattedAppointments.map((appointment, index) => (
//                     <div key={index}>
//                       <h2 key={index} className="text-xl">
//                         {appointment.formattedDate} at{" "}
//                         {appointment.formattedTime} for {appointment.duration}{" "}
//                         minutes.
//                       </h2>

//                       <div className="mt-4">
//                         <CancelAppointmentForm
//                           id={appointment._id.toString()}
//                         />
//                         <button className="btn-small mt-3 mr-3">
//                           Reschedule appointment
//                         </button>
//                         <button className="btn-small mt-3 mr-3">
//                           Add to calendar
//                         </button>
//                         <button className="btn-small mt-3 mr-3">
//                           Book another appointment
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 <div className="w-1/2">
//                   <AppointmentNeedToKnow />
//                 </div>
//               </div>
//             ) : (
//               <div className="flex items-start space-x-8">
//                 <div className="space-y-2 flex-grow w-1/2">
//                   <div className="mb-4">
//                     <h1 className="text-3xl">
//                       You have no upcoming massage appointments scheduled.
//                     </h1>
//                     <Link href="/dashboard/patient/book-a-massage">
//                       <button className="btn mt-4">Book a massage</button>
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </Suspense>
//     </div>
//   );
// };

// export default UpcomingAppointments;
