import AppointmentRequests from "@/components/rmt/AppointmentRequests";
import Calendar from "@/components/rmt/Calendar/Calendar";
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

export default async function Dashboard() {
  const currentUser = await getSession();

  console.log(currentUser);

  const appointments = await getAllAppointmentsByRMTId(
    currentUser.resultObj._id
  );

  const messages = await getAllMessagesByRMTId(currentUser.resultObj._id);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <section className="space-y-8">
        <AppointmentRequests appointments={appointments} />
        <Messages messages={messages} />
        <DashboardSection title="Calendar" />
        <NotesToComplete />
        <DashboardSection title="Add an expense" />

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

function DashboardSection({ title }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="flex  gap-4 mb-4">
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
          <br />
          Hi I want to book an appointment but I don't know how.
        </div>
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
        </div>
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
        </div>
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
        </div>
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
        </div>
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
        </div>
        <div className="w-36 h-36 bg-white shadow-md rounded-md p-2 text-sm">
          From: Cip
          <br />
          Date: 2021-10-24
        </div>
      </div>
      <div className="border-b border-gray-200"></div>
    </div>
  );
}
