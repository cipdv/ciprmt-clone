"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { healthHistorySchema } from "@/app/lib/zod/zodSchemas";
import { addHealthHistory } from "@/app/_actions";

export default function HealthHistoryForm({ user, initialHealthHistory }) {
  const router = useRouter();
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    occupation: "",
    dateOfBirth: "",
    preferredLanguage: "",
    accessibilityNeeds: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: {
      streetNumber: "",
      streetName: "",
      city: "",
      province: "",
    },
    doctor: {
      noDoctor: false,
      doctorName: "",
      doctorAddress: {
        doctorStreetNumber: "",
        doctorStreetName: "",
        doctorCity: "",
        doctorProvince: "",
      },
    },
    generalHealth: "",
    historyOfMassage: "",
    otherHCP: "",
    injuries: "",
    surgeries: "",
    medicalConditions: {
      epilepsy: false,
      diabetes: false,
      cancer: false,
      arthritis: false,
      arthritisFamilyHistory: false,
      chronicHeadaches: false,
      migraineHeadaches: false,
      visionLoss: false,
      hearingLoss: false,
      osteoporosis: false,
      haemophilia: false,
    },
    cardiovascularConditions: {
      highBloodPressure: false,
      lowBloodPressure: false,
      heartAttack: false,
      stroke: false,
      vericoseVeins: false,
      pacemaker: false,
      heartDisease: false,
    },
    respiratoryConditions: {
      chronicCough: false,
      bronchitis: false,
      asthma: false,
      emphysema: false,
    },
    internalEquipment: "",
    skinConditions: "",
    infectiousConditions: "",
    lossOfFeeling: "",
    allergies: "",
    medications: "",
    pregnant: "",
    otherMedicalConditions: "",
    sourceOfReferral: "",
    practitionerReferral: {
      hasReferral: false,
      practitionerName: "",
      practitionerAddress: "",
    },
    privacyPolicy: false,
  });
  const [errors, setErrors] = useState({});
  const errorRefs = useRef({});

  useEffect(() => {
    if (initialHealthHistory) {
      setFormData((prevData) => ({
        ...prevData,
        ...initialHealthHistory,
        dateOfBirth: initialHealthHistory.dateOfBirth
          ? new Date(initialHealthHistory.dateOfBirth)
              .toISOString()
              .split("T")[0]
          : "",
        preferredLanguage: initialHealthHistory.preferredLanguage || "",
        accessibilityNeeds: initialHealthHistory.accessibilityNeeds || "",
        emergencyContactName: initialHealthHistory.emergencyContactName || "",
        emergencyContactPhone: initialHealthHistory.emergencyContactPhone || "",
        practitionerReferral: initialHealthHistory.practitionerReferral || {
          hasReferral: false,
          practitionerName: "",
          practitionerAddress: "",
        },
      }));
    }
  }, [initialHealthHistory]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [field]: value,
      },
    }));
  };

  const validateForm = async () => {
    try {
      await healthHistorySchema.parseAsync(formData);
      setErrors({});
      return { isValid: true, errors: {} };
    } catch (error) {
      const newErrors = {};
      error.errors.forEach((err) => {
        newErrors[err.path.join(".")] = err.message;
      });
      setErrors(newErrors);
      return { isValid: false, errors: newErrors };
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = await validateForm();

    if (isValid) {
      try {
        const dataToSubmit = {
          ...formData,
          userId: user?.id || "defaultUserId",
        };
        const result = await addHealthHistory(dataToSubmit);
        if (result.success) {
          router.push("/submission-success");
        } else {
          alert("Health history updated successfully.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error submitting health history:", error);
        alert(
          "There was an error updating your health history. Please try again."
        );
      }
    } else {
      const firstErrorField = Object.keys(validationErrors)[0];
      if (errorRefs.current[firstErrorField]) {
        errorRefs.current[firstErrorField].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Focus the input field for better UX
        const inputElement = errorRefs.current[firstErrorField].querySelector(
          "input, select, textarea"
        );
        if (inputElement) {
          setTimeout(() => inputElement.focus(), 300);
        }
      }
    }
  };

  const renderField = (
    name,
    label,
    type = "text",
    options = null,
    required = false
  ) => {
    const nameParts = name.split(".");
    const value =
      nameParts.reduce((obj, key) => obj && obj[key], formData) ?? "";
    const error = errors[name];

    const handleChange = (e) => {
      const { value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;

      if (nameParts.length === 1) {
        handleInputChange(e);
      } else if (nameParts.length === 2) {
        handleNestedInputChange(nameParts[0], nameParts[1], newValue);
      } else if (nameParts.length === 3) {
        setFormData((prevData) => ({
          ...prevData,
          [nameParts[0]]: {
            ...prevData[nameParts[0]],
            [nameParts[1]]: {
              ...prevData[nameParts[0]][nameParts[1]],
              [nameParts[2]]: newValue,
            },
          },
        }));
      }

      if (error) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    };

    const inputClassName = `w-full p-2 border rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800 ${
      error
        ? "border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500"
        : "border-gray-300"
    }`;

    return (
      <div className="mb-4" ref={(el) => (errorRefs.current[name] = el)}>
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {type === "select" ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            className={inputClassName}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            className={inputClassName}
            rows={4}
          />
        ) : type === "checkbox" ? (
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={value}
            onChange={handleChange}
            className="h-4 w-4 text-gray-800 focus:ring-gray-800 border-gray-300 rounded"
          />
        ) : (
          <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            className={inputClassName}
          />
        )}
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-4xl mx-auto px-4 py-8 space-y-8"
      ref={formRef}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Personal Information</h2>
        {renderField("occupation", "Occupation", "text", null, true)}
        {renderField("dateOfBirth", "Date of Birth", "date", null, true)}
        {renderField("preferredLanguage", "Preferred Language")}
        {renderField(
          "accessibilityNeeds",
          "Accessibility & Mobility Needs",
          "textarea"
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Address</h2>
        <div className="grid grid-cols-2 gap-4">
          {renderField(
            "address.streetNumber",
            "Street Number",
            "text",
            null,
            true
          )}
          {renderField("address.streetName", "Street Name", "text", null, true)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {renderField("address.city", "City", "text", null, true)}
          {renderField(
            "address.province",
            "Province",
            "select",
            [
              { value: "ON", label: "Ontario" },
              { value: "AB", label: "Alberta" },
              { value: "BC", label: "British Columbia" },
              { value: "MB", label: "Manitoba" },
              { value: "NB", label: "New Brunswick" },
              { value: "NL", label: "Newfoundland and Labrador" },
              { value: "NS", label: "Nova Scotia" },
              { value: "NT", label: "Northwest Territories" },
              { value: "NU", label: "Nunavut" },
              { value: "PE", label: "Prince Edward Island" },
              { value: "QC", label: "Quebec" },
              { value: "SK", label: "Saskatchewan" },
              { value: "YT", label: "Yukon" },
            ],
            true
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Emergency Contact Information</h2>
        {renderField(
          "emergencyContactName",
          "Emergency Contact Name",
          "text",
          null,
          true
        )}
        {renderField(
          "emergencyContactPhone",
          "Emergency Contact Phone Number",
          "tel",
          null,
          true
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Doctor's Information</h2>
        {renderField(
          "doctor.noDoctor",
          "I currently do not have a family doctor",
          "checkbox"
        )}
        {!formData.doctor.noDoctor && (
          <>
            {renderField("doctor.doctorName", "Doctor's Name")}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Doctor's Address</h3>
              <div className="grid grid-cols-2 gap-4">
                {renderField(
                  "doctor.doctorAddress.doctorStreetNumber",
                  "Doctor's Street Number"
                )}
                {renderField(
                  "doctor.doctorAddress.doctorStreetName",
                  "Doctor's Street Name"
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderField(
                  "doctor.doctorAddress.doctorCity",
                  "Doctor's City"
                )}
                {renderField(
                  "doctor.doctorAddress.doctorProvince",
                  "Doctor's Province",
                  "select",
                  [
                    { value: "ON", label: "Ontario" },
                    { value: "AB", label: "Alberta" },
                    { value: "BC", label: "British Columbia" },
                    { value: "MB", label: "Manitoba" },
                    { value: "NB", label: "New Brunswick" },
                    { value: "NL", label: "Newfoundland and Labrador" },
                    { value: "NS", label: "Nova Scotia" },
                    { value: "NT", label: "Northwest Territories" },
                    { value: "NU", label: "Nunavut" },
                    { value: "PE", label: "Prince Edward Island" },
                    { value: "QC", label: "Quebec" },
                    { value: "SK", label: "Saskatchewan" },
                    { value: "YT", label: "Yukon" },
                  ]
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Health History</h2>
        {renderField(
          "generalHealth",
          "How would you describe your overall health?",
          "textarea",
          null,
          true
        )}
        {renderField(
          "historyOfMassage",
          "What is your history with massage therapy?",
          "textarea",
          null,
          true
        )}
        {renderField(
          "otherHCP",
          "Have you received any treatment from another Health Care Provider in the past year?",
          "textarea"
        )}
        {renderField(
          "injuries",
          "Have you had any injuries in the past year?",
          "textarea"
        )}
        {renderField(
          "surgeries",
          "Have you had any surgeries in the past 2 years?",
          "textarea"
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Medical Conditions</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(formData.medicalConditions).map((condition) => (
            <div key={condition}>
              {renderField(
                `medicalConditions.${condition}`,
                condition.charAt(0).toUpperCase() +
                  condition.slice(1).replace(/([A-Z])/g, " $1"),
                "checkbox"
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Cardiovascular Conditions</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(formData.cardiovascularConditions).map((condition) => (
            <div key={condition}>
              {renderField(
                `cardiovascularConditions.${condition}`,
                condition.charAt(0).toUpperCase() +
                  condition.slice(1).replace(/([A-Z])/g, " $1"),
                "checkbox"
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Respiratory Conditions</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(formData.respiratoryConditions).map((condition) => (
            <div key={condition}>
              {renderField(
                `respiratoryConditions.${condition}`,
                condition.charAt(0).toUpperCase() +
                  condition.slice(1).replace(/([A-Z])/g, " $1"),
                "checkbox"
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Additional Health Information</h2>
        {renderField(
          "internalEquipment",
          "Do you have any internal pins, wires, artificial joints or special equipment?",
          "textarea"
        )}
        {renderField(
          "skinConditions",
          "Do you have any skin conditions?",
          "textarea"
        )}
        {renderField(
          "infectiousConditions",
          "Do you have any infectious conditions?",
          "textarea"
        )}
        {renderField(
          "lossOfFeeling",
          "Please describe any loss of feeling, numbness, or tingling you are experiencing:",
          "textarea"
        )}
        {renderField(
          "allergies",
          "Please list any allergies that you have:",
          "textarea"
        )}
        {renderField(
          "medications",
          "Are you taking any medications or substances that may affect your sensitivity, healing, or ability to receive massage (e.g., blood thinners, corticosteroids, pain medications, recreational drugs)? If so, please list them here:",
          "textarea"
        )}
        {renderField(
          "pregnant",
          "Are you currently pregnant?",
          "select",
          [
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
            { value: "na", label: "Not applicable" },
          ],
          true
        )}
        {renderField(
          "otherMedicalConditions",
          "Mental health concerns (stress, anxiety, depression) can contribute to physical symptoms such as musculoskeletal pain, and many of these physical symptoms can be addressed by massage therapy. Are you experiencing physical symptoms such as fatigue, tension, or sleep disturbances that may relate to mental health?",
          "textarea"
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Source of Referral</h2>

        {renderField(
          "practitionerReferral.hasReferral",
          "Did a health care practitioner refer you for massage therapy?",
          "checkbox"
        )}

        {formData.practitionerReferral.hasReferral ? (
          <div className="mt-4 space-y-4 pl-6 border-l-2 border-gray-300">
            {renderField(
              "practitionerReferral.practitionerName",
              "Name of Health Care Practitioner"
            )}
            {renderField(
              "practitionerReferral.practitionerAddress",
              "Address of Health Care Practitioner"
            )}
          </div>
        ) : (
          <div className="mt-4">
            {renderField(
              "sourceOfReferral",
              "How did you hear about Cip de Vries, RMT?"
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          Policies: Privacy and Cancellations
        </h2>
        {renderField(
          "privacyPolicy",
          "I have read and agree to the privacy & cancellation policies",
          "checkbox",
          null,
          true
        )}
        {errors.privacyPolicy && (
          <p className="text-red-500 text-sm mt-1">{errors.privacyPolicy}</p>
        )}
        <Link
          href="/dashboard/patient/privacy-policy"
          target="_blank"
          className="text-blue-600 hover:underline"
        >
          Read Privacy & Cancellation Policies
        </Link>
      </div>

      <button
        type="submit"
        className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
      >
        Submit Health History
      </button>
    </form>
  );
}

// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { healthHistorySchema } from "@/app/lib/zod/zodSchemas";
// import { addHealthHistory } from "@/app/_actions";

// export default function HealthHistoryForm({ user, initialHealthHistory }) {
//   const router = useRouter();
//   const formRef = useRef(null);
//   const [formData, setFormData] = useState({
//     occupation: "",
//     pronouns: "",
//     dateOfBirth: "",
//     phoneNumber: "",
//     address: {
//       streetNumber: "",
//       streetName: "",
//       city: "",
//       province: "",
//     },
//     doctor: {
//       noDoctor: false,
//       doctorName: "",
//       doctorAddress: {
//         doctorStreetNumber: "",
//         doctorStreetName: "",
//         doctorCity: "",
//         doctorProvince: "",
//       },
//     },
//     generalHealth: "",
//     historyOfMassage: "",
//     otherHCP: "",
//     injuries: "",
//     surgeries: "",
//     medicalConditions: {
//       epilepsy: false,
//       diabetes: false,
//       cancer: false,
//       arthritis: false,
//       arthritisFamilyHistory: false,
//       chronicHeadaches: false,
//       migraineHeadaches: false,
//       visionLoss: false,
//       hearingLoss: false,
//       osteoporosis: false,
//       haemophilia: false,
//     },
//     cardiovascularConditions: {
//       highBloodPressure: false,
//       lowBloodPressure: false,
//       heartAttack: false,
//       stroke: false,
//       vericoseVeins: false,
//       pacemaker: false,
//       heartDisease: false,
//     },
//     respiratoryConditions: {
//       chronicCough: false,
//       bronchitis: false,
//       asthma: false,
//       emphysema: false,
//     },
//     internalEquipment: "",
//     skinConditions: "",
//     infectiousConditions: "",
//     lossOfFeeling: "",
//     allergies: "",
//     medications: "",
//     pregnant: "",
//     otherMedicalConditions: "",
//     sourceOfReferral: "",
//     privacyPolicy: false,
//   });
//   const [errors, setErrors] = useState({});
//   const errorRefs = useRef({});

//   useEffect(() => {
//     if (initialHealthHistory) {
//       setFormData((prevData) => ({
//         ...prevData,
//         ...initialHealthHistory,
//         dateOfBirth: initialHealthHistory.dateOfBirth
//           ? new Date(initialHealthHistory.dateOfBirth)
//               .toISOString()
//               .split("T")[0]
//           : "",
//       }));
//     }
//   }, [initialHealthHistory]);

//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData((prevData) => ({
//       ...prevData,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const handleNestedInputChange = (section, field, value) => {
//     setFormData((prevData) => ({
//       ...prevData,
//       [section]: {
//         ...prevData[section],
//         [field]: value,
//       },
//     }));
//   };

//   const validateForm = async () => {
//     try {
//       await healthHistorySchema.parseAsync(formData);
//       setErrors({});
//       return true;
//     } catch (error) {
//       const newErrors = {};
//       error.errors.forEach((err) => {
//         newErrors[err.path.join(".")] = err.message;
//       });
//       setErrors(newErrors);
//       return false;
//     }
//   };

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     const isValid = await validateForm();
//     if (isValid) {
//       try {
//         const dataToSubmit = {
//           ...formData,
//           userId: user?.id || "defaultUserId",
//         };
//         const result = await addHealthHistory(dataToSubmit);
//         if (result.success) {
//           router.push("/submission-success");
//         } else {
//           alert("Health history updated successfully.");
//           router.push("/");
//         }
//       } catch (error) {
//         console.error("Error submitting health history:", error);
//         alert(
//           "There was an error updating your health history. Please try again."
//         );
//       }
//     } else {
//       const firstErrorField = Object.keys(errors)[0];
//       if (errorRefs.current[firstErrorField]) {
//         errorRefs.current[firstErrorField].scrollIntoView({
//           behavior: "smooth",
//           block: "center",
//         });
//       }
//     }
//   };

//   const renderField = (name, label, type = "text", options = null) => {
//     const nameParts = name.split(".");
//     const value =
//       nameParts.reduce((obj, key) => obj && obj[key], formData) ?? "";
//     const error = errors[name];

//     const handleChange = (e) => {
//       const { value, type, checked } = e.target;
//       const newValue = type === "checkbox" ? checked : value;

//       if (nameParts.length === 1) {
//         handleInputChange(e);
//       } else if (nameParts.length === 2) {
//         handleNestedInputChange(nameParts[0], nameParts[1], newValue);
//       } else if (nameParts.length === 3) {
//         setFormData((prevData) => ({
//           ...prevData,
//           [nameParts[0]]: {
//             ...prevData[nameParts[0]],
//             [nameParts[1]]: {
//               ...prevData[nameParts[0]][nameParts[1]],
//               [nameParts[2]]: newValue,
//             },
//           },
//         }));
//       }
//     };

//     return (
//       <div className="mb-4" ref={(el) => (errorRefs.current[name] = el)}>
//         <label
//           htmlFor={name}
//           className="block text-sm font-medium text-gray-700 mb-1"
//         >
//           {label}
//         </label>
//         {type === "select" ? (
//           <select
//             id={name}
//             name={name}
//             value={value}
//             onChange={handleChange}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//           >
//             <option value="">Select {label}</option>
//             {options.map((option) => (
//               <option key={option.value || option.label} value={option.value}>
//                 {option.label}
//               </option>
//             ))}
//           </select>
//         ) : type === "textarea" ? (
//           <textarea
//             id={name}
//             name={name}
//             value={value}
//             onChange={handleChange}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//             rows={4}
//           />
//         ) : type === "checkbox" ? (
//           <input
//             type="checkbox"
//             id={name}
//             name={name}
//             checked={value}
//             onChange={handleChange}
//             className="h-4 w-4 text-gray-800 focus:ring-gray-800 border-gray-300 rounded"
//           />
//         ) : (
//           <input
//             type={type}
//             id={name}
//             name={name}
//             value={value}
//             onChange={handleChange}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//           />
//         )}
//         {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//       </div>
//     );
//   };

//   return (
//     <form
//       onSubmit={onSubmit}
//       className="max-w-4xl mx-auto px-4 py-8 space-y-8"
//       ref={formRef}
//     >
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Personal Information</h2>
//         {renderField("occupation", "Occupation")}
//         {renderField("pronouns", "Pronouns", "select", [
//           { value: "they/them", label: "They/them" },
//           { value: "she/her", label: "She/her" },
//           { value: "he/him", label: "He/him" },
//           { value: "other", label: "Other" },
//         ])}
//         {renderField("dateOfBirth", "Date of Birth", "date")}
//       </div>

//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Contact Information</h2>
//         {renderField("phoneNumber", "Phone Number", "tel")}
//         <div className="space-y-2">
//           <h3 className="text-xl font-semibold">Address</h3>
//           <div className="grid grid-cols-2 gap-4">
//             {renderField("address.streetNumber", "Street Number")}
//             {renderField("address.streetName", "Street Name")}
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             {renderField("address.city", "City")}
//             {renderField("address.province", "Province", "select", [
//               { value: "ON", label: "Ontario" },
//               { value: "AB", label: "Alberta" },
//               { value: "BC", label: "British Columbia" },
//               { value: "MB", label: "Manitoba" },
//               { value: "NB", label: "New Brunswick" },
//               { value: "NL", label: "Newfoundland and Labrador" },
//               { value: "NS", label: "Nova Scotia" },
//               { value: "NT", label: "Northwest Territories" },
//               { value: "NU", label: "Nunavut" },
//               { value: "PE", label: "Prince Edward Island" },
//               { value: "QC", label: "Quebec" },
//               { value: "SK", label: "Saskatchewan" },
//               { value: "YT", label: "Yukon" },
//             ])}
//           </div>
//         </div>
//       </div>

//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Doctor's Information</h2>
//         {renderField(
//           "doctor.noDoctor",
//           "I currently do not have a family doctor",
//           "checkbox"
//         )}
//         {!formData.doctor.noDoctor && (
//           <>
//             {renderField("doctor.doctorName", "Doctor's Name")}
//             <div className="space-y-2">
//               <h3 className="text-xl font-semibold">Doctor's Address</h3>
//               <div className="grid grid-cols-2 gap-4">
//                 {renderField(
//                   "doctor.doctorAddress.doctorStreetNumber",
//                   "Doctor's Street Number"
//                 )}
//                 {renderField(
//                   "doctor.doctorAddress.doctorStreetName",
//                   "Doctor's Street Name"
//                 )}
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 {renderField(
//                   "doctor.doctorAddress.doctorCity",
//                   "Doctor's City"
//                 )}
//                 {renderField(
//                   "doctor.doctorAddress.doctorProvince",
//                   "Doctor's Province",
//                   "select",
//                   [
//                     { value: "ON", label: "Ontario" },
//                     { value: "AB", label: "Alberta" },
//                     { value: "BC", label: "British Columbia" },
//                     { value: "MB", label: "Manitoba" },
//                     { value: "NB", label: "New Brunswick" },
//                     { value: "NL", label: "Newfoundland and Labrador" },
//                     { value: "NS", label: "Nova Scotia" },
//                     { value: "NT", label: "Northwest Territories" },
//                     { value: "NU", label: "Nunavut" },
//                     { value: "PE", label: "Prince Edward Island" },
//                     { value: "QC", label: "Quebec" },
//                     { value: "SK", label: "Saskatchewan" },
//                     { value: "YT", label: "Yukon" },
//                   ]
//                 )}
//               </div>
//             </div>
//           </>
//         )}
//       </div>

//       {/* Health History section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Health History</h2>
//         {renderField(
//           "generalHealth",
//           "How would you describe your overall health?",
//           "textarea"
//         )}
//         {renderField(
//           "historyOfMassage",
//           "What is your history with massage therapy?",
//           "textarea"
//         )}
//         {renderField(
//           "otherHCP",
//           "Have you received any treatment from another Health Care Provider in the past year?",
//           "textarea"
//         )}
//         {renderField(
//           "injuries",
//           "Have you had any injuries in the past year?",
//           "textarea"
//         )}
//         {renderField(
//           "surgeries",
//           "Have you had any surgeries in the past 2 years?",
//           "textarea"
//         )}
//       </div>

//       {/* Medical Conditions section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Medical Conditions</h2>
//         <div className="grid grid-cols-2 gap-4">
//           {Object.keys(formData.medicalConditions).map((condition) => (
//             <div key={condition}>
//               {renderField(
//                 `medicalConditions.${condition}`,
//                 condition.charAt(0).toUpperCase() +
//                   condition.slice(1).replace(/([A-Z])/g, " $1"),
//                 "checkbox"
//               )}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Cardiovascular Conditions section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Cardiovascular Conditions</h2>
//         <div className="grid grid-cols-2 gap-4">
//           {Object.keys(formData.cardiovascularConditions).map((condition) => (
//             <div key={condition}>
//               {renderField(
//                 `cardiovascularConditions.${condition}`,
//                 condition.charAt(0).toUpperCase() +
//                   condition.slice(1).replace(/([A-Z])/g, " $1"),
//                 "checkbox"
//               )}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Respiratory Conditions section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Respiratory Conditions</h2>
//         <div className="grid grid-cols-2 gap-4">
//           {Object.keys(formData.respiratoryConditions).map((condition) => (
//             <div key={condition}>
//               {renderField(
//                 `respiratoryConditions.${condition}`,
//                 condition.charAt(0).toUpperCase() +
//                   condition.slice(1).replace(/([A-Z])/g, " $1"),
//                 "checkbox"
//               )}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Additional Health Information section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Additional Health Information</h2>
//         {renderField(
//           "internalEquipment",
//           "Do you have any internal pins, wires, artificial joints or special equipment?",
//           "textarea"
//         )}
//         {renderField(
//           "skinConditions",
//           "Do you have any skin conditions?",
//           "textarea"
//         )}
//         {renderField(
//           "infectiousConditions",
//           "Do you have any infectious conditions?",
//           "textarea"
//         )}
//         {renderField(
//           "lossOfFeeling",
//           "Please describe any loss of feeling, numbness, or tingling you are experiencing:",
//           "textarea"
//         )}
//         {renderField(
//           "allergies",
//           "Please list any allergies that you have:",
//           "textarea"
//         )}
//         {renderField(
//           "medications",
//           "Please list any medications you are currently taking:",
//           "textarea"
//         )}
//         {renderField("pregnant", "Are you currently pregnant?", "select", [
//           { value: "no", label: "No" },
//           { value: "yes", label: "Yes" },
//           { value: "na", label: "Not applicable" },
//         ])}
//         {renderField(
//           "otherMedicalConditions",
//           "Do you have any other health conditions, medical conditions, or gynecological conditions?",
//           "textarea"
//         )}
//       </div>

//       {/* Source of Referral section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">Source of Referral</h2>
//         {renderField(
//           "sourceOfReferral",
//           "How did you hear about Cip de Vries, RMT?"
//         )}
//       </div>

//       {/* Policies section */}
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold">
//           Policies: Privacy and Cancellations
//         </h2>
//         {renderField(
//           "privacyPolicy",
//           "I have read and agree to the privacy & cancellation policies",
//           "checkbox"
//         )}
//         {errors.privacyPolicy && (
//           <p className="text-red-500 text-sm mt-1">{errors.privacyPolicy}</p>
//         )}
//         <Link
//           href="/dashboard/patient/privacy-policy"
//           target="_blank"
//           className="text-blue-600 hover:underline"
//         >
//           Read Privacy & Cancellation Policies
//         </Link>
//       </div>

//       <button
//         type="submit"
//         className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
//       >
//         Submit Health History
//       </button>
//     </form>
//   );
// }
