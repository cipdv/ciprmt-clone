"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAppointmentStatus } from "@/app/_actions";
import AppointmentNeedToKnow from "./AppointmentNeedToKnow";
import { CancelAppointmentForm } from "./CancelAppointmentButton";
import AppointmentConsent from "./AppointmentConsentForm";

// Helper function to format date and time
const formatAppointment = (appointment) => {
  const appointmentDate = new Date(
    `${appointment.appointmentDate}T${appointment.appointmentBeginsAt}`
  );
  const formattedDate = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hours = appointmentDate.getHours() % 12 || 12;
  const minutes = appointmentDate.getMinutes();
  const ampm = appointmentDate.getHours() >= 12 ? "PM" : "AM";
  const formattedTime = `${hours}:${minutes
    .toString()
    .padStart(2, "0")} ${ampm}`;

  return { ...appointment, formattedDate, formattedTime };
};

// Component for a single appointment
const AppointmentItem = ({ appointment }) => {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleReschedule = async () => {
    setIsRescheduling(true);
    setError(null);
    try {
      const result = await setAppointmentStatus(
        appointment._id,
        "rescheduling"
      );
      if (result.success) {
        router.push(
          `/dashboard/patient/book-a-massage/reschedule/${appointment._id}`
        );
      } else {
        setError("Failed to initiate rescheduling. Please try again.");
      }
    } catch (error) {
      console.error("Error setting appointment to rescheduling:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const appointmentDetailsString = `${appointment.formattedDate} at ${appointment.formattedTime} for ${appointment.duration} minutes`;

  return (
    <div className="mb-6 p-4 border border-gray-600 rounded-lg shadow-sm">
      <h2 className="text-xl mb-2">
        {appointment.formattedDate} at {appointment.formattedTime} for{" "}
        {appointment.duration} minutes.
      </h2>

      <div className="flex flex-wrap mt-4">
        <button
          className="btn-small mr-2"
          onClick={handleReschedule}
          disabled={isRescheduling}
        >
          {isRescheduling ? "Processing..." : "Reschedule appointment"}
        </button>
        <Link href="/dashboard/patient/book-a-massage">
          <button className="btn-small">Book another appointment</button>
        </Link>
        <CancelAppointmentForm
          id={appointment._id.toString()}
          appointmentDetails={appointmentDetailsString}
        />
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <div className="mt-4">
        {appointment.consentFormSubmittedAt ? (
          <></>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Please complete the consent form:
            </h3>
            <AppointmentConsent id={appointment._id} />
          </div>
        )}
      </div>
    </div>
  );
};
// Component for the list of appointments
const AppointmentList = ({ appointments }) => (
  <div className="space-y-4 flex-grow w-full">
    <h1 className="text-3xl mb-6">
      Your upcoming massage{" "}
      {appointments.length > 1 ? "appointments are" : "appointment is"}{" "}
      scheduled for:
    </h1>
    {appointments.map((appointment, index) => (
      <AppointmentItem key={appointment._id} appointment={appointment} />
    ))}
  </div>
);

// Component for when there are no appointments
const NoAppointments = () => (
  <div className="space-y-4 flex-grow w-full">
    <h1 className="text-3xl mb-6">
      You have no upcoming massage appointments scheduled.
    </h1>
    <Link href="/dashboard/patient/book-a-massage">
      <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2">
        Book a massage
      </button>
    </Link>
  </div>
);

export default function UpcomingAppointments({ appointments }) {
  const upcomingAppointments = appointments
    ? appointments
        .filter(
          (appointment) =>
            new Date(
              `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
            ) >= new Date()
        )
        .sort(
          (a, b) =>
            new Date(`${a.appointmentDate}T${a.appointmentStartTime}`) -
            new Date(`${b.appointmentDate}T${b.appointmentStartTime}`)
        )
        .map(formatAppointment)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <div className="flex flex-col items-start space-y-8">
        {upcomingAppointments.length > 0 ? (
          <>
            <AppointmentList appointments={upcomingAppointments} />
            <div className="w-full">
              <AppointmentNeedToKnow />
            </div>
          </>
        ) : (
          <NoAppointments />
        )}
      </div>
    </div>
  );
}
