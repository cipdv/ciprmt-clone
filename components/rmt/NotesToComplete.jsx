"use client";

import React from "react";
import { useRouter } from "next/navigation";

const NotesToComplete = ({ appointments }) => {
  const router = useRouter();
  const currentDate = new Date();
  const notesToComplete = appointments.filter(
    (appointment) =>
      appointment.status === "booked" &&
      new Date(
        `${appointment.appointmentDate}T${appointment.appointmentBeginsAt}`
      ) < currentDate &&
      !appointment.treatmentNotes
  );

  const handleAppointmentClick = (id) => {
    router.push(`/dashboard/rmt/treatments/${id}`);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Notes to Complete</h2>
      {notesToComplete.length === 0 ? (
        <div className="p-8 bg-gray-100 rounded-md">
          <p className="text-gray-600">
            There are currently no notes to complete.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 mb-4 flex-wrap">
          {notesToComplete.map((appointment) => (
            <div
              key={appointment._id}
              className="w-56 bg-white shadow-md rounded-md p-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleAppointmentClick(appointment._id)}
            >
              <div className="mb-2">
                Patient: {appointment.firstName} {appointment.lastName}
                <br />
                Date: {appointment.appointmentDate}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesToComplete;
