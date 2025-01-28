import { Suspense } from "react";
import { getRMTSetup, getSession, getUsersAppointments } from "@/app/_actions";
import UpcomingAppointments from "@/components/patients/UpcomingAppointments";

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  );
}

export default async function PatientDashboardPage() {
  const currentUser = await getSession();
  const appointments = await getUsersAppointments(currentUser.resultObj._id);
  const locations = await getRMTSetup();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <UpcomingAppointments appointments={appointments} locations={locations} />
    </Suspense>
  );
}
