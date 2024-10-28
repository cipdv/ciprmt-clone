"use client";

import React from "react";
import { updateAppointmentStatus } from "@/app/_actions";
import { useFormStatus } from "react-dom";

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-2 py-1 rounded text-xs text-white ${
        pending
          ? "bg-gray-400"
          : children === "Accept"
          ? "bg-green-500 hover:bg-green-600"
          : "bg-red-500 hover:bg-red-600"
      }`}
    >
      {pending ? "Processing..." : children}
    </button>
  );
}

const AppointmentRequests = ({ appointments }) => {
  const appointmentRequests = appointments.filter(
    (appointment) => appointment.status === "requested"
  );

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Appointment Requests</h2>
      {appointmentRequests.length === 0 ? (
        <div className="p-8 bg-gray-100 rounded-md">
          <p className="text-gray-600">
            There are currently no appointment requests.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 mb-4 flex-wrap">
          {appointmentRequests.map((appointment) => (
            <div
              key={appointment._id}
              className="w-56 bg-white shadow-md rounded-md p-2 text-sm"
            >
              <div className="mb-2">
                From: {appointment.firstName} {appointment.lastName}
                <br />
                Date: {appointment.appointmentDate}
                <br />
                Time: {appointment.appointmentBeginsAt}
                <br />
                Duration: {appointment.duration} minutes
              </div>
              <div className="flex justify-between mt-2">
                <form action={updateAppointmentStatus}>
                  <input
                    type="hidden"
                    name="appointmentId"
                    value={appointment._id}
                  />
                  <input type="hidden" name="status" value="booked" />
                  <SubmitButton>Accept</SubmitButton>
                </form>
                <form action={updateAppointmentStatus}>
                  <input
                    type="hidden"
                    name="appointmentId"
                    value={appointment._id}
                  />
                  <input type="hidden" name="status" value="available" />
                  <SubmitButton>Deny</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentRequests;
