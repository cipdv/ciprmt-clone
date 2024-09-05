"use client";
import React, { useState } from "react";

const AppointmentTimeSetup = ({ workDays }) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [scheduleType, setScheduleType] = useState("fixed");
  const [newAppointment, setNewAppointment] = useState({ start: "", end: "" });
  const [error, setError] = useState("");
  const [appointmentTimes, setAppointmentTimes] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const handleNextDay = (e) => {
    e.preventDefault(); // Prevent form submission
    if (currentDayIndex < workDays.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  const handleSetAppointment = () => {
    const currentDay = daysOfWeek[currentDayIndex];
    if (newAppointment.start && newAppointment.end) {
      setAppointmentTimes({
        ...appointmentTimes,
        [currentDay]: [...appointmentTimes[currentDay], newAppointment],
      });
      setNewAppointment({ start: "", end: "" });
      setError("");
    } else {
      setError("Please fill in both start and end times.");
    }
  };

  const currentDay = daysOfWeek[currentDayIndex];

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 mt-4 mb-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl">
              Do you want your appointment times for {currentDay} to be fixed or
              flexible?
            </h2>
          </div>
          <div>
            <button
              type="button"
              className={`btn ${
                scheduleType === "fixed"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setScheduleType("fixed")}
            >
              Fixed
            </button>
            <button
              type="button"
              className={`btn ml-2 ${
                scheduleType === "flexible"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => setScheduleType("flexible")}
            >
              Flexible
            </button>
          </div>
          {scheduleType === "fixed" ? (
            <div>
              <h1 className="text-2xl">Fixed Schedule Setup</h1>
              <div className="space-y-2">
                {appointmentTimes[currentDay].map((appointment, index) => (
                  <div key={index}>
                    <p>
                      Appointment {index + 1}: {appointment.start} -{" "}
                      {appointment.end}
                    </p>
                  </div>
                ))}
                <label>
                  Start Time:
                  <input
                    type="time"
                    value={newAppointment.start}
                    onChange={(e) =>
                      setNewAppointment({
                        ...newAppointment,
                        start: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  End Time:
                  <input
                    type="time"
                    value={newAppointment.end}
                    onChange={(e) =>
                      setNewAppointment({
                        ...newAppointment,
                        end: e.target.value,
                      })
                    }
                  />
                </label>
                <button onClick={handleSetAppointment}>Set Appointment</button>
              </div>
              {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
          ) : (
            <div>
              <h1 className="text-2xl">Flexible Schedule Setup</h1>
            </div>
          )}
          <button onClick={handleNextDay}>Next Day</button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentTimeSetup;
