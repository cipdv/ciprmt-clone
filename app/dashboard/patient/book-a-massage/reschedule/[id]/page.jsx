// import RescheduleMassageForm from "@/components/patients/RescheduleMassageForm";
// import React from "react";
// import { getSession, getRMTSetup, getAppointmentById } from "@/app/_actions";

// const page = async ({ params }) => {
//   const currentUser = await getSession();

//   const rmtSetup = await getRMTSetup(currentUser.resultObj.rmtId);

//   // Ensure rmtSetup is a plain object
//   const plainRmtSetup = JSON.parse(JSON.stringify(rmtSetup));

//   const appointment = await getAppointmentById(params.id);

//   return (
//     <section>
//       <RescheduleMassageForm
//         rmtSetup={plainRmtSetup}
//         currentAppointment={appointment}
//       />
//     </section>
//   );
// };

import RescheduleMassageForm from "@/components/patients/RescheduleMassageForm";
import React from "react";
import { getSession, getRMTSetup, getAppointmentById } from "@/app/_actions";

export default async function ReschedulePage({ params }) {
  const currentUser = await getSession();
  const rmtSetup = await getRMTSetup(currentUser.resultObj.rmtId);
  const appointment = await getAppointmentById(params.id);

  // Ensure rmtSetup is a plain object
  const plainRmtSetup = JSON.parse(JSON.stringify(rmtSetup));

  return (
    <section className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Reschedule Your Appointment</h1>
      <RescheduleMassageForm
        rmtSetup={plainRmtSetup}
        currentAppointment={appointment}
      />
    </section>
  );
}
