"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAvailableAppointments, bookAppointment } from "@/app/_actions";

function BookMassageForm({ rmtSetup, user }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [appointmentTimes, setAppointmentTimes] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location: "",
    RMTLocationId: "",
    duration: "",
    appointmentTime: "",
    workplace: "",
    appointmentDate: "",
  });

  // Extract the IDs from the canBookAt array
  const canBookAtIds = Array.isArray(user.resultObj?.canBookAtIds)
    ? user.resultObj.canBookAtIds
    : [];

  console.log("can  book at", canBookAtIds);

  const handleLocationChange = (event) => {
    const { value } = event.target;
    const selectedSetup = rmtSetup.find((setup) => setup._id === value);
    if (selectedSetup) {
      setFormData((prevData) => ({
        ...prevData,
        location: selectedSetup.formattedFormData.address.streetAddress,
        RMTLocationId: selectedSetup._id,
        workplace: "",
        duration: "",
        appointmentTime: "",
        appointmentDate: "",
      }));
      setAppointmentTimes([]);
      setSelectedAppointment(null);
    }
  };

  const handleServiceChange = (event) => {
    const { value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      duration: value,
      appointmentTime: "",
      appointmentDate: "",
    }));
    setAppointmentTimes([]);
    setSelectedAppointment(null);
  };

  const fetchAppointments = async () => {
    if (formData.RMTLocationId && formData.duration) {
      setLoading(true);
      setError(null);
      try {
        const times = await getAvailableAppointments(
          formData.RMTLocationId,
          Number.parseInt(formData.duration),
          process.env.NEXT_PUBLIC_TIMEZONE
        );

        const sortedTimes = times.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA - dateB;
        });

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
              weekday: "long",
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

  useEffect(() => {
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
                        appointmentDate: dateGroup.date,
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
    if (currentStep === 2) {
      setFormData((prevData) => ({
        ...prevData,
        location: "",
        RMTLocationId: "",
        duration: "",
        appointmentTime: "",
        appointmentDate: "",
      }));
      setAppointmentTimes([]);
      setSelectedAppointment(null);
    } else if (currentStep === 3) {
      setFormData((prevData) => ({
        ...prevData,
        duration: "",
        appointmentTime: "",
        appointmentDate: "",
      }));
      setAppointmentTimes([]);
      setSelectedAppointment(null);
    }
    setCurrentStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await bookAppointment({
        location: formData.location,
        duration: formData.duration,
        appointmentTime: formData.appointmentTime,
        workplace: formData.workplace,
        appointmentDate: formData.appointmentDate,
        RMTLocationId: formData.RMTLocationId,
        timezone: process.env.NEXT_PUBLIC_TIMEZONE,
      });
      router.push("/dashboard/patient");
    } catch (error) {
      console.error("Error booking appointment:", error);
      setError("Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto px-4 py-8 space-y-8"
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl">Select a location:</h1>
          <select
            name="location"
            value={formData.RMTLocationId}
            onChange={handleLocationChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="" disabled>
              Select a location
            </option>
            {Array.isArray(canBookAtIds) &&
              canBookAtIds.length > 0 &&
              rmtSetup
                .filter((setup) => canBookAtIds.includes(setup._id))
                .map((setup) => (
                  <option key={setup._id} value={setup._id}>
                    {setup.formattedFormData.address.locationName ||
                      setup.formattedFormData.address.streetAddress}
                  </option>
                ))}
          </select>
          <button
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
            type="button"
            onClick={nextStep}
            disabled={!formData.RMTLocationId}
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
            onChange={handleServiceChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="" disabled>
              Select a service
            </option>
            {rmtSetup
              .find((setup) => setup._id === formData.RMTLocationId)
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
                disabled={(currentPage + 1) * 6 >= appointmentTimes.length}
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
                  Booking...
                </>
              ) : (
                "Yes, Book Appointment"
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

export default BookMassageForm;

// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { getAvailableAppointments, bookAppointment } from "@/app/_actions";

// function BookMassageForm({ rmtSetup, user }) {
//   const router = useRouter();
//   const [currentStep, setCurrentStep] = useState(1);
//   const [appointmentTimes, setAppointmentTimes] = useState([]);
//   const [currentPage, setCurrentPage] = useState(0);
//   const [selectedAppointment, setSelectedAppointment] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [formData, setFormData] = useState({
//     location: "",
//     RMTLocationId: "",
//     duration: "",
//     appointmentTime: "",
//     workplace: "",
//     appointmentDate: "",
//   });

//   // Extract the IDs from the canBookAt array
//   const canBookAtIds = Array.isArray(user.resultObj?.canBookAtIds)
//     ? user.resultObj.canBookAtIds
//     : [];

//   console.log("can  book at", canBookAtIds);

//   const handleLocationChange = (event) => {
//     const { value } = event.target;
//     const selectedSetup = rmtSetup.find((setup) => setup._id === value);
//     if (selectedSetup) {
//       setFormData((prevData) => ({
//         ...prevData,
//         location: selectedSetup.formattedFormData.address.streetAddress,
//         RMTLocationId: selectedSetup._id,
//         workplace: "",
//         duration: "",
//         appointmentTime: "",
//         appointmentDate: "",
//       }));
//       setAppointmentTimes([]);
//       setSelectedAppointment(null);
//     }
//   };

//   const handleServiceChange = (event) => {
//     const { value } = event.target;
//     setFormData((prevData) => ({
//       ...prevData,
//       duration: value,
//       appointmentTime: "",
//       appointmentDate: "",
//     }));
//     setAppointmentTimes([]);
//     setSelectedAppointment(null);
//   };

//   const fetchAppointments = async () => {
//     if (formData.RMTLocationId && formData.duration) {
//       setLoading(true);
//       setError(null);
//       try {
//         const times = await getAvailableAppointments(
//           formData.RMTLocationId,
//           parseInt(formData.duration),
//           process.env.NEXT_PUBLIC_TIMEZONE
//         );

//         const sortedTimes = times.sort((a, b) => {
//           const dateA = new Date(`${a.date}T${a.startTime}`);
//           const dateB = new Date(`${b.date}T${b.startTime}`);
//           return dateA - dateB;
//         });

//         const groupedTimes = sortedTimes.reduce((acc, appointment) => {
//           const { date, startTime, endTime } = appointment;
//           if (!acc[date]) {
//             acc[date] = [];
//           }
//           acc[date].push({ startTime, endTime });
//           return acc;
//         }, {});

//         const groupedAppointments = Object.entries(groupedTimes).map(
//           ([date, times]) => {
//             const formattedDate = new Date(
//               `${date}T00:00:00`
//             ).toLocaleDateString("en-US", {
//               year: "numeric",
//               month: "long",
//               day: "numeric",
//             });

//             const formattedTimes = times
//               .map(({ startTime, endTime }) => {
//                 const start = new Date(`${date}T${startTime}`);
//                 const end = new Date(`${date}T${endTime}`);
//                 return {
//                   formattedTime: `${start.toLocaleTimeString("en-US", {
//                     hour: "numeric",
//                     minute: "numeric",
//                     hour12: true,
//                   })} - ${end.toLocaleTimeString("en-US", {
//                     hour: "numeric",
//                     minute: "numeric",
//                     hour12: true,
//                   })}`,
//                   startTime,
//                   endTime,
//                 };
//               })
//               .sort((a, b) => {
//                 const timeA = new Date(`${date}T${a.startTime}`);
//                 const timeB = new Date(`${date}T${b.startTime}`);
//                 return timeA - timeB;
//               });

//             return {
//               date: date,
//               formattedDate: formattedDate,
//               times: formattedTimes,
//             };
//           }
//         );

//         setAppointmentTimes(groupedAppointments);
//       } catch (error) {
//         console.error("Error fetching appointment times:", error);
//         setError("Failed to fetch appointment times. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     }
//   };

//   useEffect(() => {
//     fetchAppointments();
//   }, [formData.RMTLocationId, formData.duration]);

//   const renderAppointments = () => {
//     if (loading) {
//       return <p>Loading available appointments...</p>;
//     }

//     if (error) {
//       return <p className="text-red-500">{error}</p>;
//     }

//     if (!appointmentTimes || appointmentTimes.length === 0) {
//       return (
//         <p>
//           No available appointments found. Please try a different location or
//           duration.
//         </p>
//       );
//     }

//     const dates = appointmentTimes.slice(
//       currentPage * 6,
//       (currentPage + 1) * 6
//     );

//     return (
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//         {dates.map((dateGroup, index) => (
//           <div key={index} className="bg-white shadow-md rounded-lg p-4">
//             <h4 className="text-lg font-semibold mb-2">
//               {dateGroup.formattedDate}
//             </h4>
//             <ul className="space-y-2">
//               {dateGroup.times.map((time, idx) => {
//                 const isSelected =
//                   selectedAppointment &&
//                   selectedAppointment.date === dateGroup.date &&
//                   selectedAppointment.time === time.formattedTime;

//                 return (
//                   <li
//                     key={idx}
//                     className={`cursor-pointer p-2 rounded transition-colors ${
//                       isSelected
//                         ? "bg-blue-200 text-blue-800"
//                         : "text-gray-700 hover:bg-gray-100"
//                     }`}
//                     onClick={() => {
//                       setSelectedAppointment({
//                         date: dateGroup.date,
//                         time: time.formattedTime,
//                       });
//                       setFormData({
//                         ...formData,
//                         appointmentTime: time.startTime,
//                         appointmentDate: dateGroup.date,
//                       });
//                     }}
//                   >
//                     {time.formattedTime}
//                   </li>
//                 );
//               })}
//             </ul>
//           </div>
//         ))}
//       </div>
//     );
//   };

//   const nextStep = () => {
//     setCurrentStep((prevStep) => prevStep + 1);
//   };

//   const prevStep = () => {
//     if (currentStep === 2) {
//       setFormData((prevData) => ({
//         ...prevData,
//         location: "",
//         RMTLocationId: "",
//         duration: "",
//         appointmentTime: "",
//         appointmentDate: "",
//       }));
//       setAppointmentTimes([]);
//       setSelectedAppointment(null);
//     } else if (currentStep === 3) {
//       setFormData((prevData) => ({
//         ...prevData,
//         duration: "",
//         appointmentTime: "",
//         appointmentDate: "",
//       }));
//       setAppointmentTimes([]);
//       setSelectedAppointment(null);
//     }
//     setCurrentStep((prevStep) => prevStep - 1);
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setIsSubmitting(true);
//     try {
//       await bookAppointment({
//         location: formData.location,
//         duration: formData.duration,
//         appointmentTime: formData.appointmentTime,
//         workplace: formData.workplace,
//         appointmentDate: formData.appointmentDate,
//         RMTLocationId: formData.RMTLocationId,
//         timezone: process.env.NEXT_PUBLIC_TIMEZONE,
//       });
//       router.push("/dashboard/patient");
//     } catch (error) {
//       console.error("Error booking appointment:", error);
//       setError("Failed to book appointment. Please try again.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="max-w-4xl mx-auto px-4 py-8 space-y-8"
//     >
//       {currentStep === 1 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">Select a location:</h1>
//           <select
//             name="location"
//             value={formData.RMTLocationId}
//             onChange={handleLocationChange}
//             required
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//           >
//             <option value="" disabled>
//               Select a location
//             </option>
//             {Array.isArray(canBookAtIds) &&
//               canBookAtIds.length > 0 &&
//               rmtSetup
//                 .filter((setup) => canBookAtIds.includes(setup._id))
//                 .map((setup) => (
//                   <option key={setup._id} value={setup._id}>
//                     {setup.formattedFormData.address.locationName ||
//                       setup.formattedFormData.address.streetAddress}
//                   </option>
//                 ))}
//           </select>
//           <button
//             className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
//             type="button"
//             onClick={nextStep}
//             disabled={!formData.RMTLocationId}
//           >
//             Next Step
//           </button>
//         </div>
//       )}

//       {currentStep === 2 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">
//             What treatment would you like to book?
//           </h1>
//           <select
//             name="duration"
//             value={formData.duration}
//             onChange={handleServiceChange}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//           >
//             <option value="" disabled>
//               Select a service
//             </option>
//             {rmtSetup
//               .find((setup) => setup._id === formData.RMTLocationId)
//               ?.formattedFormData?.massageServices.map((service, index) => (
//                 <option key={index} value={service.duration}>
//                   {service.duration} minute {service.service} - ${service.price}{" "}
//                   {service.plusHst ? "+HST" : ""}
//                 </option>
//               ))}
//           </select>
//           <div className="flex space-x-4">
//             <button
//               className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//               type="button"
//               onClick={prevStep}
//             >
//               Back
//             </button>
//             <button
//               className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
//               type="button"
//               onClick={nextStep}
//               disabled={!formData.duration}
//             >
//               Next Step
//             </button>
//           </div>
//         </div>
//       )}

//       {currentStep === 3 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">
//             Select a date and time for your appointment:
//           </h1>
//           {renderAppointments()}
//           {appointmentTimes.length > 0 && (
//             <div className="flex justify-between">
//               <button
//                 type="button"
//                 onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
//                 disabled={currentPage === 0}
//                 className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
//               >
//                 Previous Dates
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setCurrentPage((prev) => prev + 1)}
//                 disabled={(currentPage + 1) * 6 >= appointmentTimes.length}
//                 className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
//               >
//                 More Dates
//               </button>
//             </div>
//           )}
//           <div className="flex space-x-4">
//             <button
//               className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//               type="button"
//               onClick={prevStep}
//             >
//               Back
//             </button>
//             <button
//               className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
//               type="button"
//               onClick={nextStep}
//               disabled={!selectedAppointment}
//             >
//               Next Step
//             </button>
//           </div>
//         </div>
//       )}

//       {currentStep === 4 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">
//             Does the following information look correct?
//           </h1>
//           <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
//             <p>
//               <strong>Location:</strong> {formData.location}
//             </p>
//             <p>
//               <strong>Duration:</strong> {formData.duration} minutes
//             </p>
//             <p>
//               <strong>Date:</strong>{" "}
//               {new Date(
//                 `${formData.appointmentDate}T00:00:00`
//               ).toLocaleDateString("en-US", {
//                 year: "numeric",
//                 month: "long",
//                 day: "numeric",
//                 timeZone: "America/Toronto",
//               })}
//             </p>
//             <p>
//               <strong>Time:</strong>{" "}
//               {new Date(
//                 `${formData.appointmentDate}T${formData.appointmentTime}`
//               ).toLocaleTimeString("en-US", {
//                 hour: "numeric",
//                 minute: "numeric",
//                 hour12: true,
//                 timeZone: "America/Toronto",
//               })}
//             </p>
//           </div>
//           {error && <p className="text-red-500">{error}</p>}
//           <div className="flex space-x-4">
//             <button
//               className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 disabled:opacity-50"
//               type="submit"
//               disabled={isSubmitting}
//             >
//               {isSubmitting ? (
//                 <>
//                   <svg
//                     className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     ></circle>
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                     ></path>
//                   </svg>
//                   Booking...
//                 </>
//               ) : (
//                 "Yes, Book Appointment"
//               )}
//             </button>
//             <button
//               className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//               type="button"
//               onClick={prevStep}
//               disabled={isSubmitting}
//             >
//               No, Go Back
//             </button>
//           </div>
//         </div>
//       )}
//     </form>
//   );
// }

// export default BookMassageForm;
