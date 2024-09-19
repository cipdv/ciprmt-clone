// import UpcomingAppointments from "@/components/patients/UpcomingAppointments";
// import LatestReceipt from "@/components/patients/LatestReceipt";
// import { Suspense } from "react";

// const patientDashboardPage = async () => {
//   return (
//     <section>
//       <Suspense
//         fallback={
//           <div className="flex justify-center h-screen text-2xl mt-20">
//             Loading...
//           </div>
//         }
//       >
//         <LatestReceipt />

//         <UpcomingAppointments />
//       </Suspense>
//     </section>
//   );
// };

// export default patientDashboardPage;

import { Suspense } from "react";
import { getSession, getUsersAppointments } from "@/app/_actions";
import UpcomingAppointments from "@/components/patients/UpcomingAppointments";

export default async function PatientDashboardPage() {
  const currentUser = await getSession();
  const appointments = await getUsersAppointments(currentUser.resultObj._id);

  return (
    <Suspense
      fallback={
        <div className="flex justify-center h-screen text-2xl">Loading...</div>
      }
    >
      <UpcomingAppointments appointments={appointments} />
    </Suspense>
  );
}
