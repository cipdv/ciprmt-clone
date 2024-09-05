"use client";

import React, { useState } from "react";
import AppointmentTimeSetup from "./AppointmentTimeSetup";

const SetupForm = () => {
  // form states
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    locationName: "",
    streetAddress: "",
    city: "",
    province: "",
    country: "",
    postalCode: "",
  });
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
  });
  const [workplaceType, setWorkplaceType] = useState("regular");

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [scheduleType, setScheduleType] = useState("");
  const [newAppointment, setNewAppointment] = useState({ start: "", end: "" });
  const [error, setError] = useState("");
  const [workDays, setWorkDays] = useState([
    {
      day: "Monday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
    {
      day: "Tuesday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
    {
      day: "Wednesday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
    {
      day: "Thursday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
    {
      day: "Friday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
    {
      day: "Saturday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
    {
      day: "Sunday",
      scheduleType: "",
      appointmentTimes: [],
      isSelected: false,
    },
  ]);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const filteredDaysOfWeek = workDays
    .filter((day) => day.isSelected)
    .map((day) => day.day);

  const currentDay = filteredDaysOfWeek[currentDayIndex];

  //   form functions
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress((prevAddress) => ({
      ...prevAddress,
      [name]: value,
    }));
  };

  const handleContactInfoChange = (e) => {
    const { name, value } = e.target;
    setContactInfo((prevContactInfo) => ({
      ...prevContactInfo,
      [name]: value,
    }));
  };

  const handleNextDay = (e) => {
    e.preventDefault(); // Prevent form submission
    if (currentDayIndex < filteredDaysOfWeek.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
      setError(""); // Clear error state
      setNewAppointment({ start: "", end: "" }); // Clear time pickers
    }
    console.log(filteredDaysOfWeek);
  };

  const handlePreviousDay = (e) => {
    e.preventDefault(); // Prevent form submission
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
      setError(""); // Clear error state
      setNewAppointment({ start: "", end: "" }); // Clear time pickers
    }
  };

  const handleFlexibleInputChange = (dayIndex, field, value) => {
    setWorkDays((prevWorkDays) => {
      const updatedWorkDays = [...prevWorkDays];
      updatedWorkDays[dayIndex] = {
        ...updatedWorkDays[dayIndex],
        [field]: value,
      };
      return updatedWorkDays;
    });
  };

  const handleScheduleTypeChange = (dayIndex, type) => {
    setWorkDays((prevWorkDays) => {
      const updatedWorkDays = [...prevWorkDays];
      updatedWorkDays[dayIndex] = {
        ...updatedWorkDays[dayIndex],
        scheduleType: type,
      };
      return updatedWorkDays;
    });
  };

  const updateWorkDays = (currentDay, scheduleType) => {
    setWorkDays((prevWorkDays) => {
      const updatedWorkDays = prevWorkDays.map((day) =>
        day.day === currentDay ? { ...day, scheduleType } : day
      );
      console.log(updatedWorkDays); // Log the updated workDays array
      return updatedWorkDays;
    });
  };

  const isOverlapping = (newStart, newEnd, existingAppointments) => {
    for (let appointment of existingAppointments) {
      const existingStart = new Date(`1970-01-01T${appointment.start}:00`);
      const existingEnd = new Date(`1970-01-01T${appointment.end}:00`);
      const newStartTime = new Date(`1970-01-01T${newStart}:00`);
      const newEndTime = new Date(`1970-01-01T${newEnd}:00`);

      if (
        (newStartTime >= existingStart && newStartTime < existingEnd) ||
        (newEndTime > existingStart && newEndTime <= existingEnd) ||
        (newStartTime <= existingStart && newEndTime >= existingEnd)
      ) {
        return true;
      }
    }
    return false;
  };

  const handleSetAppointment = (e) => {
    e.preventDefault(); // Prevent form submission
    const currentDay = daysOfWeek[currentDayIndex];
    const currentDayObject = workDays.find((day) => day.day === currentDay);

    if (!currentDayObject) {
      setError("No matching day found in workDays.");
      return;
    }

    const currentDayAppointments = currentDayObject.appointmentTimes;

    if (newAppointment.start && newAppointment.end) {
      const newStartTime = new Date(`1970-01-01T${newAppointment.start}:00`);
      const newEndTime = new Date(`1970-01-01T${newAppointment.end}:00`);

      if (newEndTime <= newStartTime) {
        setError("The end time must be later than the start time.");
      } else if (
        isOverlapping(
          newAppointment.start,
          newAppointment.end,
          currentDayAppointments
        )
      ) {
        setError("The appointment times overlap with an existing appointment.");
      } else {
        const updatedWorkDays = workDays.map((day) => {
          if (day.day === currentDay) {
            return {
              ...day,
              appointmentTimes: [...day.appointmentTimes, newAppointment],
            };
          }
          return day;
        });

        console.log("Updated WorkDays:", updatedWorkDays); // Log the updated workDays

        setWorkDays(updatedWorkDays);
        setNewAppointment({ start: "", end: "" });
        setError("");
      }
    } else {
      setError("Please fill in both start and end times.");
    }
  };

  const StepButtons = () => {
    const nextStep = () => {
      setStep((prevStep) => prevStep + 1);
    };

    const prevStep = () => {
      setStep((prevStep) => (prevStep > 0 ? prevStep - 1 : 0));
    };

    return (
      <div>
        {step > 1 && (
          <button className="btn mt-4 mr-2" onClick={prevStep}>
            Previous
          </button>
        )}
        <button className="btn mt-4" onClick={nextStep}>
          Next
        </button>
      </div>
    );
  };

  const toggleScheduleType = () => {
    setScheduleType((prevType) =>
      prevType === "fixed" ? "flexible" : "fixed"
    );
  };

  const handleWorkDaysChange = (e) => {
    const { value, checked } = e.target;
    setWorkDays((prevWorkDays) =>
      prevWorkDays.map((day) =>
        day.day === value ? { ...day, isSelected: checked } : day
      )
    );
  };

  const nextStep = () => setStep((prevStep) => prevStep + 1);
  const prevStep = () => setStep((prevStep) => prevStep - 1);

  //   submit function
  const handleSubmit = (e) => {
    e.preventDefault();
    // get the id of the current user from the session and set it as the owner of the location
    console.log("Address:", address);
    // Clear the form
    setAddress({
      locationName: "",
      streetAddress: "",
      city: "",
      province: "",
      country: "",
      postalCode: "",
    });
    setAppointmentTimes({
      Monday: { start: "", end: "" },
      Tuesday: { start: "", end: "" },
      Wednesday: { start: "", end: "" },
      Thursday: { start: "", end: "" },
      Friday: { start: "", end: "" },
      Saturday: { start: "", end: "" },
      Sunday: { start: "", end: "" },
    });
    setStep(1);
  };

  return (
    <form onSubmit={handleSubmit}>
      {step === 1 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Let's set up your massage locations and schedules.
                  </h1>
                  <h2>
                    You will have the option to add more locations once this
                    location is complete.
                  </h2>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <label className="block">
              Location Name:
              <input
                type="text"
                name="locationName"
                value={address.locationName}
                onChange={handleAddressChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
              />
            </label>
            <label className="block">
              Street Address:
              <input
                type="text"
                name="streetAddress"
                value={address.streetAddress}
                onChange={handleAddressChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
              />
            </label>

            <label className="block">
              City:
              <input
                type="text"
                name="city"
                value={address.city}
                onChange={handleAddressChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
              />
            </label>
            <label className="block">
              Province:
              <input
                type="text"
                name="province"
                value={address.province}
                onChange={handleAddressChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
              />
            </label>
            <label className="block">
              Country:
              <input
                type="text"
                name="country"
                value={address.country}
                onChange={handleAddressChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
              />
            </label>
            <label className="block">
              Postal Code:
              <input
                type="text"
                name="postalCode"
                value={address.postalCode}
                onChange={handleAddressChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
              />
            </label>
          </div>
          <StepButtons />
        </div>
      )}
      {step === 2 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-28">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    What is the contact information for{" "}
                    {address.locationName
                      ? address.locationName
                      : address.streetAddress}
                    ?
                  </h1>
                  <div>
                    <label>Email address</label>
                    <input
                      type="email"
                      name="email"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
                      value={contactInfo.email}
                      onChange={handleContactInfoChange}
                    />
                    <label>Phone number</label>
                    <input
                      type="tel"
                      name="phone"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
                      value={contactInfo.phone}
                      onChange={handleContactInfoChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <StepButtons />
        </div>
      )}
      {step === 3 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Let's set up your schedule for{" "}
                    {address.locationName
                      ? address.locationName
                      : address.streetAddress}
                    :
                  </h1>
                </div>
                <div>
                  <h2 className="text-xl mb-4">
                    Is this a regular workplace for you or a one-time location?
                  </h2>
                  <div>
                    <label className="block">
                      <input
                        type="radio"
                        name="workplaceType"
                        value="regular"
                        checked={workplaceType === "regular"}
                        onChange={() => setWorkplaceType("regular")}
                        className="mr-2"
                      />
                      Regular Workplace
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="workplaceType"
                        value="one-time"
                        checked={workplaceType === "one-time"}
                        onChange={() => setWorkplaceType("one-time")}
                        className="mr-2"
                      />
                      One-time Workplace
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <StepButtons />
        </div>
      )}
      {step === 4 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Let's set up your schedule for{" "}
                    {address.locationName
                      ? address.locationName
                      : address.streetAddress}
                    :
                  </h1>
                </div>
                <div>
                  <h2 className="text-xl mb-4">
                    Which days of the week do you work at this location?
                  </h2>
                </div>
                <div>
                  {workDays.map((day) => (
                    <label key={day.day} className="block">
                      <input
                        type="checkbox"
                        name="workDays"
                        value={day.day}
                        checked={day.isSelected}
                        onChange={handleWorkDaysChange}
                        className="mr-2"
                      />
                      {day.day}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <StepButtons />
        </div>
      )}
      {step === 5 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Let's set up your schedule for{" "}
                    {address.locationName
                      ? address.locationName
                      : address.streetAddress}
                    :
                  </h1>
                </div>
                <div>
                  <h2 className="text-xl">
                    Do you want your appointment times for{" "}
                    {workDays?.[currentDayIndex]?.day} to be fixed or flexible?
                  </h2>
                </div>
                <div>
                  <button
                    type="button"
                    className={` ${
                      workDays?.[currentDayIndex]?.scheduleType === "fixed"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                    onClick={() => {
                      setScheduleType("fixed");
                      updateWorkDays(currentDay, "fixed");
                    }}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    className={` ml-2 ${
                      workDays?.[currentDayIndex]?.scheduleType === "flexible"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                    onClick={() => {
                      setScheduleType("flexible");
                      updateWorkDays(currentDay, "flexible");
                    }}
                  >
                    Flexible
                  </button>
                </div>
                {workDays?.[currentDayIndex]?.scheduleType === "fixed" ? (
                  <div>
                    <h1 className="text-2xl">Fixed Schedule Setup</h1>
                    <div className="space-y-2">
                      {workDays
                        .filter((day) => day.day === currentDay)
                        .map((day) =>
                          day.appointmentTimes.length > 0 ? (
                            day.appointmentTimes.map((appointment, index) => (
                              <div key={index}>
                                <p>
                                  Appointment {index + 1}: {appointment.start} -{" "}
                                  {appointment.end}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p>No appointments</p>
                          )
                        )}
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
                      <button type="button" onClick={handleSetAppointment}>
                        Set Appointment
                      </button>
                    </div>
                    {error && <p style={{ color: "red" }}>{error}</p>}
                  </div>
                ) : workDays?.[currentDayIndex]?.scheduleType === "flexible" ? (
                  <div>
                    <h1 className="text-2xl">Flexible Schedule Setup</h1>
                    {workDays.map((day, index) => (
                      <div key={index}>
                        <h2>{day.day}</h2>
                        <label>
                          Schedule Type:
                          <select
                            value={day.scheduleType}
                            onChange={(e) =>
                              handleScheduleTypeChange(index, e.target.value)
                            }
                          >
                            <option value="fixed">Fixed</option>
                            <option value="flexible">Flexible</option>
                          </select>
                        </label>
                        {day.scheduleType === "flexible" && (
                          <div>
                            <label>
                              Start Time:
                              <input
                                type="time"
                                value={day.startTime || ""}
                                onChange={(e) =>
                                  handleFlexibleInputChange(
                                    index,
                                    "startTime",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                            <label>
                              End Time:
                              <input
                                type="time"
                                value={day.endTime || ""}
                                onChange={(e) =>
                                  handleFlexibleInputChange(
                                    index,
                                    "endTime",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                            <label>
                              Appointment Duration (30-120 minutes):
                              <select
                                value={day.duration || ""}
                                onChange={(e) =>
                                  handleFlexibleInputChange(
                                    index,
                                    "duration",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Select</option>
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">60 minutes</option>
                                <option value="75">75 minutes</option>
                                <option value="90">90 minutes</option>
                                <option value="120">120 minutes</option>
                              </select>
                            </label>
                            <label>
                              Break Time Between Appointments:
                              <input
                                type="number"
                                value={day.break || ""}
                                onChange={(e) =>
                                  handleFlexibleInputChange(
                                    index,
                                    "break",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div></div>
                )}
                <div>
                  <button
                    type="button"
                    onClick={handlePreviousDay}
                    disabled={currentDayIndex === 0}
                  >
                    Previous Day
                  </button>
                  <button
                    type="button"
                    onClick={handleNextDay}
                    disabled={currentDayIndex === workDays.length - 1}
                  >
                    Next Day
                  </button>
                </div>
              </div>
              <StepButtons />
            </div>
          </div>
        </div>
      )}
      {step === 6 && (
        <div>
          <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
            <div className="flex items-center space-x-8">
              <div className="space-y-2 flex-grow">
                <div>
                  <div className="mb-4">
                    <h1 className="text-3xl">
                      Does this schedule for{" "}
                      {address.locationName
                        ? address.locationName
                        : address.streetAddress}{" "}
                      look correct?
                    </h1>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default SetupForm;

// import React, { useState } from "react";

// const SetUpForm = () => {
//   const [currentStep, setCurrentStep] = useState(1);
//   const [address, setAddress] = useState({
//     locationName: "",
//     streetAddress: "",
//     city: "",
//     province: "",
//     country: "",
//     postalCode: "",
//   });
//   const [contactInfo, setContactInfo] = useState("");
//   const [jobType, setJobType] = useState("");
//   const [workDays, setWorkDays] = useState([
//     {
//       day: "Monday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//     {
//       day: "Tuesday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//     {
//       day: "Wednesday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//     {
//       day: "Thursday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//     {
//       day: "Friday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//     {
//       day: "Saturday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//     {
//       day: "Sunday",
//       scheduleType: "",
//       appointmentTimes: [],
//       isSelected: false,
//     },
//   ]);

//   const handleAddressChange = (e) => {
//     const { name, value } = e.target;
//     setAddress((prevAddress) => ({ ...prevAddress, [name]: value }));
//   };

//   const handleWorkDaysChange = (day, field, value) => {
//     setWorkDays((prevWorkDays) =>
//       prevWorkDays.map((d) => (d.day === day ? { ...d, [field]: value } : d))
//     );
//   };

//   const handleNextStep = () => {
//     console.log("address", address);
//     setCurrentStep((prevStep) => prevStep + 1);
//   };

//   const handlePreviousStep = () => {
//     setCurrentStep((prevStep) => prevStep - 1);
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Handle form submission
//     console.log({ address, contactInfo, jobType, workDays });
//   };

//   const Step1 = ({ address, setAddress }) => (
//     <div className="mx-auto max-w-4xl px-4 mt-20 mb-28">
//       <div className="flex items-center space-x-8">
//         <div className="space-y-2 flex-grow">
//           <div>
//             <div className="mb-4">
//               <h1 className="text-3xl">
//                 Let's set up your massage locations and schedules.
//               </h1>
//               <h2>
//                 You will have the option to add more locations once this
//                 location is complete.
//               </h2>
//             </div>
//           </div>
//         </div>
//       </div>
//       <div className="space-y-4">
//         <label className="block">
//           Location Name:
//           <input
//             type="text"
//             name="locationName"
//             value={address.locationName}
//             onChange={handleAddressChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//           />
//         </label>
//         <label className="block">
//           Street Address:
//           <input
//             type="text"
//             name="streetAddress"
//             value={address.streetAddress}
//             onChange={handleAddressChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//           />
//         </label>

//         <label className="block">
//           City:
//           <input
//             type="text"
//             name="city"
//             value={address.city}
//             onChange={handleAddressChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//           />
//         </label>
//         <label className="block">
//           Province:
//           <input
//             type="text"
//             name="province"
//             value={address.province}
//             onChange={handleAddressChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//           />
//         </label>
//         <label className="block">
//           Country:
//           <input
//             type="text"
//             name="country"
//             value={address.country}
//             onChange={handleAddressChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//           />
//         </label>
//         <label className="block">
//           Postal Code:
//           <input
//             type="text"
//             name="postalCode"
//             value={address.postalCode}
//             onChange={handleAddressChange}
//             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//           />
//         </label>
//       </div>
//     </div>
//   );

//   const Step2 = ({ contactInfo, setContactInfo }) => (
//     <div>
//       <h2>Step 2: Enter Contact Information</h2>
//       <input
//         type="text"
//         value={contactInfo}
//         onChange={(e) => setContactInfo(e.target.value)}
//         placeholder="Enter contact information"
//       />
//     </div>
//   );

//   const Step3 = ({ jobType, setJobType }) => (
//     <div>
//       <h2>Step 3: Job Type</h2>
//       <label>
//         <input
//           type="radio"
//           value="one-time"
//           checked={jobType === "one-time"}
//           onChange={(e) => setJobType(e.target.value)}
//         />
//         One-time job
//       </label>
//       <label>
//         <input
//           type="radio"
//           value="regular"
//           checked={jobType === "regular"}
//           onChange={(e) => setJobType(e.target.value)}
//         />
//         Regular job
//       </label>
//     </div>
//   );

//   const Step4 = ({ workDays, handleWorkDaysChange }) => (
//     <div>
//       <h2>Step 4: Select Work Days</h2>
//       {workDays.map((day) => (
//         <label key={day.day} className="block">
//           <input
//             type="checkbox"
//             name="workDays"
//             value={day.day}
//             checked={day.isSelected}
//             onChange={(e) =>
//               handleWorkDaysChange(day.day, "isSelected", e.target.checked)
//             }
//             className="mr-2"
//           />
//           {day.day}
//         </label>
//       ))}
//     </div>
//   );

//   const Step5 = ({ workDays, handleWorkDaysChange }) => (
//     <div>
//       <h2>Step 5: Set Schedule</h2>
//       {workDays
//         .filter((day) => day.isSelected)
//         .map((day) => (
//           <div key={day.day} className="mb-4">
//             <label className="block font-bold">{day.day}</label>
//             <div className="mb-2">
//               <label className="block">Schedule Type:</label>
//               <input
//                 type="text"
//                 value={day.scheduleType}
//                 onChange={(e) =>
//                   handleWorkDaysChange(day.day, "scheduleType", e.target.value)
//                 }
//                 className="border p-2"
//               />
//             </div>
//             <div>
//               <label className="block">Appointment Times:</label>
//               <input
//                 type="text"
//                 value={day.appointmentTimes.join(", ")}
//                 onChange={(e) =>
//                   handleWorkDaysChange(
//                     day.day,
//                     "appointmentTimes",
//                     e.target.value.split(", ")
//                   )
//                 }
//                 className="border p-2"
//               />
//             </div>
//           </div>
//         ))}
//     </div>
//   );

//   return (
//     <form onSubmit={handleSubmit}>
//       {currentStep === 1 && <Step1 address={address} setAddress={setAddress} />}
//       {currentStep === 2 && (
//         <Step2 contactInfo={contactInfo} setContactInfo={setContactInfo} />
//       )}
//       {currentStep === 3 && <Step3 jobType={jobType} setJobType={setJobType} />}
//       {currentStep === 4 && (
//         <Step4
//           workDays={workDays}
//           handleWorkDaysChange={handleWorkDaysChange}
//         />
//       )}
//       {currentStep === 5 && (
//         <Step5
//           workDays={workDays}
//           handleWorkDaysChange={handleWorkDaysChange}
//         />
//       )}

//       <div className="mt-4">
//         {currentStep > 1 && (
//           <button type="button" onClick={handlePreviousStep}>
//             Previous
//           </button>
//         )}
//         {currentStep < 5 && (
//           <button type="button" onClick={handleNextStep}>
//             Next
//           </button>
//         )}
//         {currentStep === 5 && <button type="submit">Submit</button>}
//       </div>
//     </form>
//   );
// };

// export default SetUpForm;
