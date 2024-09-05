"use client";
import React, { useState } from "react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  addMinutes,
  addDays,
} from "date-fns";

const Calendar = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [appointmentStartTime, setAppointmentStartTime] = useState("");
  const [appointmentEndTime, setAppointmentEndTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [activeForm, setActiveForm] = useState("blockTime");

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const startOfCurrentWeek = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    daysOfWeek.push(addDays(startOfCurrentWeek, i));
  }

  const startTimeMonday = new Date();
  startTimeMonday.setHours(11, 0, 0, 0);
  const endTimeMonday = new Date();
  endTimeMonday.setHours(18, 30, 0, 0);

  const startTimeTuesday = new Date();
  startTimeTuesday.setHours(11, 0, 0, 0);
  const endTimeTuesday = new Date();
  endTimeTuesday.setHours(18, 30, 0, 0);

  const startTimeWednesday = new Date();
  startTimeWednesday.setHours(11, 0, 0, 0);
  const endTimeWednesday = new Date();
  endTimeWednesday.setHours(18, 30, 0, 0);

  const startTimeThursday = new Date();
  startTimeThursday.setHours(11, 0, 0, 0);
  const endTimeThursday = new Date();
  endTimeThursday.setHours(18, 30, 0, 0);

  const startTimeFriday = new Date();
  startTimeFriday.setHours(11, 0, 0, 0);
  const endTimeFriday = new Date();
  endTimeFriday.setHours(18, 30, 0, 0);

  const startTimeSaturday = new Date();
  startTimeSaturday.setHours(0, 0, 0, 0); // Closed on Saturday
  const endTimeSaturday = new Date();
  endTimeSaturday.setHours(0, 0, 0, 0); // Closed on Saturday

  const startTimeSunday = new Date();
  startTimeSunday.setHours(0, 0, 0, 0); // Closed on Sunday
  const endTimeSunday = new Date();
  endTimeSunday.setHours(0, 0, 0, 0); // Closed on Sunday

  const generateTimes = (startTime, endTime, blockedTimes) => {
    const times = [];
    if (!startTime || !endTime || startTime.getTime() === endTime.getTime()) {
      return ["Not available"];
    }
    let currentTime = new Date(startTime);
    while (currentTime <= endTime) {
      const formattedTime = format(currentTime, "h:mm a");
      const isBlocked = blockedTimes.some(
        (blocked) =>
          blocked.day === format(currentTime, "EEEE") &&
          currentTime >= blocked.startTime &&
          currentTime < blocked.endTime
      );
      if (!isBlocked) {
        times.push(formattedTime);
      }
      currentTime = addMinutes(currentTime, 30);
    }
    return times;
  };

  const timesForWeek = [
    generateTimes(startTimeMonday, endTimeMonday, blockedTimes),
    generateTimes(startTimeTuesday, endTimeTuesday, blockedTimes),
    generateTimes(startTimeWednesday, endTimeWednesday, blockedTimes),
    generateTimes(startTimeThursday, endTimeThursday, blockedTimes),
    generateTimes(startTimeFriday, endTimeFriday, blockedTimes),
    generateTimes(startTimeSaturday, endTimeSaturday, blockedTimes),
    generateTimes(startTimeSunday, endTimeSunday, blockedTimes),
  ];

  const handleTimeClick = (day, time) => {
    setSelectedTime({ day, time });
    setModalVisible(true);
  };

  const handleBlockTime = () => {
    const day = selectedTime.day;
    const startTime = new Date(`1970-01-01T${blockStartTime}:00`);
    const endTime = new Date(`1970-01-01T${blockEndTime}:00`);
    console.log(`Blocking time from ${startTime} to ${endTime} on ${day}`);
    setBlockedTimes([...blockedTimes, { day, startTime, endTime }]);
    setModalVisible(false);
    setBlockStartTime("");
    setBlockEndTime("");
  };

  const handleBookAppointment = () => {
    console.log(
      `Booking appointment from ${appointmentStartTime} to ${appointmentEndTime} for ${clientName}`
    );
    setModalVisible(false);
    setAppointmentStartTime("");
    setAppointmentEndTime("");
    setClientName("");
  };

  return (
    <div>
      <h1 className="text-3xl">Calendar</h1>
      <div className="flex justify-between my-4">
        <button onClick={handlePrevWeek} className="btn">
          Previous Week
        </button>
        <span>{`${format(startOfCurrentWeek, "MMM d")} - ${format(
          endOfCurrentWeek,
          "MMM d"
        )}`}</span>
        <button onClick={handleNextWeek} className="btn">
          Next Week
        </button>
      </div>
      <div className="grid grid-cols-7 gap-4">
        {daysOfWeek.map((day, index) => (
          <div key={index} className="p-4 border rounded">
            <div>{format(day, "EEEE, MMM d")}</div>
            <ul>
              {timesForWeek[index].map((time, timeIndex) => (
                <li
                  key={timeIndex}
                  className="cursor-pointer"
                  onClick={() => handleTimeClick(format(day, "EEEE"), time)}
                >
                  {time}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {modalVisible && (
        <div className="modal">
          <div className="modal-content">
            <h2>{`Details for ${selectedTime.day}, ${selectedTime.time}`}</h2>
            <div className="button-group">
              <button
                onClick={() => setActiveForm("blockTime")}
                className="btn"
              >
                Block Time
              </button>
              <button
                onClick={() => setActiveForm("bookAppointment")}
                className="btn"
              >
                Book Appointment
              </button>
              <button onClick={() => setModalVisible(false)} className="btn">
                Close
              </button>
            </div>
            {activeForm === "blockTime" && (
              <form>
                <div>
                  <label>Block Start Time:</label>
                  <input
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label>Block End Time:</label>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                  />
                </div>
                <button type="button" onClick={handleBlockTime} className="btn">
                  Show as Unavailable
                </button>
              </form>
            )}
            {activeForm === "bookAppointment" && (
              <form>
                <div>
                  <label>Appointment Start Time:</label>
                  <input
                    type="time"
                    value={appointmentStartTime}
                    onChange={(e) => setAppointmentStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label>Appointment End Time:</label>
                  <input
                    type="time"
                    value={appointmentEndTime}
                    onChange={(e) => setAppointmentEndTime(e.target.value)}
                  />
                </div>
                <div>
                  <label>Client Name:</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  className="btn"
                >
                  Book Appointment
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .btn {
          margin: 5px;
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn:hover {
          background-color: #0056b3;
        }
        .button-group {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default Calendar;
