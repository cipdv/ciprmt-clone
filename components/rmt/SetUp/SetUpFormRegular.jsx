"use client";

import React, { useState } from "react";
import { RMTSetup } from "@/app/_actions";

const SetUpFormRegular = () => {
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
  const [newService, setNewService] = useState({
    service: "",
    duration: "",
    price: "",
    plusHst: false,
  });
  const [massageServices, setMassageServices] = useState([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [newAppointment, setNewAppointment] = useState({ start: "", end: "" });
  const [error, setError] = useState("");
  const [workDays, setWorkDays] = useState([]);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

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

  const handleSetMassageService = (e) => {
    e.preventDefault();
    setMassageServices((prevServices) => [...prevServices, newService]);
    setNewService({ service: "", duration: "", price: "", plusHst: false });
  };

  const handleDeleteMassageService = (e, index) => {
    e.preventDefault();
    setMassageServices((prevServices) =>
      prevServices.filter((_, i) => i !== index)
    );
  };

  const handleNextDay = (e) => {
    e.preventDefault(); // Prevent form submission
    if (currentDayIndex < workDays.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
      setError(""); // Clear error state
      setNewAppointment({ start: "", end: "" }); // Clear time pickers
    }
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

  const handleScheduleTypeChange = (index, scheduleType) => {
    setWorkDays((prevWorkDays) => {
      const updatedWorkDays = [...prevWorkDays];
      updatedWorkDays[index] = {
        ...updatedWorkDays[index],
        scheduleType,
      };
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
    const currentDayAppointments = workDays[currentDayIndex].appointmentTimes;
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
        const updatedWorkDays = workDays.map((workDay, index) => {
          if (index === currentDayIndex) {
            return {
              ...workDay,
              appointmentTimes: [
                ...workDay.appointmentTimes,
                { start: newAppointment.start, end: newAppointment.end },
              ],
            };
          }
          return workDay;
        });

        setWorkDays(updatedWorkDays);
        setNewAppointment({ start: "", end: "" });
        setError("");
      }
    } else {
      setError("Please fill in both start and end times.");
    }
  };

  const handleDeleteAppointment = (index) => {
    const updatedWorkDays = [...workDays];
    updatedWorkDays[currentDayIndex].appointmentTimes.splice(index, 1);
    setWorkDays(updatedWorkDays);
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
            Previous Step
          </button>
        )}
        <button className="btn mt-4" onClick={nextStep}>
          Next Step
        </button>
      </div>
    );
  };

  const handleWorkDaysChange = (e) => {
    const { value, checked } = e.target;
    setWorkDays((prevWorkDays) => {
      let updatedWorkDays;
      if (checked) {
        // Add the day to the array
        updatedWorkDays = [
          ...prevWorkDays,
          { day: value, scheduleType: "", appointmentTimes: [] },
        ];
      } else {
        // Remove the day from the array
        updatedWorkDays = prevWorkDays.filter((day) => day.day !== value);
      }
      return updatedWorkDays;
    });
  };

  const prevStep = () => {
    setStep((prevStep) => (prevStep > 0 ? prevStep - 1 : 0));
  };

  //   submit function
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      address,
      contactInfo,
      workplaceType,
      massageServices,
      workDays,
    };
    // send the form data to the server

    // get the id of the current user from the session and set it as the owner of the location
    // console.log("Address:", address);
    // // Clear the form
    // setAddress({
    //   locationName: "",
    //   streetAddress: "",
    //   city: "",
    //   province: "",
    //   country: "",
    //   postalCode: "",
    // });
    // setAppointmentTimes({
    //   Monday: { start: "", end: "" },
    //   Tuesday: { start: "", end: "" },
    //   Wednesday: { start: "", end: "" },
    //   Thursday: { start: "", end: "" },
    //   Friday: { start: "", end: "" },
    //   Saturday: { start: "", end: "" },
    //   Sunday: { start: "", end: "" },
    // });
    // setStep(1);
  };

  return (
    <form
      action={async () => {
        await RMTSetup({
          address,
          contactInfo,
          workplaceType,
          massageServices,
          workDays,
        });
      }}
    >
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

      {/* {step === 3 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    Is{" "}
                    {address.locationName
                      ? address.locationName
                      : address.streetAddress}{" "}
                    a regular workplace for you or a one-time location?
                  </h1>
                </div>
                <div>
                  <h2 className="text-xl mb-4"></h2>
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
      )} */}
      {step === 3 && (
        <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
          <div className="flex items-center space-x-8">
            <div className="space-y-2 flex-grow">
              <div>
                <div className="mb-4">
                  <h1 className="text-3xl">
                    What services do you offer at{" "}
                    {address.locationName
                      ? address.locationName
                      : address.streetAddress}
                    ?
                  </h1>
                </div>
                <div className="space-y-3">
                  {massageServices?.length > 0 ? (
                    massageServices.map((service, index) => (
                      <div key={index}>
                        <div key={index}>
                          <p>
                            {service.duration} minute {service.service}: $
                            {service.price} {service.plusHst ? " +HST" : ""}
                            <button
                              type="button"
                              className="text-red-500 ml-4"
                              onClick={(e) =>
                                handleDeleteMassageService(e, index)
                              }
                            >
                              Delete
                            </button>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No services set</p>
                  )}
                  <div>
                    <label>
                      Duration:
                      <select
                        className="p-1"
                        value={newService.duration}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            duration: e.target.value,
                          })
                        }
                      >
                        <option value="">Select</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="75">75 minutes</option>
                        <option value="90">90 minutes</option>
                        <option value="120">120 minutes</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <label>
                      Service:
                      <input
                        className="p-1"
                        type="text"
                        name="service"
                        placeholder="e.g. Swedish Massage"
                        value={newService.service}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            service: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      Price:
                      <input
                        className="p-1"
                        type="text"
                        name="price"
                        value={newService.price}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            price: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="ml-5">
                      Plus HST?
                      <input
                        className="ml-2"
                        type="checkbox"
                        name="plusHst"
                        checked={newService.plusHst}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            plusHst: e.target.checked,
                          })
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="btn-orange"
                    type="button"
                    onClick={handleSetMassageService}
                  >
                    Set Service
                  </button>
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
                  {daysOfWeek.map((day, index) => (
                    <label key={index} className="block">
                      <input
                        type="checkbox"
                        name={day}
                        value={day}
                        checked={workDays.some(
                          (workDay) => workDay.day === day
                        )}
                        onChange={handleWorkDaysChange}
                        className="mr-2"
                      />
                      {day}
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
                  {workDays.length > 0 && (
                    <div key={currentDayIndex} className="mb-5">
                      <h2 className="text-xl">
                        How would you like to structure your schedule for{" "}
                        {workDays[currentDayIndex].day}?
                      </h2>
                      <label>
                        Fixed
                        <input
                          type="radio"
                          name={`scheduleType-${currentDayIndex}`}
                          value="fixed"
                          checked={
                            workDays[currentDayIndex].scheduleType === "fixed"
                          }
                          onChange={() =>
                            handleScheduleTypeChange(currentDayIndex, "fixed")
                          }
                          className="mr-2"
                        />
                      </label>
                      <label>
                        Flexible
                        <input
                          type="radio"
                          name={`scheduleType-${currentDayIndex}`}
                          value="flexible"
                          checked={
                            workDays[currentDayIndex].scheduleType ===
                            "flexible"
                          }
                          onChange={() =>
                            handleScheduleTypeChange(
                              currentDayIndex,
                              "flexible"
                            )
                          }
                          className="mr-2"
                        />
                      </label>
                    </div>
                  )}
                </div>
                {workDays?.[currentDayIndex]?.scheduleType === "fixed" ? (
                  <div>
                    <h1 className="text-2xl">Fixed Schedule Setup</h1>
                    <div className="space-y-2">
                      {workDays?.[currentDayIndex]?.appointmentTimes.length >
                      0 ? (
                        workDays[currentDayIndex].appointmentTimes.map(
                          (appointment, index) => (
                            <div key={index}>
                              <p>
                                {appointment.start} - {appointment.end}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(index)}
                              >
                                Delete
                              </button>
                            </div>
                          )
                        )
                      ) : (
                        <p>No appointments set</p>
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
                    <div className="space-y-2">
                      <div>
                        <label>
                          What time will you start taking appointments:
                          <input
                            type="time"
                            value={workDays[currentDayIndex].startTime || ""}
                            onChange={(e) =>
                              handleFlexibleInputChange(
                                currentDayIndex,
                                "startTime",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                      <div>
                        <label>
                          What time would you like your last appointment to
                          finish:
                          <input
                            type="time"
                            value={workDays[currentDayIndex].endTime || ""}
                            onChange={(e) =>
                              handleFlexibleInputChange(
                                currentDayIndex,
                                "endTime",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                      <div>
                        <label>
                          What is the minimum duration of an appointment:
                          <select
                            value={workDays[currentDayIndex].minDuration || ""}
                            onChange={(e) =>
                              handleFlexibleInputChange(
                                currentDayIndex,
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
                      </div>

                      <div>
                        <label>
                          How much time would you like between appointments:
                          <select
                            value={workDays[currentDayIndex].breaks || ""}
                            onChange={(e) =>
                              handleFlexibleInputChange(
                                currentDayIndex,
                                "breaks",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select</option>
                            <option value="5">5 minutes</option>
                            <option value="10">10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="20">20 minutes</option>
                            <option value="25">25 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="35">35 minutes</option>
                            <option value="40">40 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="50">50 minutes</option>
                            <option value="55">55 minutes</option>
                            <option value="60">60 minutes</option>
                          </select>
                        </label>
                      </div>
                      <div>
                        <label>
                          What is the maximum hours you would like to work on{" "}
                          {workDays?.[currentDayIndex]?.day}:
                          <input
                            type="number"
                            value={
                              workDays[currentDayIndex].maxAppointments || ""
                            }
                            onChange={(e) =>
                              handleFlexibleInputChange(
                                currentDayIndex,
                                "maxAppointments",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="mt-5 space-x-3">
                  {currentDayIndex > 0 && (
                    <button className="btn-orange" onClick={handlePreviousDay}>
                      Previous Day
                    </button>
                  )}
                  {currentDayIndex < workDays.length - 1 && (
                    <button className="btn-orange" onClick={handleNextDay}>
                      Next Day
                    </button>
                  )}
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
                  <div>
                    <h2 className="text-xl mb-4">Location Information</h2>
                    <p>
                      <strong>Location Name:</strong> {address.locationName}
                    </p>
                    <p>
                      <strong>Street Address:</strong> {address.streetAddress}
                    </p>
                    <p>
                      <strong>City:</strong> {address.city}
                    </p>
                    <p>
                      <strong>Province:</strong> {address.province}
                    </p>
                    <p>
                      <strong>Country:</strong> {address.country}
                    </p>
                    <p>
                      <strong>Postal Code:</strong> {address.postalCode}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-xl mb-4">Contact Information</h2>
                    <p>
                      <strong>Email:</strong> {contactInfo.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {contactInfo.phone}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-xl mb-4">Workplace Type</h2>
                    <p>
                      <strong>Workplace Type:</strong> {workplaceType}
                    </p>
                  </div>
                  <div>
                    <h2 className="text-xl mb-4">Massage Services</h2>
                    {massageServices.map((service, index) => (
                      <div key={index}>
                        <p>
                          {service.duration} minute {service.service}: $
                          {service.price} {service.plusHst ? " +HST" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h2 className="text-xl mb-4">Work Days</h2>
                    {workDays.map((workDay, index) => (
                      <div key={index}>
                        <p>
                          <strong>{workDay.day}</strong>
                        </p>
                        <p>
                          <strong>Schedule Type:</strong> {workDay.scheduleType}
                        </p>
                        <p>
                          <strong>Appointment Times:</strong>{" "}
                          {workDay.appointmentTimes.map(
                            (appointment, index) =>
                              `${appointment.start} - ${appointment.end}`
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button type="button" className="btn" onClick={prevStep}>
                      No, go back
                    </button>
                    <button type="submit" className="btn-orange">
                      Yes, submit
                    </button>
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

export default SetUpFormRegular;
