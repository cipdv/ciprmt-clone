import AppointmentRequests from "@/components/rmt/AppointmentRequests";
import Calendar from "@/components/rmt/Calendar";
import NotesToComplete from "@/components/rmt/NotesToComplete";
import SearchBar from "@/components/rmt/SearchBar";
import IncomeTracker from "@/components/rmt/IncomeTracker";
import Messages from "@/components/rmt/Messages";

import {
  getSession,
  getDashboardAppointments,
  getAllMessagesByRMTId,
} from "@/app/_actions";
import AddExpense from "@/components/rmt/AddExpense";
import Link from "next/link";

export default async function Dashboard() {
  const currentUser = await getSession();
  const userId = currentUser.resultObj.id || currentUser.resultObj._id;

  // Fetch all appointment data in one call
  const appointmentData = await getDashboardAppointments(userId);
  const messages = await getAllMessagesByRMTId(userId);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <section className="space-y-8">
        <SearchBar />

        <AppointmentRequests
          requestedAppointments={appointmentData.requested || []}
        />
        <Messages messages={messages} />
        <Calendar appointments={appointmentData.upcoming || []} />
        <NotesToComplete appointments={appointmentData.past || []} />
        <AddExpense />
        <IncomeTracker />
        <div className="pt-8">
          <h2 className="text-xl font-semibold mb-4">Set Up A New Workspace</h2>

          <Link href="/dashboard/rmt/set-up/regular">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 m-2 rounded">
              Regular workplace
            </button>
          </Link>
          <Link href="/dashboard/rmt/set-up/irregular">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Irregular workplace
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
