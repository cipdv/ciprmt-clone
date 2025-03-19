import RescheduleMassageForm from "@/components/patients/RescheduleMassageForm";
import React from "react";
import { getSession, getDataForReschedulePage } from "@/app/_actions";

export default async function ReschedulePage({ params }) {
  // Get the current user session
  const session = await getSession();
  const userId = session.resultObj.id;

  // Get all the data needed for the page in one call
  const { currentUser, appointment, rmtLocations } =
    await getDataForReschedulePage(params.id, userId);

  console.log(currentUser, appointment, rmtLocations);

  return (
    <section className="container mx-auto px-4 py-8">
      <RescheduleMassageForm
        rmtSetup={rmtLocations}
        currentAppointment={appointment}
        user={currentUser}
      />
    </section>
  );
}
