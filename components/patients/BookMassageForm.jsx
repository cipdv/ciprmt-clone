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
          console.log(
            `Fetching appointments for RMTLocationId: ${formData.RMTLocationId}, duration: ${formData.duration}`
          );
          const times = await getAvailableAppointments(
            formData.RMTLocationId,
            parseInt(formData.duration),
            process.env.NEXT_PUBLIC_TIMEZONE
          );

          console.log("Fetched appointment times:", times);

          // Group appointments by date
          const groupedTimes = times.reduce((acc, appointment) => {
            const { date, times } = appointment;
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(...times);
            return acc;
          }, {});

          // Convert grouped times back to array format
          const groupedAppointments = Object.entries(groupedTimes).map(
            ([date, times]) => ({
              date,
              times: times.sort(),
            })
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

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
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
            <h4 className="text-lg font-semibold mb-2">
              {formatDate(dateGroup.date)}
            </h4>
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
                    {formatTime(time)}
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
        console.log("Submitting appointment:", formData);
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
          <h1 className="text-2xl sm:text-3xl">
            Select the location where you would like to book a massage:
          </h1>
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
          <h1 className="text-2xl sm:text-3xl">
            What length of massage session would you like to book?
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
              Next
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl">
            Select a date and time for your massage:
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
              <strong>Date:</strong> {formatDate(formData.appointmentDate)}
            </p>
            <p>
              <strong>Time:</strong> {formatTime(formData.appointmentTime)}
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
// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { getAvailableAppointments, bookAppointment } from "@/app/_actions";

// function BookMassageForm({ rmtSetup, user, healthHistory }) {
//   const router = useRouter();
//   const [currentStep, setCurrentStep] = useState(1);
//   const [appointmentTimes, setAppointmentTimes] = useState([]);
//   const [currentPage, setCurrentPage] = useState(0);
//   const [selectedAppointment, setSelectedAppointment] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [formData, setFormData] = useState({
//     location: "",
//     RMTLocationId: "",
//     duration: "",
//     appointmentTime: "",
//     workplace: "",
//     appointmentDate: "",
//   });

//   const handleInputChange = async (event) => {
//     const { name, value } = event.target;
//     setFormData((prevData) => ({ ...prevData, [name]: value }));

//     if (name === "location") {
//       const selectedSetup = rmtSetup.find(
//         (setup) => setup.formattedFormData.address.streetAddress === value
//       );
//       if (selectedSetup) {
//         setFormData((prevData) => ({
//           ...prevData,
//           RMTLocationId: selectedSetup._id,
//         }));
//       }
//     }
//   };

//   useEffect(() => {
//     const fetchAppointments = async () => {
//       if (formData.RMTLocationId && formData.duration) {
//         setLoading(true);
//         setError(null);
//         try {
//           console.log(
//             `Fetching appointments for RMTLocationId: ${formData.RMTLocationId}, duration: ${formData.duration}`
//           );
//           const times = await getAvailableAppointments(
//             formData.RMTLocationId,
//             parseInt(formData.duration),
//             "America/New_York"
//           );

//           console.log("Fetched appointment times:", times);
//           setAppointmentTimes(times);
//         } catch (error) {
//           console.error("Error fetching appointment times:", error);
//           setError("Failed to fetch appointment times. Please try again.");
//         } finally {
//           setLoading(false);
//         }
//       }
//     };

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
//       currentPage * 5,
//       (currentPage + 1) * 5
//     );

//     return (
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//         {dates.map((dateGroup, index) => (
//           <div key={index} className="bg-white shadow-md rounded-lg p-4">
//             <h4 className="text-lg font-semibold mb-2">
//               {formatDate(dateGroup.date)}
//             </h4>
//             <ul className="space-y-2">
//               {dateGroup.times.map((time, idx) => {
//                 const isSelected =
//                   selectedAppointment &&
//                   selectedAppointment.date === dateGroup.date &&
//                   selectedAppointment.time === time;

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
//                         time,
//                       });
//                       setFormData({
//                         ...formData,
//                         appointmentTime: time,
//                         appointmentDate: dateGroup.date,
//                       });
//                     }}
//                   >
//                     {formatTime(time)}
//                   </li>
//                 );
//               })}
//             </ul>
//           </div>
//         ))}
//       </div>
//     );
//   };

//   const formatDate = (dateString) => {
//     const [year, month, day] = dateString.split("-");
//     const date = new Date(year, month - 1, day);
//     return date.toLocaleDateString("en-US", {
//       weekday: "long",
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });
//   };

//   const formatTime = (timeString) => {
//     const [hours, minutes] = timeString.split(":");
//     const date = new Date();
//     date.setHours(parseInt(hours, 10));
//     date.setMinutes(parseInt(minutes, 10));
//     return date.toLocaleTimeString("en-US", {
//       hour: "numeric",
//       minute: "2-digit",
//     });
//   };

//   const nextStep = () => {
//     setCurrentStep((prevStep) => prevStep + 1);
//   };

//   const prevStep = () => {
//     setCurrentStep((prevStep) => prevStep - 1);
//   };

//   return (
//     <form
//       action={async () => {
//         await bookAppointment({
//           location: formData.location,
//           duration: formData.duration,
//           appointmentTime: formData.appointmentTime,
//           workplace: formData.workplace,
//           appointmentDate: formData.appointmentDate,
//           RMTLocationId: formData.RMTLocationId,
//         });
//       }}
//       className="max-w-4xl mx-auto px-4 py-8 space-y-8"
//     >
//       {currentStep === 1 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">
//             Select the location where you would like to book a massage:
//           </h1>
//           <select
//             name="location"
//             value={formData.location}
//             onChange={handleInputChange}
//             required
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//           >
//             <option value="" disabled>
//               Select a location
//             </option>
//             {rmtSetup.map((setup, index) => (
//               <option
//                 key={index}
//                 value={setup.formattedFormData.address.streetAddress}
//               >
//                 {setup.formattedFormData.address.locationName ||
//                   setup.formattedFormData.address.streetAddress}
//               </option>
//             ))}
//           </select>
//           <button
//             className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
//             type="button"
//             onClick={nextStep}
//             disabled={!formData.location}
//           >
//             Next
//           </button>
//         </div>
//       )}

//       {currentStep === 2 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">
//             What length of massage session would you like to book?
//           </h1>
//           <select
//             name="duration"
//             value={formData.duration}
//             onChange={handleInputChange}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//           >
//             <option value="" disabled>
//               Select a service
//             </option>
//             {rmtSetup
//               .find(
//                 (setup) =>
//                   setup.formattedFormData.address.streetAddress ===
//                   formData.location
//               )
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
//               Next
//             </button>
//           </div>
//         </div>
//       )}

//       {currentStep === 3 && (
//         <div className="space-y-4">
//           <h1 className="text-2xl sm:text-3xl">
//             Select a date and time for your massage:
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
//                 Previous
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setCurrentPage((prev) => prev + 1)}
//                 disabled={(currentPage + 1) * 5 >= appointmentTimes.length}
//                 className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
//               >
//                 Next
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
//               Next
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
//               <strong>Date:</strong> {formatDate(formData.appointmentDate)}
//             </p>
//             <p>
//               <strong>Time:</strong> {formatTime(formData.appointmentTime)}
//             </p>
//           </div>
//           <div className="flex space-x-4">
//             <button
//               className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
//               type="submit"
//             >
//               Yes, Book Appointment
//             </button>
//             <button
//               className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//               type="button"
//               onClick={prevStep}
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

// // "use client";
// // import { getRMTSetup } from "@/app/_actions";
// // import React, { useEffect, useState } from "react";
// // import { getAvailableAppointments, bookAppointment } from "@/app/_actions";

// // function BookMassageForm({ rmtSetup }) {
// //   const [currentStep, setCurrentStep] = useState(1);
// //   const [appointmentTimes, setAppointmentTimes] = useState([]);
// //   const [currentPage, setCurrentPage] = useState(0);
// //   const [selectedAppointment, setSelectedAppointment] = useState(null);
// //   const [formData, setFormData] = useState({
// //     location: "",
// //     RMTLocationId: "",
// //     duration: "",
// //     appointmentTime: "",
// //     workplace: "",
// //     appointmentDate: "",
// //   });

// //   useEffect(() => {
// //     console.log("rmtSetup", rmtSetup);
// //   }, []);

// //   const handleInputChange = async (event) => {
// //     const { name, value } = event.target;
// //     setFormData({ ...formData, [name]: value });

// //     if (name === "location") {
// //       const selectedSetup = rmtSetup.find(
// //         (setup) => setup.formattedFormData.address.streetAddress === value
// //       );
// //       if (selectedSetup) {
// //         try {
// //           const times = await getAvailableAppointments(selectedSetup._id);
// //           setAppointmentTimes(times);
// //           console.log("times", times);
// //         } catch (error) {
// //           console.error("Error fetching appointment times:", error);
// //         }
// //       }
// //     }
// //   };

// //   const generateAvailableStartTimes = (appointment, duration) => {
// //     const availableTimes = [];
// //     const startTime = new Date(
// //       Date.UTC(1970, 0, 1, ...appointment.appointmentStartTime.split(":"))
// //     );
// //     const endTime = new Date(
// //       Date.UTC(1970, 0, 1, ...appointment.appointmentEndTime.split(":"))
// //     );
// //     const durationMs = duration * 60 * 1000; // Convert duration to milliseconds

// //     let currentTime = startTime;

// //     while (currentTime.getTime() + durationMs <= endTime.getTime()) {
// //       availableTimes.push(currentTime.toISOString().substring(11, 16));
// //       currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // Increment by 30 minutes
// //     }

// //     return availableTimes;
// //   };

// //   const groupAppointmentsByDate = (appointments, duration) => {
// //     return appointments.reduce((acc, appointment) => {
// //       const [year, month, day] = appointment.appointmentDate.split("-");
// //       const date = new Date(Date.UTC(year, month - 1, day))
// //         .toISOString()
// //         .split("T")[0]; // Format date as YYYY-MM-DD
// //       if (!acc[date]) {
// //         acc[date] = [];
// //       }
// //       const availableTimes = generateAvailableStartTimes(appointment, duration);
// //       acc[date].push(...availableTimes);
// //       acc[date].sort(); // Sort times in chronological order
// //       return acc;
// //     }, {});
// //   };

// //   const renderAppointments = () => {
// //     const groupedAppointments = groupAppointmentsByDate(
// //       appointmentTimes,
// //       formData.duration
// //     );
// //     const today = new Date();
// //     today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

// //     const dates = Object.keys(groupedAppointments)
// //       .filter((date) => new Date(date) >= today) // Filter out past dates
// //       .sort((a, b) => new Date(a) - new Date(b))
// //       .slice(currentPage * 5, (currentPage + 1) * 5);

// //     return (
// //       <div className="appointments-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
// //         {dates.map((date, index) => {
// //           const appointmentDate = new Date(date + "T00:00:00Z"); // Ensure UTC time

// //           return (
// //             <div
// //               key={index}
// //               className="appointments-column bg-white shadow-md rounded-lg p-4"
// //             >
// //               <h4 className="text-lg font-semibold mb-2">
// //                 {appointmentDate.toLocaleDateString("en-US", {
// //                   weekday: "long",
// //                   year: "numeric",
// //                   month: "long",
// //                   day: "numeric",
// //                   timeZone: "UTC", // Ensure UTC time zone
// //                 })}
// //               </h4>
// //               <ul className="list-disc list-inside">
// //                 {groupedAppointments[date].map((startTime, idx) => {
// //                   const isSelected =
// //                     selectedAppointment &&
// //                     selectedAppointment.date === date &&
// //                     selectedAppointment.time === startTime;

// //                   return (
// //                     <li
// //                       key={idx}
// //                       className={`text-gray-700 cursor-pointer hover:bg-gray-200 p-2 rounded ${
// //                         isSelected ? "bg-blue-200" : ""
// //                       }`}
// //                       onClick={() => {
// //                         setSelectedAppointment({
// //                           date,
// //                           time: startTime,
// //                         });
// //                         setFormData({
// //                           ...formData,
// //                           appointmentTime: startTime,
// //                           appointmentDate: date,
// //                         });
// //                       }}
// //                     >
// //                       {startTime}
// //                     </li>
// //                   );
// //                 })}
// //               </ul>
// //             </div>
// //           );
// //         })}
// //       </div>
// //     );
// //   };

// //   const formatDate = (dateString) => {
// //     const [year, month, day] = dateString.split("-").map(Number);
// //     const date = new Date(Date.UTC(year, month - 1, day));
// //     return date.toLocaleDateString("en-US", {
// //       weekday: "long",
// //       year: "numeric",
// //       month: "long",
// //       day: "numeric",
// //       timeZone: "UTC", // Ensure UTC time zone
// //     });
// //   };

// //   const formatTime = (timeString) => {
// //     const [hour, minute] = timeString.split(":").map(Number);
// //     const date = new Date();
// //     date.setUTCHours(hour, minute); // Ensure UTC time
// //     return date.toLocaleTimeString("en-US", {
// //       hour: "2-digit",
// //       minute: "2-digit",
// //       hour12: true,
// //       timeZone: "UTC", // Ensure UTC time zone
// //     });
// //   };

// //   const nextStep = () => {
// //     if (currentStep === 1) {
// //       if (formData.location === "268 Shuter Street") {
// //         setCurrentStep(2); // Proceed to select duration
// //       } else if (formData.location === "workplace") {
// //         setCurrentStep(2.5); // Proceed to workplace selection
// //       }
// //     } else if (currentStep === 2.5) {
// //       // After selecting "workplace", regardless of which specific workplace is chosen, proceed to duration
// //       setCurrentStep(2); // Proceed to select duration
// //     } else if (currentStep === 2) {
// //       // After selecting duration (either from "268 Shuter St" or after workplace selection), proceed to time
// //       setCurrentStep(3); // Proceed to select time
// //     } else if (currentStep === 3) {
// //       // After selecting time, proceed to review appointment
// //       setCurrentStep(4); // Proceed to review appointment
// //     }
// //   };

// //   // const handleSubmit = (e) => {
// //   //   e.preventDefault();
// //   //   // Here you would typically send the formData to your database
// //   //   console.log("final", formData);
// //   // };

// //   return (
// //     <form
// //       action={async () => {
// //         await bookAppointment({
// //           location: formData.location,
// //           duration: formData.duration,
// //           appointmentTime: formData.appointmentTime,
// //           workplace: formData.workplace,
// //           appointmentDate: formData.appointmentDate,
// //           RMTLocationId: rmtSetup.find(
// //             (setup) =>
// //               setup.formattedFormData.address.streetAddress ===
// //               formData.location
// //           )._id,
// //         });
// //       }}
// //     >
// //       {currentStep === 1 && (
// //         <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
// //           <div className="flex items-center space-x-8">
// //             <div className="space-y-2 flex-grow">
// //               <div>
// //                 <div className="mb-4">
// //                   <h1 className="text-3xl">
// //                     Select the location where you would like to book a massage:
// //                   </h1>
// //                 </div>
// //                 <select
// //                   name="location"
// //                   value={formData.location}
// //                   onChange={handleInputChange}
// //                   required
// //                 >
// //                   <option value="" disabled selected>
// //                     Select a location
// //                   </option>
// //                   {rmtSetup.map((setup, index) => (
// //                     <option
// //                       key={index}
// //                       value={
// //                         setup?.formattedFormData?.address?.locationName
// //                           ? setup?.formattedFormData?.address?.locationName
// //                           : setup?.formattedFormData?.address?.streetAddress
// //                       }
// //                     >
// //                       {setup?.formattedFormData?.address?.locationName
// //                         ? setup?.formattedFormData?.address?.locationName
// //                         : setup?.formattedFormData?.address?.streetAddress}
// //                     </option>
// //                   ))}
// //                 </select>
// //               </div>
// //               <button className="btn" type="button" onClick={nextStep}>
// //                 Next
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //       {currentStep === 2.5 && (
// //         <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
// //           <div className="flex items-center space-x-8">
// //             <div className="space-y-2 flex-grow">
// //               <div>
// //                 <div className="mb-4">
// //                   <h1 className="text-3xl">Select your workplace:</h1>
// //                 </div>
// //                 <select
// //                   name="workplace"
// //                   value={formData.workplace}
// //                   onChange={handleInputChange}
// //                 >
// //                   <option value="workplace1">Workplace 1</option>
// //                   <option value="workplace2">Workplace 2</option>
// //                   // Add more workplaces as needed
// //                 </select>
// //               </div>
// //               <button
// //                 className="btn mr-3 bg-gray-500 text-white hover:bg-gray-600"
// //                 onClick={() => setCurrentStep(1)}
// //               >
// //                 Back
// //               </button>
// //               <button className="btn" type="button" onClick={nextStep}>
// //                 Next
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //       {currentStep === 2 && (
// //         <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
// //           <div className="flex items-center space-x-8">
// //             <div className="space-y-2 flex-grow">
// //               <div>
// //                 <div className="mb-4">
// //                   <h1 className="text-3xl">
// //                     What length of massage session would you like to book?
// //                   </h1>
// //                 </div>
// //                 <select
// //                   name="duration"
// //                   value={formData.duration}
// //                   onChange={handleInputChange}
// //                 >
// //                   <option value="" disabled>
// //                     Select a service
// //                   </option>
// //                   {rmtSetup
// //                     .filter(
// //                       (setup) =>
// //                         setup.formattedFormData.address.streetAddress ===
// //                         formData.location
// //                     )
// //                     .flatMap(
// //                       (setup) => setup.formattedFormData?.massageServices || []
// //                     )
// //                     .map((service, index) => (
// //                       <option key={index} value={service?.duration}>
// //                         {service?.duration} minute {service?.service} - $
// //                         {service?.price} {service?.plusHst ? "+HST" : ""}
// //                       </option>
// //                     ))}
// //                 </select>
// //               </div>
// //               <button
// //                 className="btn mr-3 bg-gray-500 text-white hover:bg-gray-600"
// //                 onClick={() => setCurrentStep(1)}
// //               >
// //                 Back
// //               </button>
// //               <button className="btn" type="button" onClick={nextStep}>
// //                 Next
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //       {currentStep === 3 && (
// //         <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
// //           <div className="flex items-center space-x-8">
// //             <div className="space-y-2 flex-grow">
// //               <div>
// //                 <div className="mb-4">
// //                   <h1 className="text-3xl">
// //                     Select a date and time for your massage:
// //                   </h1>
// //                 </div>
// //                 {appointmentTimes.length > 0 && (
// //                   <div>
// //                     {renderAppointments()}
// //                     <div className="pagination-controls">
// //                       <button
// //                         type="button"
// //                         onClick={() =>
// //                           setCurrentPage((prev) => Math.max(prev - 1, 0))
// //                         }
// //                         disabled={currentPage === 0}
// //                       >
// //                         Previous
// //                       </button>
// //                       <button
// //                         type="button"
// //                         onClick={() => setCurrentPage((prev) => prev + 1)}
// //                       >
// //                         Next
// //                       </button>
// //                     </div>
// //                   </div>
// //                 )}
// //               </div>
// //               <button
// //                 className="btn mr-3 bg-gray-500 text-white hover:bg-gray-600"
// //                 onClick={() => setCurrentStep(2)}
// //               >
// //                 Back
// //               </button>
// //               <button className="btn" type="button" onClick={nextStep}>
// //                 Next
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //       {currentStep === 4 && (
// //         <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
// //           <div className="flex items-center space-x-8">
// //             <div className="space-y-2 flex-grow">
// //               <div>
// //                 <div className="mb-4">
// //                   <h1 className="text-3xl">
// //                     Does the following information look correct?
// //                   </h1>
// //                 </div>
// //                 <p>
// //                   <strong>Location:</strong> {formData.location}
// //                 </p>
// //                 <p>
// //                   <strong>Duration:</strong> {formData.duration} minutes
// //                 </p>
// //                 <p>
// //                   <strong>Date:</strong> {formatDate(formData.appointmentDate)}
// //                 </p>
// //                 <p>
// //                   <strong>Time:</strong> {formatTime(formData.appointmentTime)}
// //                 </p>
// //               </div>
// //               <button className="btn mr-3" type="submit">
// //                 Yes, Book Appointment
// //               </button>
// //               <button
// //                 className="btn bg-gray-100 text-white hover:bg-gray-600"
// //                 type="button"
// //                 onClick={() => setCurrentStep(3)}
// //               >
// //                 No, Go Back
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </form>
// //   );
// // }

// // export default BookMassageForm;
