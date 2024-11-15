"use client";

import React, { useState, useEffect } from "react";
import {
  getAllAvailableAppointments,
  rescheduleAppointment,
} from "@/app/_actions";
import { useRouter } from "next/navigation";

export default function RescheduleMassageForm({
  rmtSetup,
  currentAppointment,
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [appointmentTimes, setAppointmentTimes] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location: currentAppointment.location,
    RMTLocationId: currentAppointment.RMTLocationId,
    duration: currentAppointment.duration,
    appointmentTime: "",
    workplace: currentAppointment.workplace || "",
    appointmentDate: "",
  });

  useEffect(() => {
    const fetchAppointments = async () => {
      if (formData.RMTLocationId && formData.duration) {
        setLoading(true);
        setError(null);
        try {
          const times = await getAllAvailableAppointments(
            formData.RMTLocationId,
            parseInt(formData.duration),
            currentAppointment.googleCalendarEventId
          );

          const sortedTimes = times.sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );

          const groupedTimes = sortedTimes.reduce((acc, appointment) => {
            const { date, startTime, endTime } = appointment;
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push({ startTime, endTime });
            return acc;
          }, {});

          const groupedAppointments = Object.entries(groupedTimes).map(
            ([date, times]) => {
              const formattedDate = new Date(
                `${date}T00:00:00`
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              times.sort((a, b) => a.startTime.localeCompare(b.startTime));

              const formattedTimes = times.map(({ startTime, endTime }) => {
                const start = new Date(`${date}T${startTime}`);
                const end = new Date(`${date}T${endTime}`);
                return `${start.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })} - ${end.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })}`;
              });

              return {
                date: formattedDate,
                times: formattedTimes,
              };
            }
          );

          setAppointmentTimes(groupedAppointments);
        } catch (error) {
          console.error("Error fetching appointment times:", error);
          setError("Failed to fetch appointment times. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    };

    if (currentStep === 3) {
      fetchAppointments();
    }
  }, [
    formData.RMTLocationId,
    formData.duration,
    currentStep,
    currentAppointment.googleCalendarEventId,
  ]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));

    if (name === "location") {
      const selectedSetup = rmtSetup.find(
        (setup) => setup.formattedFormData.address.streetAddress === value
      );
      if (selectedSetup) {
        setFormData((prevData) => ({
          ...prevData,
          RMTLocationId: selectedSetup._id,
        }));
      }
    }
  };

  const renderAppointments = () => {
    if (loading) {
      return <p>Loading available appointments...</p>;
    }

    if (error) {
      return <p className="text-red-500">{error}</p>;
    }

    if (!appointmentTimes || appointmentTimes.length === 0) {
      return (
        <p>
          No available appointments found. Please try a different location or
          duration.
        </p>
      );
    }

    const dates = appointmentTimes.slice(
      currentPage * 5,
      (currentPage + 1) * 5
    );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map((dateGroup, index) => (
          <div key={index} className="bg-white shadow-md rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-2">{dateGroup.date}</h4>
            <ul className="space-y-2">
              {dateGroup.times.map((time, idx) => {
                const isSelected =
                  selectedAppointment &&
                  selectedAppointment.date === dateGroup.date &&
                  selectedAppointment.time === time;

                return (
                  <li
                    key={idx}
                    className={`cursor-pointer p-2 rounded transition-colors ${
                      isSelected
                        ? "bg-blue-200 text-blue-800"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => {
                      setSelectedAppointment({
                        date: dateGroup.date,
                        time,
                      });
                      setFormData({
                        ...formData,
                        appointmentTime: time,
                        appointmentDate: dateGroup.date,
                      });
                    }}
                  >
                    {time}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const nextStep = () => {
    setCurrentStep((prevStep) => prevStep + 1);
  };

  const prevStep = () => {
    setCurrentStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await rescheduleAppointment(currentAppointment._id, {
        location: formData.location,
        duration: formData.duration,
        appointmentTime: formData.appointmentTime,
        workplace: formData.workplace,
        appointmentDate: formData.appointmentDate,
        RMTLocationId: formData.RMTLocationId,
      });
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      setError(
        "An error occurred while rescheduling the appointment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto px-4 py-8 space-y-8"
    >
      <h1 className="text-2xl sm:text-3xl mb-4">Reschedule Your Appointment</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Current Appointment Details
        </h2>
        <p>
          <strong>Date:</strong>{" "}
          {new Date(
            `${currentAppointment.appointmentDate}T00:00:00`
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </p>
        <p>
          <strong>Time:</strong>{" "}
          {formatTime(currentAppointment.appointmentBeginsAt)}
        </p>
        <p>
          <strong>Duration:</strong> {currentAppointment.duration} minutes
        </p>
        <p>
          <strong>Location:</strong> {currentAppointment.location}
        </p>
      </div>

      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl">
            Select the location for your rescheduled massage:
          </h2>
          <select
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="" disabled>
              Select a location
            </option>
            {rmtSetup.map((setup, index) => (
              <option
                key={index}
                value={setup.formattedFormData.address.streetAddress}
              >
                {setup.formattedFormData.address.locationName ||
                  setup.formattedFormData.address.streetAddress}
              </option>
            ))}
          </select>
          <button
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            type="button"
            onClick={nextStep}
            disabled={!formData.location}
          >
            Next
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl">
            What length of massage session would you like to book?
          </h2>
          <select
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="" disabled>
              Select a service
            </option>
            {rmtSetup
              .find(
                (setup) =>
                  setup.formattedFormData.address.streetAddress ===
                  formData.location
              )
              ?.formattedFormData?.massageServices.map((service, index) => (
                <option key={index} value={service.duration}>
                  {service.duration} minute {service.service} - ${service.price}{" "}
                  {service.plusHst ? "+HST" : ""}
                </option>
              ))}
          </select>
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              type="button"
              onClick={prevStep}
            >
              Back
            </button>
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
              type="button"
              onClick={nextStep}
              disabled={!formData.duration}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl">
            Select a new date and time for your massage:
          </h2>
          {renderAppointments()}
          {appointmentTimes.length > 0 && (
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={(currentPage + 1) * 5 >= appointmentTimes.length}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              type="button"
              onClick={prevStep}
            >
              Back
            </button>
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
              type="button"
              onClick={nextStep}
              disabled={!selectedAppointment}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl">
            Does the following information look correct for your rescheduled
            appointment?
          </h2>
          <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
            <p>
              <strong>Location:</strong> {formData.location}
            </p>
            <p>
              <strong>Duration:</strong> {formData.duration} minutes
            </p>
            <p>
              <strong>Date:</strong> {formData.appointmentDate}
            </p>
            <p>
              <strong>Time:</strong> {formData.appointmentTime}
            </p>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 disabled:opacity-50"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Rescheduling...
                </>
              ) : (
                "Yes, Reschedule Appointment"
              )}
            </button>
            <button
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              type="button"
              onClick={prevStep}
              disabled={isSubmitting}
            >
              No, Go Back
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
