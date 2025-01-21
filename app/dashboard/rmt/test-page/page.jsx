"use client";
import React, { useState } from "react";
import {
  addAppointments,
  sendAppointmentReminders,
  addCanBookAtIdsToUser,
  addCanBookAtIdsToAll,
} from "@/app/_actions";

const TestPage = () => {
  const [results, setResults] = useState(null);

  const handleAddAppointments = async () => {
    const result = await addAppointments();
    setResults(result);
  };

  const handleSendAppointmentReminders = async () => {
    const result = await sendAppointmentReminders();
    setResults(result);
  };

  const handleaddCanBookAtIdsToAll = async () => {
    const result = await addCanBookAtIdsToAll();
  };

  return (
    <div className="space-y-4 m-8">
      <h1>Test Page</h1>
      <button className="btn" onClick={handleAddAppointments}>
        Call: Add Appointments
      </button>

      <div>
        <button className="btn" onClick={handleSendAppointmentReminders}>
          Call: Send Appointment Reminders
        </button>
      </div>

      <div>
        <button className="btn" onClick={handleaddCanBookAtIdsToAll}>
          Call: Add Can Book At Ids To All Users
        </button>
      </div>
    </div>
  );
};

export default TestPage;
