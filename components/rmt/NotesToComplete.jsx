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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Notes to Complete
      </h2>
      {notesToComplete.length === 0 ? (
        <div className="p-8 bg-white rounded-md shadow-sm">
          <p className="text-gray-600 text-center text-lg">
            There are currently no notes to complete.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {notesToComplete.map((appointment) => (
            <div
              key={appointment._id}
              className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => handleAppointmentClick(appointment._id)}
            >
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-800">
                  {appointment.firstName} {appointment.lastName}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{appointment.appointmentDate}</p>
                  <p>{appointment.appointmentBeginsAt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesToComplete;
