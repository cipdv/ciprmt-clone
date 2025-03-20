"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { deleteAppointment, clearAppointment } from "@/app/_actions";
import Link from "next/link";

const Calendar = ({ appointments }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null);
  const appointmentsPerPage = 3;

  // Group appointments by location and manage pagination for each location
  const [paginationState, setPaginationState] = useState({});

  // Ensure appointments is an array and sort by date
  const upcomingAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];

    // Sort appointments by date (nearest first)
    return [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentBeginsAt}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentBeginsAt}`);
      return dateA - dateB;
    });
  }, [appointments]);

  const appointmentsByLocation = useMemo(() => {
    const grouped = upcomingAppointments.reduce((acc, appointment) => {
      const location = appointment.location || "Unknown Location";
      if (!acc[location]) {
        acc[location] = [];
        // Initialize pagination for this location if not already set
        if (!paginationState[location]) {
          setPaginationState((prev) => ({ ...prev, [location]: 1 }));
        }
      }
      acc[location].push(appointment);
      return acc;
    }, {});

    return grouped;
  }, [upcomingAppointments, paginationState]);

  // Function to get areas to avoid
  const getAreasToAvoid = (consentForm) => {
    if (!consentForm || !consentForm.consentAreas) return [];

    const areasToAvoid = [];
    const { consentAreas } = consentForm;

    if (consentAreas.chest === false) areasToAvoid.push("Chest");
    if (consentAreas.glutes === false) areasToAvoid.push("Glutes");
    if (consentAreas.abdomen === false) areasToAvoid.push("Abdomen");
    if (consentAreas.upperInnerThighs === false)
      areasToAvoid.push("Upper Inner Thighs");

    // Add any custom areas to avoid
    if (consentForm.areasToAvoid) {
      const customAreas = consentForm.areasToAvoid
        .split(",")
        .map((area) => area.trim())
        .filter((area) => area.length > 0);
      areasToAvoid.push(...customAreas);
    }

    return areasToAvoid;
  };

  const handleDelete = async (appointmentId) => {
    setLoading(true);
    setError(null);
    try {
      await deleteAppointment(appointmentId);
    } catch (err) {
      setError(err.message || "Failed to delete appointment");
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const handleClear = async (appointmentId) => {
    setLoading(true);
    setError(null);
    try {
      await clearAppointment(appointmentId);
    } catch (err) {
      setError(err.message || "Failed to clear appointment");
    } finally {
      setLoading(false);
      setConfirmClear(null);
    }
  };

  const ConfirmationDialog = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  const paginate = (location, direction) => {
    setPaginationState((prev) => ({
      ...prev,
      [location]: prev[location] + direction,
    }));
  };

  // Format date for display
  const formatAppointmentDate = (appointment) => {
    // Check if we have both date and time
    if (appointment.appointmentDate && appointment.appointmentBeginsAt) {
      try {
        // Create a date object from the appointment date
        const dateObj = new Date(appointment.appointmentDate);

        // Format the date in UTC to avoid timezone issues
        const formattedDate = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC", // Force UTC interpretation
        }).format(dateObj);

        // Format the time separately
        const [hours, minutes] = appointment.appointmentBeginsAt
          .split(":")
          .map(Number);
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        const formattedTime = `${displayHours}:${minutes
          .toString()
          .padStart(2, "0")} ${ampm}`;

        return `${formattedDate} at ${formattedTime}`;
      } catch (e) {
        console.error("Error formatting date:", e);
      }
    }

    // If we can't create a valid date with time, format them separately
    try {
      const dateObj = new Date(appointment.appointmentDate);

      // Format the date in UTC
      const dateStr = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC", // Force UTC interpretation
      }).format(dateObj);

      // Format the time separately if it exists
      if (appointment.appointmentBeginsAt) {
        // Convert 24-hour time format (HH:MM:SS) to display format
        const timeParts = appointment.appointmentBeginsAt.split(":");
        const hours = Number.parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM

        return `${dateStr} at ${displayHours}:${minutes} ${ampm}`;
      }

      return dateStr;
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {Object.keys(appointmentsByLocation).length === 0 ? (
        <div className="p-8 bg-white rounded-md shadow-sm">
          <p className="text-gray-600 text-center text-lg">
            There are currently no upcoming appointments.
          </p>
        </div>
      ) : (
        Object.entries(appointmentsByLocation).map(
          ([location, locationAppointments]) => {
            const currentPage = paginationState[location] || 1;
            const indexOfLastAppointment = currentPage * appointmentsPerPage;
            const indexOfFirstAppointment =
              indexOfLastAppointment - appointmentsPerPage;
            const currentAppointments = locationAppointments.slice(
              indexOfFirstAppointment,
              indexOfLastAppointment
            );

            return (
              <div key={location} className="mb-8">
                <h3 className="text-lg font-semibold mb-4">{location}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg mb-2 text-gray-800">
                          {appointment.firstName} {appointment.lastName}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{formatAppointmentDate(appointment)}</p>
                          <p>Duration: {appointment.duration} minutes</p>
                          {appointment.price && (
                            <p>Price: ${appointment.price}</p>
                          )}
                          {appointment.paymentType && (
                            <p>Payment: {appointment.paymentType}</p>
                          )}
                          {appointment.workplace && (
                            <p>Workplace: {appointment.workplace}</p>
                          )}
                          {appointment.email && (
                            <p>Email: {appointment.email}</p>
                          )}
                        </div>
                      </div>
                      {appointment.consentForm && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2 text-gray-700">
                            Consent Form Details:
                          </h4>
                          {appointment.consentForm.reasonForMassage && (
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">
                                Reason for Massage:
                              </span>{" "}
                              {appointment.consentForm.reasonForMassage}
                            </p>
                          )}
                          {getAreasToAvoid(appointment.consentForm).length >
                            0 && (
                            <div className="mb-2">
                              <span className="font-medium text-sm text-gray-700">
                                Areas to Avoid:
                              </span>
                              <ul className="list-disc list-inside pl-4">
                                {getAreasToAvoid(appointment.consentForm).map(
                                  (area, index) => (
                                    <li
                                      key={index}
                                      className="text-sm text-gray-600"
                                    >
                                      {area}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                          {appointment.consentForm.signature && (
                            <div>
                              <span className="font-medium text-sm text-gray-700">
                                Signature:
                              </span>
                              <div className="mt-2 border border-gray-300 rounded overflow-hidden">
                                <Image
                                  src={
                                    appointment.consentForm.signature ||
                                    "/placeholder.svg" ||
                                    "/placeholder.svg" ||
                                    "/placeholder.svg"
                                  }
                                  alt="Client Signature"
                                  width={300}
                                  height={100}
                                  style={{
                                    width: "100%",
                                    height: "auto",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-4 space-x-2">
                        <button
                          onClick={() => setConfirmDelete(appointment.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmClear(appointment.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
                        >
                          Clear
                        </button>
                        <Link
                          href={`/dashboard/rmt/reschedule-appointment/${appointment.id}`}
                        >
                          <button
                            disabled={loading}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                          >
                            Reschedule
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={() => paginate(location, -1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Showing {indexOfFirstAppointment + 1}-
                    {Math.min(
                      indexOfLastAppointment,
                      locationAppointments.length
                    )}{" "}
                    of {locationAppointments.length}
                  </span>
                  <button
                    onClick={() => paginate(location, 1)}
                    disabled={
                      indexOfLastAppointment >= locationAppointments.length
                    }
                    className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          }
        )
      )}
      {confirmDelete && (
        <ConfirmationDialog
          message="Are you sure you want to delete this appointment?"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmClear && (
        <ConfirmationDialog
          message="Are you sure you want to clear this appointment?"
          onConfirm={() => handleClear(confirmClear)}
          onCancel={() => setConfirmClear(null)}
        />
      )}
    </div>
  );
};

export default Calendar;
