import AppointmentRequests from "@/components/rmt/AppointmentRequests";
import Calendar from "@/components/rmt/Calendar";
import NotesToComplete from "@/components/rmt/NotesToComplete";
import SearchBar from "@/components/rmt/SearchBar";
import SetUpForm2 from "@/components/rmt/SetUp/SetUpFormRegular";
import Messages from "@/components/rmt/Messages";
import React from "react";

import TemporaryNotes from "@/components/rmt/TemporaryNotes";

import {
  getSession,
  getAllAppointmentsByRMTId,
  getAllMessagesByRMTId,
} from "@/app/_actions";
import AddExpense from "@/components/rmt/AddExpense";
import Link from "next/link";

export default async function Dashboard() {
  const currentUser = await getSession();

  const results = await getAllAppointmentsByRMTId(currentUser.resultObj._id);

  const appointments = results.appointments;

  const messages = await getAllMessagesByRMTId(currentUser.resultObj._id);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <section className="space-y-8">
        <SearchBar />

        <AppointmentRequests appointments={appointments} />
        <Messages messages={messages} />
        <Calendar appointments={appointments} />
        <NotesToComplete appointments={appointments} />
        <AddExpense />
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
        {/* Uncomment these when ready to use
        <SearchBar />
        <NotesToComplete />
        <Calendar /> 
        */}
      </section>
    </div>
  );
}
