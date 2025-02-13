"use client";
import React, { useState, useEffect } from "react";
import {
  addAppointments,
  sendAppointmentReminders,
  addCanBookAtIdsToUser,
  addCanBookAtIdsToAll,
  getMostRecentAppointments,
  emailBeenAWhile,
  sendValentinesDayEmail,
} from "@/app/_actions";

const TestPage = () => {
  const [results, setResults] = useState(null);
  const [mostRecentAppointments, setMostRecentAppointments] = useState([]);

  const handleEmailBeenAWhile = async () => {
    const result = await emailBeenAWhile();
    setResults(result);
  };

  const handlesendValentinesDayEmail = async () => {
    const result = await sendValentinesDayEmail();
    setResults(result);
  };

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
      <div>
        <h2>Most Recent Appointments</h2>
        <ul>
          {mostRecentAppointments.map((appointment) => (
            <li key={appointment._id}>
              {appointment.firstName} {appointment.lastName} -{" "}
              {new Date(appointment.date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <button className="btn" onClick={handlesendValentinesDayEmail}>
          Call: Send Valentines Day Email
        </button>
      </div>
      <div>
        <button className="btn" onClick={handleEmailBeenAWhile}>
          Call: Email Been A While
        </button>
      </div>
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
