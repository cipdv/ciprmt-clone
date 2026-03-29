"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRMTAppointmentForReschedule,
  rescheduleAppointmentByRMT,
} from "@/app/_actions";

const RMTRescheduleAppointmentPage = ({ params }) => {
  const router = useRouter();
  const [appointmentId, setAppointmentId] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setAppointmentId(resolved.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!appointmentId) return;

    const fetchAppointment = async () => {
      setLoading(true);
      const result = await getRMTAppointmentForReschedule(appointmentId);
      if (!result.success) {
        setStatusMessage({
          type: "error",
          text: result.message || "Failed to load appointment",
        });
        setLoading(false);
        return;
      }

      const data = result.appointment;
      setAppointment(data);

      const initialDate = data.appointmentDate
        ? new Date(data.appointmentDate).toISOString().split("T")[0]
        : "";
      const initialTime = data.appointmentBeginsAt
        ? data.appointmentBeginsAt.slice(0, 5)
        : "";

      setDate(initialDate);
      setTime(initialTime);
      setDuration(Number(data.duration) || 60);
      setLoading(false);
    };

    fetchAppointment();
  }, [appointmentId]);

  const formatDate = (value) => {
    if (!value) return "Not specified";
    return new Date(value).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "Not specified";
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!appointmentId) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await rescheduleAppointmentByRMT(appointmentId, {
      date,
      time,
      duration,
    });

    if (!result.success) {
      setStatusMessage({
        type: "error",
        text: result.message || "Failed to reschedule appointment.",
      });
      setIsSubmitting(false);
      return;
    }

    setStatusMessage({
      type: "success",
      text: result.message || "Appointment rescheduled successfully.",
    });
    setIsSubmitting(false);

    setTimeout(() => {
      router.push("/dashboard/rmt");
    }, 1000);
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-6">Loading appointment...</div>;
  }

  return (
    <section className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-4">Reschedule Appointment</h1>

        {appointment ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <p>
              <span className="font-semibold">Client:</span>{" "}
              {appointment.clientFirstName} {appointment.clientLastName}
            </p>
            <p>
              <span className="font-semibold">Status:</span> {appointment.status}
            </p>
            <p>
              <span className="font-semibold">Current Date:</span>{" "}
              {formatDate(appointment.appointmentDate)}
            </p>
            <p>
              <span className="font-semibold">Current Time:</span>{" "}
              {formatTime(appointment.appointmentBeginsAt)} -{" "}
              {formatTime(appointment.appointmentEndsAt)}
            </p>
            <p>
              <span className="font-semibold">Duration:</span>{" "}
              {appointment.duration || "Not specified"} minutes
            </p>
            <p>
              <span className="font-semibold">Location:</span>{" "}
              {appointment.location || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Workplace:</span>{" "}
              {appointment.workplace || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Email:</span>{" "}
              {appointment.clientEmail || "Not specified"}
            </p>
            <p>
              <span className="font-semibold">Phone:</span>{" "}
              {appointment.clientPhoneNumber || "Not specified"}
            </p>
          </div>
        ) : (
          <p className="text-red-600">Appointment not found.</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Choose New Date and Time</h2>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Time
            </label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700"
            >
              Duration (minutes)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={60}>60</option>
              <option value={75}>75</option>
              <option value={90}>90</option>
            </select>
          </div>

          {statusMessage && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                statusMessage.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Rescheduling..." : "Reschedule Appointment"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default RMTRescheduleAppointmentPage;
