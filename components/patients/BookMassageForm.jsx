"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAvailableAppointments, bookAppointment } from "@/app/_actions";

function BookMassageForm({ rmtSetup, user, healthHistory }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [appointmentTimes, setAppointmentTimes] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    location: "",
    RMTLocationId: "",
    duration: "",
    appointmentTime: "",
    workplace: "",
    appointmentDate: "",
  });

  const handleInputChange = async (event) => {
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

  useEffect(() => {
    const fetchAppointments = async () => {
      if (formData.RMTLocationId && formData.duration) {
        setLoading(true);
        setError(null);
        try {
          const times = await getAvailableAppointments(
            formData.RMTLocationId,
            parseInt(formData.duration),
            process.env.NEXT_PUBLIC_TIMEZONE
          );

          // Sort the times array by date and time
          const sortedTimes = times.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.startTime}`);
            const dateB = new Date(`${b.date}T${b.startTime}`);
            return dateA - dateB;
          });

          // Group appointments by date
          const groupedTimes = sortedTimes.reduce((acc, appointment) => {
            const { date, startTime, endTime } = appointment;
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push({ startTime, endTime });
            return acc;
          }, {});

          // Convert grouped times back to array format and format the dates and times
          const groupedAppointments = Object.entries(groupedTimes).map(
            ([date, times]) => {
              const formattedDate = new Date(
                `${date}T00:00:00`
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              const formattedTimes = times
                .map(({ startTime, endTime }) => {
                  const start = new Date(`${date}T${startTime}`);
                  const end = new Date(`${date}T${endTime}`);
                  return {
                    formattedTime: `${start.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })} - ${end.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })}`,
                    startTime,
                    endTime,
                  };
                })
                .sort((a, b) => {
                  const timeA = new Date(`${date}T${a.startTime}`);
                  const timeB = new Date(`${date}T${b.startTime}`);
                  return timeA - timeB;
                });

              return {
                date: date,
                formattedDate: formattedDate,
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

    fetchAppointments();
  }, [formData.RMTLocationId, formData.duration]);

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
      currentPage * 6,
      (currentPage + 1) * 6
    );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map((dateGroup, index) => (
          <div key={index} className="bg-white shadow-md rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-2">
              {dateGroup.formattedDate}
            </h4>
            <ul className="space-y-2">
              {dateGroup.times.map((time, idx) => {
                const isSelected =
                  selectedAppointment &&
                  selectedAppointment.date === dateGroup.date &&
                  selectedAppointment.time === time.formattedTime;

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
                        time: time.formattedTime,
                      });
                      setFormData({
                        ...formData,
                        appointmentTime: time.startTime,
                        appointmentDate: dateGroup.date, // This should already be in YYYY-MM-DD format
                      });
                    }}
                  >
                    {time.formattedTime}
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

  return (
    <form
      action={async () => {
        await bookAppointment({
          location: formData.location,
          duration: formData.duration,
          appointmentTime: formData.appointmentTime,
          workplace: formData.workplace,
          appointmentDate: formData.appointmentDate,
          RMTLocationId: formData.RMTLocationId,
          timezone: process.env.NEXT_PUBLIC_TIMEZONE,
        });
      }}
      className="max-w-4xl mx-auto px-4 py-8 space-y-8"
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl">Select a location:</h1>
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
            Next Step
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl">
            What treatment would you like to book?
          </h1>
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
              Next Step
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl">
            Select a date and time for your appointment:
          </h1>
          {renderAppointments()}
          {appointmentTimes.length > 0 && (
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Previous Dates
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={(currentPage + 1) * 5 >= appointmentTimes.length}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                More Dates
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
              Next Step
            </button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl">
            Does the following information look correct?
          </h1>
          <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
            <p>
              <strong>Location:</strong> {formData.location}
            </p>
            <p>
              <strong>Duration:</strong> {formData.duration} minutes
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(
                `${formData.appointmentDate}T00:00:00`
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "America/Toronto",
              })}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {new Date(
                `${formData.appointmentDate}T${formData.appointmentTime}`
              ).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
                timeZone: "America/Toronto",
              })}
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
              type="submit"
            >
              Yes, Book Appointment
            </button>
            <button
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              type="button"
              onClick={prevStep}
            >
              No, Go Back
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default BookMassageForm;
