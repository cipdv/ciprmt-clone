import RescheduleMassageForm from "@/components/patients/RescheduleMassageForm";
import { getSession, getDataForReschedulePage } from "@/app/_actions";

export default async function ReschedulePage({ params }) {
  const { id } = await params;

  // Get the current user session
  const session = await getSession();
  const userId = session.resultObj.id;

  // Get all the data needed for the page in one call
  const { currentUser, appointment, rmtLocations } =
    await getDataForReschedulePage(id, userId);

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
