// "use client";

// import React, { useState } from "react";
// import { useRouter } from "next/navigation";
// import { RMTIrregularSetup } from "@/app/_actions";

// export default function TherapistSetupForm() {
//   const router = useRouter();
//   const [formData, setFormData] = useState({
//     address: {
//       locationName: "",
//       streetAddress: "",
//       city: "",
//       province: "",
//       country: "",
//       postalCode: "",
//     },
//     locationDetails: {
//       description: "",
//       payment: "",
//       whatToWear: "",
//     },
//     contactInfo: {
//       phone: "",
//       email: "",
//     },
//     workDays: [],
//     massageServices: [],
//   });

//   const [currentWorkDay, setCurrentWorkDay] = useState({
//     date: "",
//     appointmentTimes: [{ start: "", end: "" }],
//   });

//   const [currentService, setCurrentService] = useState({
//     service: "",
//     duration: "",
//     price: "",
//     plusHst: false,
//   });

//   const handleAddressChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prevData) => ({
//       ...prevData,
//       address: {
//         ...prevData.address,
//         [name]: value,
//       },
//     }));
//   };

//   const handleContactInfoChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prevData) => ({
//       ...prevData,
//       contactInfo: {
//         ...prevData.contactInfo,
//         [name]: value,
//       },
//     }));
//   };

//   const handleWorkDayChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentWorkDay((prevDay) => ({
//       ...prevDay,
//       [name]: value,
//     }));
//   };

//   const handleAppointmentTimeChange = (index, field, value) => {
//     setCurrentWorkDay((prevDay) => {
//       const updatedTimes = [...prevDay.appointmentTimes];
//       updatedTimes[index] = {
//         ...updatedTimes[index],
//         [field]: value,
//       };
//       return { ...prevDay, appointmentTimes: updatedTimes };
//     });
//   };

//   const addAppointmentTime = () => {
//     setCurrentWorkDay((prevDay) => ({
//       ...prevDay,
//       appointmentTimes: [...prevDay.appointmentTimes, { start: "", end: "" }],
//     }));
//   };

//   const addWorkDay = () => {
//     setFormData((prevData) => ({
//       ...prevData,
//       workDays: [...prevData.workDays, currentWorkDay],
//     }));
//     setCurrentWorkDay({
//       date: "",
//       appointmentTimes: [{ start: "", end: "" }],
//     });
//   };

//   const handleServiceChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setCurrentService((prevService) => ({
//       ...prevService,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const addService = () => {
//     setFormData((prevData) => ({
//       ...prevData,
//       massageServices: [...prevData.massageServices, currentService],
//     }));
//     setCurrentService({
//       service: "",
//       duration: "",
//       price: "",
//       plusHst: false,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     await RMTIrregularSetup(formData)
//       .then(() => {
//         router.push("/rmt/dashboard");
//       })
//       .catch((error) => {
//         console.error(error);
//       });
//   };

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6"
//     >
//       <h2 className="text-2xl font-bold  mb-6">New Irregular Location Setup</h2>

//       {/* Address Section */}
//       <div className="mb-6">
//         <h3 className="text-xl font-semibold mb-4">Address</h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <input
//             type="text"
//             name="locationName"
//             value={formData.address.locationName}
//             onChange={handleAddressChange}
//             placeholder="Business Name"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <input
//             type="text"
//             name="streetAddress"
//             value={formData.address.streetAddress}
//             onChange={handleAddressChange}
//             placeholder="Street Address"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <input
//             type="text"
//             name="city"
//             value={formData.address.city}
//             onChange={handleAddressChange}
//             placeholder="City"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <input
//             type="text"
//             name="province"
//             value={formData.address.province}
//             onChange={handleAddressChange}
//             placeholder="Province"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <input
//             type="text"
//             name="country"
//             value={formData.address.country}
//             onChange={handleAddressChange}
//             placeholder="Country"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <input
//             type="text"
//             name="postalCode"
//             value={formData.address.postalCode}
//             onChange={handleAddressChange}
//             placeholder="Postal Code"
//             className="w-full p-2 border rounded"
//             required
//           />
//         </div>
//       </div>
//       <div>
//         <h3 className="text-xl font-semibold mb-4">Location Details</h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <textarea
//             name="description"
//             value={formData.locationDetails.description}
//             onChange={(e) =>
//               setFormData((prevData) => ({
//                 ...prevData,
//                 locationDetails: {
//                   ...prevData.locationDetails,
//                   description: e.target.value,
//                 },
//               }))
//             }
//             placeholder="Description"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <textarea
//             name="payment"
//             value={formData.locationDetails.payment}
//             onChange={(e) =>
//               setFormData((prevData) => ({
//                 ...prevData,
//                 locationDetails: {
//                   ...prevData.locationDetails,
//                   payment: e.target.value,
//                 },
//               }))
//             }
//             placeholder="Payment"
//             className="w-full p-2 border rounded"
//           />
//           <textarea
//             name="whatToWear"
//             value={formData.locationDetails.whatToWear}
//             onChange={(e) =>
//               setFormData((prevData) => ({
//                 ...prevData,
//                 locationDetails: {
//                   ...prevData.locationDetails,
//                   whatToWear: e.target.value,
//                 },
//               }))
//             }
//             placeholder="What to Wear"
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>

//       {/* Contact Info Section */}
//       <div className="mb-6">
//         <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <input
//             type="tel"
//             name="phone"
//             value={formData.contactInfo.phone}
//             onChange={handleContactInfoChange}
//             placeholder="Phone"
//             className="w-full p-2 border rounded"
//             required
//           />
//           <input
//             type="email"
//             name="email"
//             value={formData.contactInfo.email}
//             onChange={handleContactInfoChange}
//             placeholder="Email"
//             className="w-full p-2 border rounded"
//             required
//           />
//         </div>
//       </div>

//       {/* Work Days Section */}
//       <div className="mb-6">
//         <h3 className="text-xl font-semibold mb-4">Work Days</h3>
//         <div className="mb-4">
//           <input
//             type="date"
//             name="date"
//             value={currentWorkDay.date}
//             onChange={handleWorkDayChange}
//             className="w-full p-2 border rounded mb-2"
//           />
//           {currentWorkDay.appointmentTimes.map((time, index) => (
//             <div key={index} className="flex gap-2 mb-2">
//               <input
//                 type="time"
//                 value={time.start}
//                 onChange={(e) =>
//                   handleAppointmentTimeChange(index, "start", e.target.value)
//                 }
//                 className="w-1/2 p-2 border rounded"
//               />
//               <input
//                 type="time"
//                 value={time.end}
//                 onChange={(e) =>
//                   handleAppointmentTimeChange(index, "end", e.target.value)
//                 }
//                 className="w-1/2 p-2 border rounded"
//               />
//             </div>
//           ))}
//           <button
//             type="button"
//             onClick={addAppointmentTime}
//             className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
//           >
//             Add Time Slot
//           </button>
//           <button
//             type="button"
//             onClick={addWorkDay}
//             className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
//           >
//             Add Work Day
//           </button>
//         </div>
//         <div>
//           <h4 className="font-semibold mb-2">Added Work Days:</h4>
//           <ul>
//             {formData.workDays.map((day, index) => (
//               <li key={index}>
//                 {day.date}:{" "}
//                 {day.appointmentTimes.map((time, i) => (
//                   <span key={i}>
//                     {time.start}-{time.end}
//                     {i < day.appointmentTimes.length - 1 ? ", " : ""}
//                   </span>
//                 ))}
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>

//       {/* Massage Services Section */}
//       <div className="mb-6">
//         <h3 className="text-xl font-semibold mb-4">Massage Services</h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//           <input
//             type="text"
//             name="service"
//             value={currentService.service}
//             onChange={handleServiceChange}
//             placeholder="Service Name"
//             className="w-full p-2 border rounded"
//           />
//           <input
//             type="number"
//             name="duration"
//             value={currentService.duration}
//             onChange={handleServiceChange}
//             placeholder="Duration (minutes)"
//             className="w-full p-2 border rounded"
//           />
//           <input
//             type="number"
//             name="price"
//             value={currentService.price}
//             onChange={handleServiceChange}
//             placeholder="Price"
//             className="w-full p-2 border rounded"
//           />
//           <div className="flex items-center">
//             <input
//               type="checkbox"
//               name="plusHst"
//               checked={currentService.plusHst}
//               onChange={handleServiceChange}
//               className="mr-2"
//             />
//             <label htmlFor="plusHst">Plus HST</label>
//           </div>
//         </div>
//         <button
//           type="button"
//           onClick={addService}
//           className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
//         >
//           Add Service
//         </button>
//         <div className="mt-4">
//           <h4 className="font-semibold mb-2">Added Services:</h4>
//           <ul>
//             {formData.massageServices.map((service, index) => (
//               <li key={index}>
//                 {service.service} - {service.duration} min, ${service.price}{" "}
//                 {service.plusHst ? "(Plus HST)" : ""}
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>

//       <button
//         type="submit"
//         className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600"
//       >
//         Submit
//       </button>
//     </form>
//   );
// }

import React from "react";

const SetUpFormIrregular = () => {
  return <div>SetUpFormIrregular</div>;
};

export default SetUpFormIrregular;
