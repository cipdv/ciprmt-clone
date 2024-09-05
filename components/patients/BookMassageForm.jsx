"use client";
import { getRMTSetup } from "@/app/_actions";
import React, { useEffect, useState } from "react";
import { getAvailableAppointments, bookAppointment } from "@/app/_actions";

function BookMassageForm({ rmtSetup }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [appointmentTimes, setAppointmentTimes] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [formData, setFormData] = useState({
    location: "",
    RMTLocationId: "",
    duration: "",
    appointmentTime: "",
    workplace: "",
    appointmentDate: "",
  });

  useEffect(() => {
    console.log("rmtSetup", rmtSetup);
  }, []);

  const handleInputChange = async (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });

    if (name === "location") {
      const selectedSetup = rmtSetup.find(
        (setup) => setup.formattedFormData.address.streetAddress === value
      );
      if (selectedSetup) {
        try {
          const times = await getAvailableAppointments(selectedSetup._id);
          setAppointmentTimes(times);
        } catch (error) {
          console.error("Error fetching appointment times:", error);
        }
      }
    }
  };

  const generateAvailableStartTimes = (appointment, duration) => {
    const availableTimes = [];
    const startTime = new Date(
      Date.UTC(1970, 0, 1, ...appointment.appointmentStartTime.split(":"))
    );
    const endTime = new Date(
      Date.UTC(1970, 0, 1, ...appointment.appointmentEndTime.split(":"))
    );
    const durationMs = duration * 60 * 1000; // Convert duration to milliseconds

    let currentTime = startTime;

    while (currentTime.getTime() + durationMs <= endTime.getTime()) {
      availableTimes.push(currentTime.toISOString().substring(11, 16));
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // Increment by 30 minutes
    }

    return availableTimes;
  };

  const groupAppointmentsByDate = (appointments, duration) => {
    return appointments.reduce((acc, appointment) => {
      const [year, month, day] = appointment.appointmentDate.split("-");
      const date = new Date(Date.UTC(year, month - 1, day))
        .toISOString()
        .split("T")[0]; // Format date as YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = [];
      }
      const availableTimes = generateAvailableStartTimes(appointment, duration);
      acc[date].push(...availableTimes);
      acc[date].sort(); // Sort times in chronological order
      return acc;
    }, {});
  };

  const renderAppointments = () => {
    const groupedAppointments = groupAppointmentsByDate(
      appointmentTimes,
      formData.duration
    );
    const dates = Object.keys(groupedAppointments)
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(currentPage * 5, (currentPage + 1) * 5);

    return (
      <div className="appointments-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {dates.map((date, index) => {
          // Adjust the date by adding one day
          const adjustedDate = new Date(date);
          adjustedDate.setDate(adjustedDate.getDate() + 1);

          return (
            <div
              key={index}
              className="appointments-column bg-white shadow-md rounded-lg p-4"
            >
              <h4 className="text-lg font-semibold mb-2">
                {adjustedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h4>
              <ul className="list-disc list-inside">
                {groupedAppointments[date].map((startTime, idx) => {
                  const isSelected =
                    selectedAppointment &&
                    selectedAppointment.date === date &&
                    selectedAppointment.time === startTime;

                  return (
                    <li
                      key={idx}
                      className={`text-gray-700 cursor-pointer hover:bg-gray-200 p-2 rounded ${
                        isSelected ? "bg-blue-200" : ""
                      }`}
                      onClick={() => {
                        const selectedDate = new Date(date);
                        setSelectedAppointment({
                          date,
                          time: startTime,
                        });
                        setFormData({
                          ...formData,
                          appointmentTime: startTime,
                          appointmentDate: selectedDate
                            .toISOString()
                            .split("T")[0],
                        });
                      }}
                    >
                      {startTime}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (formData.location === "268 Shuter Street") {
        setCurrentStep(2); // Proceed to select duration
      } else if (formData.location === "workplace") {
        setCurrentStep(2.5); // Proceed to workplace selection
      }
    } else if (currentStep === 2.5) {
      // After selecting "workplace", regardless of which specific workplace is chosen, proceed to duration
      setCurrentStep(2); // Proceed to select duration
    } else if (currentStep === 2) {
      // After selecting duration (either from "268 Shuter St" or after workplace selection), proceed to time
      setCurrentStep(3); // Proceed to select time
    } else if (currentStep === 3) {
      // After selecting time, proceed to review appointment
      setCurrentStep(4); // Proceed to review appointment
    }
  };

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   // Here you would typically send the formData to your database
  //   console.log("final", formData);
  // };

  return (
    <form
      action={async () => {
        await bookAppointment({
          location: formData.location,
          duration: formData.duration,
          appointmentTime: formData.appointmentTime,
          workplace: formData.workplace,
          appointmentDate: formData.appointmentDate,
          RMTLocationId: rmtSetup.find(
            (setup) =>
              setup.formattedFormData.address.streetAddress ===
              formData.location
          )._id,
        });
      }}
    >
      {currentStep === 1 && (
        <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Select the location where you would like to book a massage:
                  </h1>
                </div>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                >
                  <option value="" disabled selected>
                    Select a location
                  </option>
                  {rmtSetup.map((setup, index) => (
                    <option
                      key={index}
                      value={
                        setup?.formattedFormData?.address?.locationName
                          ? setup?.formattedFormData?.address?.locationName
                          : setup?.formattedFormData?.address?.streetAddress
                      }
                    >
                      {setup?.formattedFormData?.address?.locationName
                        ? setup?.formattedFormData?.address?.locationName
                        : setup?.formattedFormData?.address?.streetAddress}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn" type="button" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {currentStep === 2.5 && (
        <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">Select your workplace:</h1>
                </div>
                <select
                  name="workplace"
                  value={formData.workplace}
                  onChange={handleInputChange}
                >
                  <option value="workplace1">Workplace 1</option>
                  <option value="workplace2">Workplace 2</option>
                  // Add more workplaces as needed
                </select>
              </div>
              <button
                className="btn mr-3 bg-gray-500 text-white hover:bg-gray-600"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </button>
              <button className="btn" type="button" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {currentStep === 2 && (
        <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    What length of massage session would you like to book?
                  </h1>
                </div>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  {rmtSetup
                    .filter(
                      (setup) =>
                        setup.formattedFormData.address.streetAddress ===
                        formData.location
                    )
                    .flatMap(
                      (setup) => setup.formattedFormData?.massageServices || []
                    )
                    .map((service, index) => (
                      <option key={index} value={service?.duration}>
                        {service?.duration} minute {service?.service} - $
                        {service?.price} {service?.plusHst ? "+HST" : ""}
                      </option>
                    ))}
                </select>
              </div>
              <button
                className="btn mr-3 bg-gray-500 text-white hover:bg-gray-600"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </button>
              <button className="btn" type="button" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {currentStep === 3 && (
        <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Select a date and time for your massage:
                  </h1>
                </div>
                {appointmentTimes.length > 0 && (
                  <div>
                    {renderAppointments()}
                    <div className="pagination-controls">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 0))
                        }
                        disabled={currentPage === 0}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                className="btn mr-3 bg-gray-500 text-white hover:bg-gray-600"
                onClick={() => setCurrentStep(2)}
              >
                Back
              </button>
              <button className="btn" type="button" onClick={nextStep}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {currentStep === 4 && (
        <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Does the following information look correct?
                  </h1>
                </div>
                <p>
                  <strong>Location:</strong> {formData.location}
                </p>
                <p>
                  <strong>Duration:</strong> {formData.duration} minutes
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {(() => {
                    const [year, month, day] = formData.appointmentDate
                      .split("-")
                      .map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {(() => {
                    const [hour, minute] = formData.appointmentTime
                      .split(":")
                      .map(Number);
                    const date = new Date();
                    date.setHours(hour, minute);
                    return date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                  })()}
                </p>
              </div>
              <button className="btn mr-3" type="submit">
                Yes, Book Appointment
              </button>
              <button
                className="btn bg-gray-100 text-white hover:bg-gray-600"
                type="button"
                onClick={() => setCurrentStep(3)}
              >
                No, Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default BookMassageForm;
