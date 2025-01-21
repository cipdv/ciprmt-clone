"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RMTIrregularSetup } from "@/app/_actions";

export default function TherapistSetupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    address: {
      locationName: "",
      streetAddress: "",
      city: "",
      province: "",
      country: "",
      postalCode: "",
    },
    contactInfo: {
      phone: "",
      email: "",
    },
    workDays: [],
    massageServices: [],
  });

  const [currentWorkDay, setCurrentWorkDay] = useState({
    date: "",
    appointmentTimes: [{ start: "", end: "" }],
  });

  const [currentService, setCurrentService] = useState({
    service: "",
    duration: "",
    price: "",
    plusHst: false,
  });

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      address: {
        ...prevData.address,
        [name]: value,
      },
    }));
  };

  const handleContactInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      contactInfo: {
        ...prevData.contactInfo,
        [name]: value,
      },
    }));
  };

  const handleWorkDayChange = (e) => {
    const { name, value } = e.target;
    setCurrentWorkDay((prevDay) => ({
      ...prevDay,
      [name]: value,
    }));
  };

  const handleAppointmentTimeChange = (index, field, value) => {
    setCurrentWorkDay((prevDay) => {
      const updatedTimes = [...prevDay.appointmentTimes];
      updatedTimes[index] = {
        ...updatedTimes[index],
        [field]: value,
      };
      return { ...prevDay, appointmentTimes: updatedTimes };
    });
  };

  const addAppointmentTime = () => {
    setCurrentWorkDay((prevDay) => ({
      ...prevDay,
      appointmentTimes: [...prevDay.appointmentTimes, { start: "", end: "" }],
    }));
  };

  const addWorkDay = () => {
    setFormData((prevData) => ({
      ...prevData,
      workDays: [...prevData.workDays, currentWorkDay],
    }));
    setCurrentWorkDay({
      date: "",
      appointmentTimes: [{ start: "", end: "" }],
    });
  };

  const handleServiceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentService((prevService) => ({
      ...prevService,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addService = () => {
    setFormData((prevData) => ({
      ...prevData,
      massageServices: [...prevData.massageServices, currentService],
    }));
    setCurrentService({
      service: "",
      duration: "",
      price: "",
      plusHst: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await RMTIrregularSetup(formData)
      .then(() => {
        router.push("/rmt/dashboard");
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6"
    >
      <h2 className="text-2xl font-bold  mb-6">New Irregular Location Setup</h2>

      {/* Address Section */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="locationName"
            value={formData.address.locationName}
            onChange={handleAddressChange}
            placeholder="Business Name"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            name="streetAddress"
            value={formData.address.streetAddress}
            onChange={handleAddressChange}
            placeholder="Street Address"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            name="city"
            value={formData.address.city}
            onChange={handleAddressChange}
            placeholder="City"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            name="province"
            value={formData.address.province}
            onChange={handleAddressChange}
            placeholder="Province"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            name="country"
            value={formData.address.country}
            onChange={handleAddressChange}
            placeholder="Country"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            name="postalCode"
            value={formData.address.postalCode}
            onChange={handleAddressChange}
            placeholder="Postal Code"
            className="w-full p-2 border rounded"
            required
          />
        </div>
      </div>

      {/* Contact Info Section */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="tel"
            name="phone"
            value={formData.contactInfo.phone}
            onChange={handleContactInfoChange}
            placeholder="Phone"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="email"
            name="email"
            value={formData.contactInfo.email}
            onChange={handleContactInfoChange}
            placeholder="Email"
            className="w-full p-2 border rounded"
            required
          />
        </div>
      </div>

      {/* Work Days Section */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Work Days</h3>
        <div className="mb-4">
          <input
            type="date"
            name="date"
            value={currentWorkDay.date}
            onChange={handleWorkDayChange}
            className="w-full p-2 border rounded mb-2"
          />
          {currentWorkDay.appointmentTimes.map((time, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="time"
                value={time.start}
                onChange={(e) =>
                  handleAppointmentTimeChange(index, "start", e.target.value)
                }
                className="w-1/2 p-2 border rounded"
              />
              <input
                type="time"
                value={time.end}
                onChange={(e) =>
                  handleAppointmentTimeChange(index, "end", e.target.value)
                }
                className="w-1/2 p-2 border rounded"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addAppointmentTime}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
          >
            Add Time Slot
          </button>
          <button
            type="button"
            onClick={addWorkDay}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add Work Day
          </button>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Added Work Days:</h4>
          <ul>
            {formData.workDays.map((day, index) => (
              <li key={index}>
                {day.date}:{" "}
                {day.appointmentTimes.map((time, i) => (
                  <span key={i}>
                    {time.start}-{time.end}
                    {i < day.appointmentTimes.length - 1 ? ", " : ""}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Massage Services Section */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Massage Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            name="service"
            value={currentService.service}
            onChange={handleServiceChange}
            placeholder="Service Name"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            name="duration"
            value={currentService.duration}
            onChange={handleServiceChange}
            placeholder="Duration (minutes)"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            name="price"
            value={currentService.price}
            onChange={handleServiceChange}
            placeholder="Price"
            className="w-full p-2 border rounded"
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              name="plusHst"
              checked={currentService.plusHst}
              onChange={handleServiceChange}
              className="mr-2"
            />
            <label htmlFor="plusHst">Plus HST</label>
          </div>
        </div>
        <button
          type="button"
          onClick={addService}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Add Service
        </button>
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Added Services:</h4>
          <ul>
            {formData.massageServices.map((service, index) => (
              <li key={index}>
                {service.service} - {service.duration} min, ${service.price}{" "}
                {service.plusHst ? "(Plus HST)" : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="submit"
        className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600"
      >
        Submit
      </button>
    </form>
  );
}

// "use client";

// import React, { useState } from "react";
// import { RMTSetup } from "@/app/_actions";

// const SetupFormIrregular = () => {
//   // form states
//   const [step, setStep] = useState(1);
//   const [address, setAddress] = useState({
//     locationName: "",
//     streetAddress: "",
//     city: "",
//     province: "",
//     country: "",
//     postalCode: "",
//   });
//   const [contactInfo, setContactInfo] = useState({
//     email: "",
//     phone: "",
//   });
//   const [tempDate, setTempDate] = useState("");
//   const [irregularDates, setIrregularDates] = useState([]);
//   const [irregularAppointments, setIrregularAppointments] = useState([]);
//   const [newService, setNewService] = useState({
//     service: "",
//     duration: "",
//     price: "",
//     plusHst: false,
//   });
//   const [massageServices, setMassageServices] = useState([]);
//   const [currentDayIndex, setCurrentDayIndex] = useState(0);
//   const [newAppointment, setNewAppointment] = useState({ start: "", end: "" });
//   const [error, setError] = useState("");
//   const [workDays, setWorkDays] = useState([]);

//   //   form functions
//   const handleAddressChange = (e) => {
//     const { name, value } = e.target;
//     setAddress((prevAddress) => ({
//       ...prevAddress,
//       [name]: value,
//     }));
//   };

//   const handleContactInfoChange = (e) => {
//     const { name, value } = e.target;
//     setContactInfo((prevContactInfo) => ({
//       ...prevContactInfo,
//       [name]: value,
//     }));
//   };

//   const handleSetMassageService = (e) => {
//     e.preventDefault();
//     setMassageServices((prevServices) => [...prevServices, newService]);
//     setNewService({ service: "", duration: "", price: "", plusHst: false });
//   };

//   const handleDeleteMassageService = (e, index) => {
//     e.preventDefault();
//     setMassageServices((prevServices) =>
//       prevServices.filter((_, i) => i !== index)
//     );
//   };

//   const handleNextDay = (e) => {
//     e.preventDefault(); // Prevent form submission
//     if (currentDayIndex < workDays.length - 1) {
//       setCurrentDayIndex(currentDayIndex + 1);
//       setError(""); // Clear error state
//       setNewAppointment({ start: "", end: "" }); // Clear time pickers
//     }
//   };

//   const handlePreviousDay = (e) => {
//     e.preventDefault(); // Prevent form submission
//     if (currentDayIndex > 0) {
//       setCurrentDayIndex(currentDayIndex - 1);
//       setError(""); // Clear error state
//       setNewAppointment({ start: "", end: "" }); // Clear time pickers
//     }
//   };

//   const handleFlexibleInputChange = (dayIndex, field, value) => {
//     setWorkDays((prevWorkDays) => {
//       const updatedWorkDays = [...prevWorkDays];
//       updatedWorkDays[dayIndex] = {
//         ...updatedWorkDays[dayIndex],
//         [field]: value,
//       };
//       return updatedWorkDays;
//     });
//   };

//   const handleScheduleTypeChange = (index, scheduleType) => {
//     setWorkDays((prevWorkDays) => {
//       const updatedWorkDays = [...prevWorkDays];
//       updatedWorkDays[index] = {
//         ...updatedWorkDays[index],
//         scheduleType,
//       };
//       return updatedWorkDays;
//     });
//   };

//   const isOverlapping = (newStart, newEnd, existingAppointments) => {
//     for (let appointment of existingAppointments) {
//       const existingStart = new Date(`1970-01-01T${appointment.start}:00`);
//       const existingEnd = new Date(`1970-01-01T${appointment.end}:00`);
//       const newStartTime = new Date(`1970-01-01T${newStart}:00`);
//       const newEndTime = new Date(`1970-01-01T${newEnd}:00`);

//       if (
//         (newStartTime >= existingStart && newStartTime < existingEnd) ||
//         (newEndTime > existingStart && newEndTime <= existingEnd) ||
//         (newStartTime <= existingStart && newEndTime >= existingEnd)
//       ) {
//         return true;
//       }
//     }
//     return false;
//   };

//   const handleSetAppointment = (e) => {
//     e.preventDefault(); // Prevent form submission
//     const currentDayAppointments = workDays[currentDayIndex].appointmentTimes;
//     if (newAppointment.start && newAppointment.end) {
//       const newStartTime = new Date(`1970-01-01T${newAppointment.start}:00`);
//       const newEndTime = new Date(`1970-01-01T${newAppointment.end}:00`);

//       if (newEndTime <= newStartTime) {
//         setError("The end time must be later than the start time.");
//       } else if (
//         isOverlapping(
//           newAppointment.start,
//           newAppointment.end,
//           currentDayAppointments
//         )
//       ) {
//         setError("The appointment times overlap with an existing appointment.");
//       } else {
//         const updatedWorkDays = workDays.map((workDay, index) => {
//           if (index === currentDayIndex) {
//             return {
//               ...workDay,
//               appointmentTimes: [
//                 ...workDay.appointmentTimes,
//                 { start: newAppointment.start, end: newAppointment.end },
//               ],
//             };
//           }
//           return workDay;
//         });

//         setWorkDays(updatedWorkDays);
//         setNewAppointment({ start: "", end: "" });
//         setError("");
//       }
//     } else {
//       setError("Please fill in both start and end times.");
//     }
//   };

//   const handleDeleteAppointment = (index) => {
//     const updatedWorkDays = [...workDays];
//     updatedWorkDays[currentDayIndex].appointmentTimes.splice(index, 1);
//     setWorkDays(updatedWorkDays);
//   };

//   const StepButtons = () => {
//     const nextStep = () => {
//       setStep((prevStep) => prevStep + 1);
//     };

//     const prevStep = () => {
//       setStep((prevStep) => (prevStep > 0 ? prevStep - 1 : 0));
//     };

//     return (
//       <div>
//         {step > 1 && (
//           <button className="btn mt-4 mr-2" onClick={prevStep}>
//             Previous Step
//           </button>
//         )}
//         <button className="btn mt-4" onClick={nextStep}>
//           Next Step
//         </button>
//       </div>
//     );
//   };

//   const handleWorkDaysChange = (e) => {
//     const { value, checked } = e.target;
//     setWorkDays((prevWorkDays) => {
//       let updatedWorkDays;
//       if (checked) {
//         // Add the day to the array
//         updatedWorkDays = [
//           ...prevWorkDays,
//           { day: value, scheduleType: "", appointmentTimes: [] },
//         ];
//       } else {
//         // Remove the day from the array
//         updatedWorkDays = prevWorkDays.filter((day) => day.day !== value);
//       }
//       return updatedWorkDays;
//     });
//   };

//   const prevStep = () => {
//     setStep((prevStep) => (prevStep > 0 ? prevStep - 1 : 0));
//   };

//   //   submit function
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     const formData = {
//       address,
//       contactInfo,
//       workplaceType,
//       massageServices,
//       workDays,
//     };
//   };

//   return (
//     <form
//       action={async () => {
//         console.log(
//           RMTSetup({
//             address,
//             contactInfo,
//             massageServices,
//             workDays: {
//               irregularDates,
//               irregularAppointments,
//             },
//             irregularDates,
//             irregularAppointments,
//           })
//         );
//         // await RMTSetup({
//         //   address,
//         //   contactInfo,
//         //   workplaceType,
//         //   massageServices,
//         //   workDays,
//         // });
//       }}
//     >
//       {step === 1 && (
//         <div className="mx-auto max-w-4xl px-4 mt-20 mb-28">
//           <div className="flex items-center space-x-8">
//             <div className="space-y-2 flex-grow">
//               <div>
//                 <div className="mb-4">
//                   <h1 className="text-3xl">
//                     Let's set up a new irregular massage location and schedule:
//                   </h1>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div className="space-y-4">
//             <label className="block">
//               Location Name:
//               <input
//                 type="text"
//                 name="locationName"
//                 value={address.locationName}
//                 onChange={handleAddressChange}
//                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//               />
//             </label>
//             <label className="block">
//               Street Address:
//               <input
//                 type="text"
//                 name="streetAddress"
//                 value={address.streetAddress}
//                 onChange={handleAddressChange}
//                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//               />
//             </label>

//             <label className="block">
//               City:
//               <input
//                 type="text"
//                 name="city"
//                 value={address.city}
//                 onChange={handleAddressChange}
//                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//               />
//             </label>
//             <label className="block">
//               Province:
//               <input
//                 type="text"
//                 name="province"
//                 value={address.province}
//                 onChange={handleAddressChange}
//                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//               />
//             </label>
//             <label className="block">
//               Country:
//               <input
//                 type="text"
//                 name="country"
//                 value={address.country}
//                 onChange={handleAddressChange}
//                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//               />
//             </label>
//             <label className="block">
//               Postal Code:
//               <input
//                 type="text"
//                 name="postalCode"
//                 value={address.postalCode}
//                 onChange={handleAddressChange}
//                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//               />
//             </label>
//           </div>
//           <StepButtons />
//         </div>
//       )}
//       {step === 2 && (
//         <div className="mx-auto max-w-4xl px-4 mt-20 mb-28">
//           <div className="flex items-center space-x-8">
//             <div className="space-y-2 flex-grow">
//               <div>
//                 <div className="mb-4">
//                   <h1 className="text-3xl mb-4">
//                     What is the contact information for{" "}
//                     {address.locationName
//                       ? address.locationName
//                       : address.streetAddress}
//                     ?
//                   </h1>
//                   <div>
//                     <label>Email address</label>
//                     <input
//                       type="email"
//                       name="email"
//                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//                       value={contactInfo.email}
//                       onChange={handleContactInfoChange}
//                     />
//                     <label>Phone number</label>
//                     <input
//                       type="tel"
//                       name="phone"
//                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
//                       value={contactInfo.phone}
//                       onChange={handleContactInfoChange}
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <StepButtons />
//         </div>
//       )}

//       {step === 3 && (
//         <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
//           <div className="flex items-center space-x-8">
//             <div className="space-y-2 flex-grow">
//               <div>
//                 <div className="mb-4">
//                   <h1 className="text-3xl">
//                     What services do you offer at{" "}
//                     {address.locationName
//                       ? address.locationName
//                       : address.streetAddress}
//                     ?
//                   </h1>
//                 </div>
//                 <div className="space-y-3">
//                   {massageServices?.length > 0 ? (
//                     massageServices.map((service, index) => (
//                       <div key={index}>
//                         <div key={index}>
//                           <p>
//                             {service.duration} minute {service.service}: $
//                             {service.price} {service.plusHst ? " +HST" : ""}
//                             <button
//                               type="button"
//                               className="text-red-500 ml-4"
//                               onClick={(e) =>
//                                 handleDeleteMassageService(e, index)
//                               }
//                             >
//                               Delete
//                             </button>
//                           </p>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p>No services set</p>
//                   )}
//                   <div>
//                     <label>
//                       Duration:
//                       <select
//                         className="p-1"
//                         value={newService.duration}
//                         onChange={(e) =>
//                           setNewService({
//                             ...newService,
//                             duration: e.target.value,
//                           })
//                         }
//                       >
//                         <option value="">Select</option>
//                         <option value="15">15 minutes</option>
//                         <option value="30">30 minutes</option>
//                         <option value="45">45 minutes</option>
//                         <option value="60">60 minutes</option>
//                         <option value="75">75 minutes</option>
//                         <option value="90">90 minutes</option>
//                         <option value="120">120 minutes</option>
//                       </select>
//                     </label>
//                   </div>
//                   <div>
//                     <label>
//                       Service:
//                       <input
//                         className="p-1"
//                         type="text"
//                         name="service"
//                         placeholder="e.g. Swedish Massage"
//                         value={newService.service}
//                         onChange={(e) =>
//                           setNewService({
//                             ...newService,
//                             service: e.target.value,
//                           })
//                         }
//                       />
//                     </label>
//                   </div>
//                   <div>
//                     <label>
//                       Price:
//                       <input
//                         className="p-1"
//                         type="text"
//                         name="price"
//                         value={newService.price}
//                         onChange={(e) =>
//                           setNewService({
//                             ...newService,
//                             price: e.target.value,
//                           })
//                         }
//                       />
//                     </label>
//                     <label className="ml-5">
//                       Plus HST?
//                       <input
//                         className="ml-2"
//                         type="checkbox"
//                         name="plusHst"
//                         checked={newService.plusHst}
//                         onChange={(e) =>
//                           setNewService({
//                             ...newService,
//                             plusHst: e.target.checked,
//                           })
//                         }
//                       />
//                     </label>
//                   </div>
//                   <button
//                     className="btn-orange"
//                     type="button"
//                     onClick={handleSetMassageService}
//                   >
//                     Set Service
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <StepButtons />
//         </div>
//       )}
//       {step === 4 && (
//         <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
//           <div className="flex items-center space-x-8">
//             <div className="space-y-2 flex-grow">
//               <div>
//                 <div className="mb-4">
//                   <h1 className="text-3xl">
//                     Let's set up your schedule for{" "}
//                     {address.locationName
//                       ? address.locationName
//                       : address.streetAddress}
//                     :
//                   </h1>
//                 </div>
//                 <div>
//                   <h2 className="text-xl mb-4">
//                     What are the dates you will be at this location?
//                   </h2>
//                 </div>
//                 <div>
//                   <div>
//                     <label>
//                       Add dates you will be working at this location:
//                       <input
//                         type="date"
//                         onChange={(e) => setTempDate(e.target.value)}
//                         className="border border-gray-300 rounded-md p-2"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => {
//                           if (tempDate && !irregularDates.includes(tempDate)) {
//                             setIrregularDates((prevDates) => [
//                               ...prevDates,
//                               tempDate,
//                             ]);
//                             setTempDate(""); // Clear tempDate after confirmation
//                           }
//                         }}
//                         className="ml-4 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700"
//                       >
//                         Add Date
//                       </button>
//                     </label>
//                   </div>
//                   <div className="mt-2">
//                     <h3 className="text-lg font-semibold">Selected Dates:</h3>
//                     <ul>
//                       {irregularDates.map((date, index) => (
//                         <li key={index}>
//                           {new Date(date).toLocaleDateString()}
//                           <button
//                             type="button"
//                             onClick={() => {
//                               setIrregularDates((prevDates) =>
//                                 prevDates.filter((d) => d !== date)
//                               );
//                             }}
//                             className="ml-4 text-red-500 hover:text-red-700"
//                           >
//                             Remove
//                           </button>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <StepButtons />
//         </div>
//       )}

//       {step === 5 && (
//         <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
//           <h2 className="text-xl mb-4">
//             Set appointment times for each selected date:
//           </h2>
//           {irregularDates.map((date) => (
//             <div key={date} className="mb-6">
//               <h3 className="text-lg font-semibold mb-2">
//                 {new Date(date).toLocaleDateString()}
//               </h3>
//               <div className="space-y-2">
//                 {irregularAppointments[date]?.length > 0 ? (
//                   irregularAppointments[date].map((appointment, index) => (
//                     <div key={index} className="flex items-center space-x-2">
//                       <p>
//                         {appointment.start} - {appointment.end}
//                       </p>
//                       <button
//                         type="button"
//                         onClick={() => {
//                           const newAppointments = { ...irregularAppointments };
//                           newAppointments[date] = newAppointments[date].filter(
//                             (_, i) => i !== index
//                           );
//                           setIrregularAppointments(newAppointments);
//                         }}
//                         className="text-red-500"
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   ))
//                 ) : (
//                   <p>No appointments set</p>
//                 )}
//                 <div className="flex items-center space-x-2">
//                   <input
//                     type="time"
//                     value={newAppointment.start}
//                     onChange={(e) =>
//                       setNewAppointment({
//                         ...newAppointment,
//                         start: e.target.value,
//                       })
//                     }
//                     className="border rounded p-1"
//                   />
//                   <span>-</span>
//                   <input
//                     type="time"
//                     value={newAppointment.end}
//                     onChange={(e) =>
//                       setNewAppointment({
//                         ...newAppointment,
//                         end: e.target.value,
//                       })
//                     }
//                     className="border rounded p-1"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => {
//                       if (newAppointment.start && newAppointment.end) {
//                         setIrregularAppointments((prev) => ({
//                           ...prev,
//                           [date]: [...(prev[date] || []), newAppointment],
//                         }));
//                         setNewAppointment({ start: "", end: "" });
//                       }
//                     }}
//                     className="bg-blue-500 text-white px-2 py-1 rounded"
//                   >
//                     Add
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ))}
//           <StepButtons />
//         </div>
//       )}
//       {step === 6 && (
//         <div>
//           <div className="mx-auto max-w-4xl px-4 mt-20 mb-4">
//             <div className="flex items-center space-x-8">
//               <div className="space-y-2 flex-grow">
//                 <div>
//                   <div className="mb-4">
//                     <h1 className="text-3xl">
//                       Does this schedule for{" "}
//                       {address.locationName
//                         ? address.locationName
//                         : address.streetAddress}{" "}
//                       look correct?
//                     </h1>
//                   </div>
//                   <div>
//                     <h2 className="text-xl mb-4">Location Information</h2>
//                     <p>
//                       <strong>Location Name:</strong> {address.locationName}
//                     </p>
//                     <p>
//                       <strong>Street Address:</strong> {address.streetAddress}
//                     </p>
//                     <p>
//                       <strong>City:</strong> {address.city}
//                     </p>
//                     <p>
//                       <strong>Province:</strong> {address.province}
//                     </p>
//                     <p>
//                       <strong>Country:</strong> {address.country}
//                     </p>
//                     <p>
//                       <strong>Postal Code:</strong> {address.postalCode}
//                     </p>
//                   </div>
//                   <div>
//                     <h2 className="text-xl mb-4">Contact Information</h2>
//                     <p>
//                       <strong>Email:</strong> {contactInfo.email}
//                     </p>
//                     <p>
//                       <strong>Phone:</strong> {contactInfo.phone}
//                     </p>
//                   </div>

//                   <div>
//                     <h2 className="text-xl mb-4">Massage Services</h2>
//                     {massageServices.map((service, index) => (
//                       <div key={index}>
//                         <p>
//                           {service.duration} minute {service.service}: $
//                           {service.price} {service.plusHst ? " +HST" : ""}
//                         </p>
//                       </div>
//                     ))}
//                   </div>
//                   <div>
//                     <h2 className="text-xl mb-4">Dates</h2>
//                     {irregularDates.map((day, index) => (
//                       <div key={index}>
//                         <h3 className="text-lg font-semibold">{day}</h3>
//                       </div>
//                     ))}
//                     <h2 className="text-xl mb-4">Appointment Times</h2>
//                     {irregularAppointments.map((appointment, index) => (
//                       <div key={index}>
//                         <p>
//                           {appointment.start} - {appointment.end}
//                         </p>
//                       </div>
//                     ))}
//                   </div>

//                   <div>
//                     <button type="button" className="btn" onClick={prevStep}>
//                       No, go back
//                     </button>
//                     <button type="submit" className="btn-orange">
//                       Yes, submit
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </form>
//   );
// };

// export default SetupFormIrregular;
