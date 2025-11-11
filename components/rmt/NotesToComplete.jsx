"use client";
import { useRouter } from "next/navigation";
import { setDNSTreatmentStatusAttachment } from "@/app/_actions";
import { useState } from "react";

const NotesToComplete = ({ appointments }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter past appointments that don't have treatment notes
  const notesToComplete = appointments.filter(
    (appointment) => !appointment.encryptedTreatmentNotes
  );

  const handleAppointmentClick = (clientId) => {
    router.push(`/dashboard/rmt/client-profile/${clientId}`);
  };

  const handleDNSClick = async (e, id) => {
    e.stopPropagation(); // Prevent the card click from triggering

    try {
      setLoading(true);
      setError(null);
      await setDNSTreatmentStatusAttachment(id);
      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      console.error("Error marking appointment as DNS:", err);
      setError("Failed to mark appointment as DNS");
    } finally {
      setLoading(false);
    }
  };

  const formatAppointmentDate = (date) => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return date; // Return original if invalid

      // Format the date in UTC to avoid timezone issues
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC", // Force UTC interpretation
      }).format(dateObj);
    } catch (e) {
      console.error("Error formatting date:", e);
      return date;
    }
  };

  // Format time for display
  const formatAppointmentTime = (time) => {
    try {
      if (!time) return "";

      const [hours, minutes] = time.split(":");
      const hour = Number.parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (e) {
      console.error("Error formatting time:", e);
      return time;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Notes to Complete</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
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
              key={appointment.id}
              className="bg-yellow-50 shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => handleAppointmentClick(appointment.clientId)}
            >
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-800">
                  {appointment.firstName} {appointment.lastName}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{formatAppointmentDate(appointment.appointmentDate)}</p>
                  <p>
                    {formatAppointmentTime(appointment.appointmentBeginsAt)}
                  </p>
                  <p>Duration: {appointment.duration} minutes</p>
                  {appointment.location && (
                    <p>Location: {appointment.location}</p>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={(e) => handleDNSClick(e, appointment.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
                  >
                    DNS
                  </button>
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
