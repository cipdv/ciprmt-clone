import AppointmentRequests from "@/components/rmt/AppointmentRequests";
import Calendar from "@/components/rmt/Calendar";
import NotesToComplete from "@/components/rmt/NotesToComplete";
import SearchBar from "@/components/rmt/SearchBar";
import SetUpForm2 from "@/components/rmt/SetUp/SetUpForm2";
import Messages from "@/components/rmt/Messages";
import React from "react";

import {
  getSession,
  getAllAppointmentsByRMTId,
  getAllMessagesByRMTId,
} from "@/app/_actions";
import AddExpense from "@/components/rmt/AddExpense";

export default async function Dashboard() {
  const currentUser = await getSession();

  const appointments = await getAllAppointmentsByRMTId(
    currentUser.resultObj._id
  );

  const messages = await getAllMessagesByRMTId(currentUser.resultObj._id);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <section className="space-y-8">
        <AppointmentRequests appointments={appointments} />
        <Messages messages={messages} />
        <Calendar appointments={appointments} />
        <NotesToComplete appointments={appointments} />
        <AddExpense />
        <SearchBar />
        <div className="pt-8">
          <SetUpForm2 />
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
