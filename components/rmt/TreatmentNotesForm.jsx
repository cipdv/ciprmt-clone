"use client";

import { useState, useEffect } from "react";
import { saveTreatmentNotes, getTreatmentsForPlan } from "@/app/_actions";
import { useRouter } from "next/navigation";

const TreatmentNotesForm = ({
  treatment,
  planId,
  plan,
  planDetails,
  client,
  onClose,
  onSubmit,
}) => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    reasonForMassage: treatment?.consentForm?.reasonForMassage || "",
    generalTreatment: "",
    findings: [
      {
        finding: "",
        treatment: "",
        subjectiveResults: "",
        objectiveResults: "",
        selfCare: "",
      },
    ],
    referToHCP: "none given",
    notes: "",
    paymentType: treatment?.code ? "gift_card" : "",
    price: treatment?.code ? "0" : "",
    otherPrice: "",
    giftCardCode: treatment?.code || "",
    receiptIssued: true,
  });

  const [previousTreatments, setPreviousTreatments] = useState([]);
  const [showPreviousTreatments, setShowPreviousTreatments] = useState(false);
  const [loadingPreviousTreatments, setLoadingPreviousTreatments] =
    useState(false);

  useEffect(() => {
    async function fetchPreviousTreatments() {
      if (planId && treatment?.id) {
        setLoadingPreviousTreatments(true);
        const result = await getTreatmentsForPlan(planId);
        if (result.success) {
          const filtered = result.data.filter((t) => t.id !== treatment.id);
          setPreviousTreatments(filtered);
        }
        setLoadingPreviousTreatments(false);
      }
    }
    fetchPreviousTreatments();
  }, [planId, treatment?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;

    if (name === "paymentType" && nextValue === "gift_card") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: nextValue,
        price: "0",
        giftCardCode: treatment?.code || prevData.giftCardCode,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: nextValue,
      }));
    }
  };

  const handleFindingChange = (index, field, value) => {
    setFormData((prevData) => {
      const newFindings = [...prevData.findings];
      newFindings[index] = {
        ...newFindings[index],
        [field]: value,
      };
      return {
        ...prevData,
        findings: newFindings,
      };
    });
  };

  const addFinding = () => {
    setFormData((prevData) => ({
      ...prevData,
      findings: [
        ...prevData.findings,
        {
          finding: "",
          treatment: "",
          subjectiveResults: "",
          objectiveResults: "",
          selfCare: "",
        },
      ],
    }));
  };

  const removeFinding = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      findings: prevData.findings.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      formData.price === "other" &&
      (!formData.otherPrice || isNaN(Number.parseFloat(formData.otherPrice)))
    ) {
      console.error("Please enter a valid price when selecting 'Other'");
      alert("Please enter a valid price when selecting 'Other'");
      return;
    }

    if (formData.paymentType === "gift_card" && !formData.giftCardCode) {
      console.error("Please enter a gift card code");
      alert("Please enter a gift card code");
      return;
    }

    try {
      const treatmentId = treatment.id || treatment._id;
      const result = await saveTreatmentNotes(treatmentId, planId, formData);
      if (result.success) {
        onSubmit?.(formData);
        router.push("/dashboard/rmt");
      } else {
        console.error("Failed to save treatment notes:", result.message);
        alert(result.message || "Failed to save treatment notes");
      }
    } catch (error) {
      console.error("Error saving treatment notes:", error);
      alert("Error saving treatment notes: " + error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    try {
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString();
      }
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return String(timeString).substring(0, 5);
  };

  const getPlanStartDate = () => {
    if (!plan || !plan.startDate) return "Not specified";

    try {
      if (plan.startDate instanceof Date) {
        return plan.startDate.toLocaleDateString();
      }
      return new Date(plan.startDate).toLocaleDateString();
    } catch (e) {
      console.error("Error formatting plan start date:", e);
      return String(plan.startDate);
    }
  };

  const getPlanEndDate = () => {
    if (!plan || !plan.endDate) return "Ongoing";

    try {
      if (plan.endDate instanceof Date) {
        return plan.endDate.toLocaleDateString();
      }
      return new Date(plan.endDate).toLocaleDateString();
    } catch (e) {
      console.error("Error formatting plan end date:", e);
      return String(plan.endDate);
    }
  };

  const patientName =
    (client?.firstName || "") + " " + (client?.lastName || "");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Treatment Notes</h3>

      {/* Treatment Information */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
          <div>
            <p className="text-gray-700 font-medium">
              Patient:{" "}
              {patientName.trim()
                ? patientName
                : `${treatment?.firstName || ""} ${
                    treatment?.lastName || ""
                  }`.trim() || "Unknown"}
            </p>
            <p className="text-gray-600">
              Date: {formatDate(treatment?.appointmentDate)}
            </p>
            <p className="text-gray-600">
              Time: {formatTime(treatment?.appointmentBeginsAt)}
            </p>
            {treatment?.duration && (
              <p className="text-gray-600">
                Duration: {treatment.duration} minutes
              </p>
            )}
          </div>

          {/* Treatment Plan Information */}
          {plan && planDetails && (
            <div className="bg-white p-3 rounded border border-blue-200 md:ml-4 flex-1">
              <h4 className="font-medium text-blue-700 mb-2">Treatment Plan</h4>
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-medium">Start Date:</span>{" "}
                {getPlanStartDate()} - {getPlanEndDate()}
              </p>
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-medium">Goals:</span>{" "}
                {planDetails.decryptedData?.clientGoals ||
                  planDetails.clientGoals ||
                  "Not specified"}
              </p>
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-medium">Areas:</span>{" "}
                {planDetails.decryptedData?.areasToBeTreated ||
                  planDetails.areasToBeTreated ||
                  "Not specified"}
              </p>
              {(planDetails.decryptedData?.durationAndFrequency ||
                planDetails.durationAndFrequency) && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Frequency:</span>{" "}
                  {planDetails.decryptedData?.durationAndFrequency ||
                    planDetails.durationAndFrequency}
                </p>
              )}
              {(planDetails.decryptedData?.typeAndFocusOfTreatments ||
                planDetails.typeAndFocusOfTreatments) && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Focus:</span>{" "}
                  {planDetails.decryptedData?.typeAndFocusOfTreatments ||
                    planDetails.typeAndFocusOfTreatments}
                </p>
              )}

              {previousTreatments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPreviousTreatments(!showPreviousTreatments)
                    }
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showPreviousTreatments ? "▼" : "▶"} Previous Treatments (
                    {previousTreatments.length})
                  </button>

                  {showPreviousTreatments && (
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {loadingPreviousTreatments ? (
                        <p className="text-xs text-gray-500">Loading...</p>
                      ) : (
                        previousTreatments.slice(0, 5).map((prevTreatment) => (
                          <div
                            key={prevTreatment.id}
                            className="bg-gray-50 p-2 rounded border border-gray-200 text-xs"
                          >
                            <p className="font-medium text-gray-700">
                              {formatDate(prevTreatment.date)}
                              {prevTreatment.appointmentBeginsAt &&
                                ` at ${formatTime(
                                  prevTreatment.appointmentBeginsAt,
                                )}`}
                            </p>
                            <p className="text-gray-600">
                              {prevTreatment.duration} min | $
                              {prevTreatment.price} |{" "}
                              {prevTreatment.paymentType}
                            </p>
                            {prevTreatment.treatmentNotes?.reasonForMassage && (
                              <p className="text-gray-700 mt-1">
                                <span className="font-medium">Reason:</span>{" "}
                                {prevTreatment.treatmentNotes.reasonForMassage}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                      {previousTreatments.length > 5 && (
                        <p className="text-xs text-gray-500 italic">
                          Showing 5 of {previousTreatments.length} treatments
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Findings blocks */}
      <div className="space-y-6">
        {formData.findings.map((finding, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded-lg p-4 bg-gray-50"
          >
            <div className="flex justify-end items-center mb-3">
              {formData.findings.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFinding(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Findings
                </label>
                <textarea
                  value={finding.finding}
                  onChange={(e) =>
                    handleFindingChange(index, "finding", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows="2"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Treatment
                </label>
                <textarea
                  value={finding.treatment}
                  onChange={(e) =>
                    handleFindingChange(index, "treatment", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows="2"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subjective Results
                </label>
                <textarea
                  value={finding.subjectiveResults}
                  onChange={(e) =>
                    handleFindingChange(
                      index,
                      "subjectiveResults",
                      e.target.value,
                    )
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows="2"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text.sm font-medium text-gray-700">
                  Objective Results
                </label>
                <textarea
                  value={finding.objectiveResults}
                  onChange={(e) =>
                    handleFindingChange(
                      index,
                      "objectiveResults",
                      e.target.value,
                    )
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows="2"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Self-care
                </label>
                <textarea
                  value={finding.selfCare}
                  onChange={(e) =>
                    handleFindingChange(index, "selfCare", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addFinding}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <span className="text-xl">+</span>
          Add another finding
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          General Treatment
        </label>
        <textarea
          name="generalTreatment"
          value={formData.generalTreatment}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          rows="3"
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Refer to HCP
        </label>
        <input
          type="text"
          name="referToHCP"
          value={formData.referToHCP}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          rows="3"
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment Type
          </label>
          <select
            name="paymentType"
            value={formData.paymentType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          >
            <option value="">Select payment type</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="cash/e-transfer">Cash/E-transfer</option>
            <option value="unpaid">Unpaid</option>
            <option value="gift_card">Gift Card</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Price
          </label>
          <select
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
            disabled={formData.paymentType === "gift_card"}
          >
            <option value="">Select price</option>
            <option value="129.95">$129.95 (60 min)</option>
            <option value="152.55">$152.55 (75 min)</option>
            <option value="175.15">$175.15 (90 min)</option>
            <option value="other">Other</option>
            {formData.paymentType === "gift_card" && (
              <option value="0">Gift Card Redeemed</option>
            )}
          </select>
          {formData.price === "other" && (
            <input
              type="number"
              name="otherPrice"
              value={formData.otherPrice}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          )}
        </div>
        <div className="flex items-center gap-2 md:mt-6">
          <input
            id="receiptIssued"
            name="receiptIssued"
            type="checkbox"
            checked={formData.receiptIssued}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label
            htmlFor="receiptIssued"
            className="text-sm font-medium text-gray-700"
          >
            Receipt?
          </label>
        </div>
      </div>

      {formData.paymentType === "gift_card" && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Gift Card Code
          </label>
          <input
            type="text"
            name="giftCardCode"
            value={formData.giftCardCode}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 uppercase"
            required
            readOnly={!!treatment?.code}
            disabled={!!treatment?.code}
          />
          {treatment?.code && (
            <p className="text-sm text-gray-500 mt-1">
              This appointment was booked with gift card code: {treatment.code}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save Notes
        </button>
      </div>
    </form>
  );
};

export default TreatmentNotesForm;

// "use client";

// import { useState, useEffect } from "react";
// import { saveTreatmentNotes, getTreatmentsForPlan } from "@/app/_actions";
// import { useRouter } from "next/navigation";

// const TreatmentNotesForm = ({
//   treatment,
//   planId,
//   plan,
//   planDetails,
//   onClose,
//   onSubmit,
// }) => {
//   const router = useRouter();
//   const [formData, setFormData] = useState({
//     reasonForMassage: treatment?.consentForm?.reasonForMassage,
//     generalTreatment: "",
//     findings: [
//       {
//         finding: "",
//         treatment: "",
//         subjectiveResults: "",
//         objectiveResults: "",
//         selfCare: "",
//       },
//     ],
//     referToHCP: "none given",
//     notes: "",
//     paymentType: treatment?.code ? "gift_card" : "",
//     price: treatment?.code ? "0" : "",
//     otherPrice: "",
//     giftCardCode: treatment?.code || "",
//   });

//   const [previousTreatments, setPreviousTreatments] = useState([]);
//   const [showPreviousTreatments, setShowPreviousTreatments] = useState(false);
//   const [loadingPreviousTreatments, setLoadingPreviousTreatments] =
//     useState(false);

//   useEffect(() => {
//     async function fetchPreviousTreatments() {
//       if (planId) {
//         setLoadingPreviousTreatments(true);
//         const result = await getTreatmentsForPlan(planId);
//         if (result.success) {
//           const filtered = result.data.filter((t) => t.id !== treatment?.id); // <-- FIXED
//           setPreviousTreatments(filtered);
//         }
//         setLoadingPreviousTreatments(false);
//       }
//     }
//     fetchPreviousTreatments();
//   }, [planId, treatment?.id]); // <-- FIXED

//   const handleChange = (e) => {
//     const { name, value } = e.target;

//     if (name === "paymentType" && value === "gift_card") {
//       setFormData((prevData) => ({
//         ...prevData,
//         [name]: value,
//         price: "0",
//         giftCardCode: treatment?.code || prevData.giftCardCode,
//       }));
//     } else {
//       setFormData((prevData) => ({
//         ...prevData,
//         [name]: value,
//       }));
//     }
//   };

//   const handleFindingChange = (index, field, value) => {
//     setFormData((prevData) => {
//       const newFindings = [...prevData.findings];
//       newFindings[index] = {
//         ...newFindings[index],
//         [field]: value,
//       };
//       return {
//         ...prevData,
//         findings: newFindings,
//       };
//     });
//   };

//   const addFinding = () => {
//     setFormData((prevData) => ({
//       ...prevData,
//       findings: [
//         ...prevData.findings,
//         {
//           finding: "",
//           treatment: "",
//           subjectiveResults: "",
//           objectiveResults: "",
//           selfCare: "",
//         },
//       ],
//     }));
//   };

//   const removeFinding = (index) => {
//     setFormData((prevData) => ({
//       ...prevData,
//       findings: prevData.findings.filter((_, i) => i !== index),
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (
//       formData.price === "other" &&
//       (!formData.otherPrice || isNaN(Number.parseFloat(formData.otherPrice)))
//     ) {
//       console.error("Please enter a valid price when selecting 'Other'");
//       return;
//     }

//     if (formData.paymentType === "gift_card" && !formData.giftCardCode) {
//       console.error("Please enter a gift card code");
//       alert("Please enter a gift card code");
//       return;
//     }

//     try {
//       const treatmentId = treatment?.id || treatment?._id; // <-- FIXED
//       const result = await saveTreatmentNotes(treatmentId, planId, formData);
//       if (result.success) {
//         onSubmit(formData);
//         router.push("/dashboard/rmt");
//       } else {
//         console.error("Failed to save treatment notes:", result.message);
//         alert(result.message || "Failed to save treatment notes");
//       }
//     } catch (error) {
//       console.error("Error saving treatment notes:", error);
//       alert("Error saving treatment notes: " + error.message);
//     }
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return "Not specified";
//     try {
//       if (dateString instanceof Date) {
//         return dateString.toLocaleDateString();
//       }
//       return new Date(dateString).toLocaleDateString();
//     } catch (e) {
//       console.error("Error formatting date:", e);
//       return String(dateString);
//     }
//   };

//   const formatTime = (timeString) => {
//     if (!timeString) return "";
//     return String(timeString).substring(0, 5);
//   };

//   const getPlanStartDate = () => {
//     if (!plan || !plan.startDate) return "Not specified";
//     try {
//       if (plan.startDate instanceof Date) {
//         return plan.startDate.toLocaleDateString();
//       }
//       return new Date(plan.startDate).toLocaleDateString();
//     } catch (e) {
//       console.error("Error formatting plan start date:", e);
//       return String(plan.startDate);
//     }
//   };

//   const getPlanEndDate = () => {
//     if (!plan || !plan.endDate) return "Ongoing";
//     try {
//       if (plan.endDate instanceof Date) {
//         return plan.endDate.toLocaleDateString();
//       }
//       return new Date(plan.endDate).toLocaleDateString();
//     } catch (e) {
//       console.error("Error formatting plan end date:", e);
//       return String(plan.endDate);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       <h3 className="text-xl font-bold mb-4">Treatment Notes</h3>

//       {/* Treatment Information */}
//       <div className="bg-blue-50 p-4 rounded-lg mb-4">
//         <div className="flex justify-between items-start">
//           <div>
//             <p className="text-gray-700 font-medium">
//               Patient: {treatment.firstName} {treatment.lastName}
//             </p>
//             <p className="text-gray-600">
//               Date: {formatDate(treatment.appointmentDate)}
//             </p>
//             <p className="text-gray-600">
//               Time: {formatTime(treatment.appointmentBeginsAt)}
//             </p>
//             {treatment.duration && (
//               <p className="text-gray-600">
//                 Duration: {treatment.duration} minutes
//               </p>
//             )}
//           </div>

//           {/* Treatment Plan Information */}
//           {plan && planDetails && (
//             <div className="bg-white p-3 rounded border border-blue-200 ml-4 flex-1">
//               <h4 className="font-medium text-blue-700 mb-2">Treatment Plan</h4>
//               <p className="text-sm text-gray-700 mb-1">
//                 <span className="font-medium">Start Date:</span>{" "}
//                 {getPlanStartDate()} - {getPlanEndDate()}
//               </p>
//               <p className="text-sm text-gray-700 mb-1">
//                 <span className="font-medium">Goals:</span>{" "}
//                 {planDetails.decryptedData?.clientGoals ||
//                   planDetails.clientGoals ||
//                   "Not specified"}
//               </p>
//               <p className="text-sm text-gray-700 mb-1">
//                 <span className="font-medium">Areas:</span>{" "}
//                 {planDetails.decryptedData?.areasToBeTreated ||
//                   planDetails.areasToBeTreated ||
//                   "Not specified"}
//               </p>
//               {(planDetails.decryptedData?.durationAndFrequency ||
//                 planDetails.durationAndFrequency) && (
//                 <p className="text-sm text-gray-700 mb-1">
//                   <span className="font-medium">Frequency:</span>{" "}
//                   {planDetails.decryptedData?.durationAndFrequency ||
//                     planDetails.durationAndFrequency}
//                 </p>
//               )}
//               {(planDetails.decryptedData?.typeAndFocusOfTreatments ||
//                 planDetails.typeAndFocusOfTreatments) && (
//                 <p className="text-sm text-gray-700">
//                   <span className="font-medium">Focus:</span>{" "}
//                   {planDetails.decryptedData?.typeAndFocusOfTreatments ||
//                     planDetails.typeAndFocusOfTreatments}
//                 </p>
//               )}

//               {previousTreatments.length > 0 && (
//                 <div className="mt-3 pt-3 border-t border-gray-200">
//                   <button
//                     type="button"
//                     onClick={() =>
//                       setShowPreviousTreatments(!showPreviousTreatments)
//                     }
//                     className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//                   >
//                     {showPreviousTreatments ? "▼" : "▶"} Previous Treatments (
//                     {previousTreatments.length})
//                   </button>

//                   {showPreviousTreatments && (
//                     <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
//                       {loadingPreviousTreatments ? (
//                         <p className="text-xs text-gray-500">Loading...</p>
//                       ) : (
//                         previousTreatments.slice(0, 5).map((prevTreatment) => (
//                           <div
//                             key={prevTreatment.id}
//                             className="bg-gray-50 p-2 rounded border border-gray-200 text-xs"
//                           >
//                             <p className="font-medium text-gray-700">
//                               {formatDate(prevTreatment.date)}
//                               {prevTreatment.appointmentBeginsAt &&
//                                 ` at ${formatTime(
//                                   prevTreatment.appointmentBeginsAt
//                                 )}`}
//                             </p>
//                             <p className="text-gray-600">
//                               {prevTreatment.duration} min | $
//                               {prevTreatment.price} |{" "}
//                               {prevTreatment.paymentType}
//                             </p>
//                             {prevTreatment.treatmentNotes?.reasonForMassage && (
//                               <p className="text-gray-700 mt-1">
//                                 <span className="font-medium">Reason:</span>{" "}
//                                 {prevTreatment.treatmentNotes.reasonForMassage}
//                               </p>
//                             )}
//                           </div>
//                         ))
//                       )}
//                       {previousTreatments.length > 5 && (
//                         <p className="text-xs text-gray-500 italic">
//                           Showing 5 of {previousTreatments.length} treatments
//                         </p>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       <div className="space-y-6">
//         {formData.findings.map((finding, index) => (
//           <div
//             key={index}
//             className="border border-gray-300 rounded-lg p-4 bg-gray-50"
//           >
//             <div className="flex justify-end items-center mb-3">
//               {formData.findings.length > 1 && (
//                 <button
//                   type="button"
//                   onClick={() => removeFinding(index)}
//                   className="text-red-600 hover:text-red-800 text-sm"
//                 >
//                   Remove
//                 </button>
//               )}
//             </div>

//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Findings
//                 </label>
//                 <textarea
//                   value={finding.finding}
//                   onChange={(e) =>
//                     handleFindingChange(index, "finding", e.target.value)
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Treatment
//                 </label>
//                 <textarea
//                   value={finding.treatment}
//                   onChange={(e) =>
//                     handleFindingChange(index, "treatment", e.target.value)
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Subjective Results
//                 </label>
//                 <textarea
//                   value={finding.subjectiveResults}
//                   onChange={(e) =>
//                     handleFindingChange(
//                       index,
//                       "subjectiveResults",
//                       e.target.value
//                     )
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Objective Results
//                 </label>
//                 <textarea
//                   value={finding.objectiveResults}
//                   onChange={(e) =>
//                     handleFindingChange(
//                       index,
//                       "objectiveResults",
//                       e.target.value
//                     )
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Self-care
//                 </label>
//                 <textarea
//                   value={finding.selfCare}
//                   onChange={(e) =>
//                     handleFindingChange(index, "selfCare", e.target.value)
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                 ></textarea>
//               </div>
//             </div>
//           </div>
//         ))}

//         <button
//           type="button"
//           onClick={addFinding}
//           className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
//         >
//           <span className="text-xl">+</span>
//           Add another finding
//         </button>
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           General Treatment
//         </label>
//         <textarea
//           name="generalTreatment"
//           value={formData.generalTreatment}
//           onChange={handleChange}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//           rows="3"
//         ></textarea>
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           Refer to HCP
//         </label>
//         <input
//           type="text"
//           name="referToHCP"
//           value={formData.referToHCP}
//           onChange={handleChange}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//         />
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-700">Notes</label>
//         <textarea
//           name="notes"
//           value={formData.notes}
//           onChange={handleChange}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//           rows="3"
//         ></textarea>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Payment Type
//           </label>
//           <select
//             name="paymentType"
//             value={formData.paymentType}
//             onChange={handleChange}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//             required
//           >
//             <option value="">Select payment type</option>
//             <option value="credit">Credit</option>
//             <option value="debit">Debit</option>
//             <option value="cash/e-transfer">Cash/E-transfer</option>
//             <option value="unpaid">Unpaid</option>
//             <option value="gift_card">Gift Card</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Price
//           </label>
//           <select
//             name="price"
//             value={formData.price}
//             onChange={handleChange}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//             required
//             disabled={formData.paymentType === "gift_card"}
//           >
//             <option value="">Select price</option>
//             <option value="129.95">$129.95 (60 min)</option>
//             <option value="152.55">$152.55 (75 min)</option>
//             <option value="175.15">$175.15 (90 min)</option>
//             <option value="other">Other</option>
//             {formData.paymentType === "gift_card" && (
//               <option value="0">Gift Card Redeemed</option>
//             )}
//           </select>
//           {formData.price === "other" && (
//             <input
//               type="number"
//               name="otherPrice"
//               value={formData.otherPrice}
//               onChange={handleChange}
//               className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//             />
//           )}
//         </div>
//       </div>

//       {formData.paymentType === "gift_card" && (
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Gift Card Code
//           </label>
//           <input
//             type="text"
//             name="giftCardCode"
//             value={formData.giftCardCode}
//             onChange={handleChange}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 uppercase"
//             required
//             readOnly={!!treatment?.code}
//             disabled={!!treatment?.code}
//           />
//           {treatment?.code && (
//             <p className="text-sm text-gray-500 mt-1">
//               This appointment was booked with gift card code: {treatment.code}
//             </p>
//           )}
//         </div>
//       )}

//       <div className="mt-4 flex justify-end space-x-2">
//         <button
//           type="button"
//           onClick={onClose}
//           className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
//         >
//           Cancel
//         </button>
//         <button
//           type="submit"
//           className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           Save Notes
//         </button>
//       </div>
//     </form>
//   );
// };

// export default TreatmentNotesForm;

// "use client";

// import { useState, useEffect } from "react";
// import { saveTreatmentNotes, getTreatmentsForPlan } from "@/app/_actions";
// import { useRouter } from "next/navigation";

// const TreatmentNotesForm = ({
//   treatment,
//   planId,
//   plan,
//   planDetails,
//   onClose,
//   onSubmit,
// }) => {
//   const router = useRouter();
//   const [formData, setFormData] = useState({
//     reasonForMassage: treatment?.consentForm?.reasonForMassage,
//     generalTreatment: "",
//     findings: [
//       {
//         finding: "",
//         treatment: "",
//         subjectiveResults: "",
//         objectiveResults: "",
//         selfCare: "",
//       },
//     ],
//     referToHCP: "none given",
//     notes: "",
//     paymentType: treatment?.code ? "gift_card" : "",
//     price: treatment?.code ? "0" : "",
//     otherPrice: "",
//     giftCardCode: treatment?.code || "",
//   });

//   const [previousTreatments, setPreviousTreatments] = useState([]);
//   const [showPreviousTreatments, setShowPreviousTreatments] = useState(false);
//   const [loadingPreviousTreatments, setLoadingPreviousTreatments] =
//     useState(false);

//   useEffect(() => {
//     async function fetchPreviousTreatments() {
//       if (planId) {
//         setLoadingPreviousTreatments(true);
//         const result = await getTreatmentsForPlan(planId);
//         if (result.success) {
//           const filtered = result.data.filter((t) => t.id !== treatment.id);
//           setPreviousTreatments(filtered);
//         }
//         setLoadingPreviousTreatments(false);
//       }
//     }
//     fetchPreviousTreatments();
//   }, [planId, treatment?.id]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;

//     if (name === "paymentType" && value === "gift_card") {
//       setFormData((prevData) => ({
//         ...prevData,
//         [name]: value,
//         price: "0",
//         giftCardCode: treatment?.code || prevData.giftCardCode,
//       }));
//     } else {
//       setFormData((prevData) => ({
//         ...prevData,
//         [name]: value,
//       }));
//     }
//   };

//   const handleFindingChange = (index, field, value) => {
//     setFormData((prevData) => {
//       const newFindings = [...prevData.findings];
//       newFindings[index] = {
//         ...newFindings[index],
//         [field]: value,
//       };
//       return {
//         ...prevData,
//         findings: newFindings,
//       };
//     });
//   };

//   const addFinding = () => {
//     setFormData((prevData) => ({
//       ...prevData,
//       findings: [
//         ...prevData.findings,
//         {
//           finding: "",
//           treatment: "",
//           subjectiveResults: "",
//           objectiveResults: "",
//           selfCare: "",
//         },
//       ],
//     }));
//   };

//   const removeFinding = (index) => {
//     setFormData((prevData) => ({
//       ...prevData,
//       findings: prevData.findings.filter((_, i) => i !== index),
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (
//       formData.price === "other" &&
//       (!formData.otherPrice || isNaN(Number.parseFloat(formData.otherPrice)))
//     ) {
//       console.error("Please enter a valid price when selecting 'Other'");
//       return;
//     }

//     if (formData.paymentType === "gift_card" && !formData.giftCardCode) {
//       console.error("Please enter a gift card code");
//       alert("Please enter a gift card code");
//       return;
//     }

//     try {
//       const treatmentId = treatment.id || treatment._id;
//       const result = await saveTreatmentNotes(treatmentId, planId, formData);
//       if (result.success) {
//         onSubmit(formData);
//         router.push("/dashboard/rmt");
//       } else {
//         console.error("Failed to save treatment notes:", result.message);
//         alert(result.message || "Failed to save treatment notes");
//       }
//     } catch (error) {
//       console.error("Error saving treatment notes:", error);
//       alert("Error saving treatment notes: " + error.message);
//     }
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return "Not specified";

//     try {
//       if (dateString instanceof Date) {
//         return dateString.toLocaleDateString();
//       }
//       return new Date(dateString).toLocaleDateString();
//     } catch (e) {
//       console.error("Error formatting date:", e);
//       return String(dateString);
//     }
//   };

//   const formatTime = (timeString) => {
//     if (!timeString) return "";
//     return String(timeString).substring(0, 5);
//   };

//   const getPlanStartDate = () => {
//     if (!plan || !plan.startDate) return "Not specified";

//     try {
//       if (plan.startDate instanceof Date) {
//         return plan.startDate.toLocaleDateString();
//       }
//       return new Date(plan.startDate).toLocaleDateString();
//     } catch (e) {
//       console.error("Error formatting plan start date:", e);
//       return String(plan.startDate);
//     }
//   };

//   const getPlanEndDate = () => {
//     if (!plan || !plan.endDate) return "Ongoing";

//     try {
//       if (plan.endDate instanceof Date) {
//         return plan.endDate.toLocaleDateString();
//       }
//       return new Date(plan.endDate).toLocaleDateString();
//     } catch (e) {
//       console.error("Error formatting plan end date:", e);
//       return String(plan.endDate);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       <h3 className="text-xl font-bold mb-4">Treatment Notes</h3>

//       {/* Treatment Information */}
//       <div className="bg-blue-50 p-4 rounded-lg mb-4">
//         <div className="flex justify-between items-start">
//           <div>
//             <p className="text-gray-700 font-medium">
//               Patient: {treatment.firstName} {treatment.lastName}
//             </p>
//             <p className="text-gray-600">
//               Date: {formatDate(treatment.appointmentDate)}
//             </p>
//             <p className="text-gray-600">
//               Time: {formatTime(treatment.appointmentBeginsAt)}
//             </p>
//             {treatment.duration && (
//               <p className="text-gray-600">
//                 Duration: {treatment.duration} minutes
//               </p>
//             )}
//           </div>

//           {/* Treatment Plan Information */}
//           {plan && planDetails && (
//             <div className="bg-white p-3 rounded border border-blue-200 ml-4 flex-1">
//               <h4 className="font-medium text-blue-700 mb-2">Treatment Plan</h4>
//               <p className="text-sm text-gray-700 mb-1">
//                 <span className="font-medium">Start Date:</span>{" "}
//                 {getPlanStartDate()} - {getPlanEndDate()}
//               </p>
//               <p className="text-sm text-gray-700 mb-1">
//                 <span className="font-medium">Goals:</span>{" "}
//                 {planDetails.decryptedData?.clientGoals ||
//                   planDetails.clientGoals ||
//                   "Not specified"}
//               </p>
//               <p className="text-sm text-gray-700 mb-1">
//                 <span className="font-medium">Areas:</span>{" "}
//                 {planDetails.decryptedData?.areasToBeTreated ||
//                   planDetails.areasToBeTreated ||
//                   "Not specified"}
//               </p>
//               {(planDetails.decryptedData?.durationAndFrequency ||
//                 planDetails.durationAndFrequency) && (
//                 <p className="text-sm text-gray-700 mb-1">
//                   <span className="font-medium">Frequency:</span>{" "}
//                   {planDetails.decryptedData?.durationAndFrequency ||
//                     planDetails.durationAndFrequency}
//                 </p>
//               )}
//               {(planDetails.decryptedData?.typeAndFocusOfTreatments ||
//                 planDetails.typeAndFocusOfTreatments) && (
//                 <p className="text-sm text-gray-700">
//                   <span className="font-medium">Focus:</span>{" "}
//                   {planDetails.decryptedData?.typeAndFocusOfTreatments ||
//                     planDetails.typeAndFocusOfTreatments}
//                 </p>
//               )}

//               {previousTreatments.length > 0 && (
//                 <div className="mt-3 pt-3 border-t border-gray-200">
//                   <button
//                     type="button"
//                     onClick={() =>
//                       setShowPreviousTreatments(!showPreviousTreatments)
//                     }
//                     className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//                   >
//                     {showPreviousTreatments ? "▼" : "▶"} Previous Treatments (
//                     {previousTreatments.length})
//                   </button>

//                   {showPreviousTreatments && (
//                     <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
//                       {loadingPreviousTreatments ? (
//                         <p className="text-xs text-gray-500">Loading...</p>
//                       ) : (
//                         previousTreatments.slice(0, 5).map((prevTreatment) => (
//                           <div
//                             key={prevTreatment.id}
//                             className="bg-gray-50 p-2 rounded border border-gray-200 text-xs"
//                           >
//                             <p className="font-medium text-gray-700">
//                               {formatDate(prevTreatment.date)}
//                               {prevTreatment.appointmentBeginsAt &&
//                                 ` at ${formatTime(
//                                   prevTreatment.appointmentBeginsAt
//                                 )}`}
//                             </p>
//                             <p className="text-gray-600">
//                               {prevTreatment.duration} min | $
//                               {prevTreatment.price} |{" "}
//                               {prevTreatment.paymentType}
//                             </p>
//                             {prevTreatment.treatmentNotes?.reasonForMassage && (
//                               <p className="text-gray-700 mt-1">
//                                 <span className="font-medium">Reason:</span>{" "}
//                                 {prevTreatment.treatmentNotes.reasonForMassage}
//                               </p>
//                             )}
//                           </div>
//                         ))
//                       )}
//                       {previousTreatments.length > 5 && (
//                         <p className="text-xs text-gray-500 italic">
//                           Showing 5 of {previousTreatments.length} treatments
//                         </p>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       <div className="space-y-6">
//         {formData.findings.map((finding, index) => (
//           <div
//             key={index}
//             className="border border-gray-300 rounded-lg p-4 bg-gray-50"
//           >
//             <div className="flex justify-end items-center mb-3">
//               {formData.findings.length > 1 && (
//                 <button
//                   type="button"
//                   onClick={() => removeFinding(index)}
//                   className="text-red-600 hover:text-red-800 text-sm"
//                 >
//                   Remove
//                 </button>
//               )}
//             </div>

//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Findings
//                 </label>
//                 <textarea
//                   value={finding.finding}
//                   onChange={(e) =>
//                     handleFindingChange(index, "finding", e.target.value)
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Treatment
//                 </label>
//                 <textarea
//                   value={finding.treatment}
//                   onChange={(e) =>
//                     handleFindingChange(index, "treatment", e.target.value)
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Subjective Results
//                 </label>
//                 <textarea
//                   value={finding.subjectiveResults}
//                   onChange={(e) =>
//                     handleFindingChange(
//                       index,
//                       "subjectiveResults",
//                       e.target.value
//                     )
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Objective Results
//                 </label>
//                 <textarea
//                   value={finding.objectiveResults}
//                   onChange={(e) =>
//                     handleFindingChange(
//                       index,
//                       "objectiveResults",
//                       e.target.value
//                     )
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                   required
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Self-care
//                 </label>
//                 <textarea
//                   value={finding.selfCare}
//                   onChange={(e) =>
//                     handleFindingChange(index, "selfCare", e.target.value)
//                   }
//                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//                   rows="2"
//                 ></textarea>
//               </div>
//             </div>
//           </div>
//         ))}

//         <button
//           type="button"
//           onClick={addFinding}
//           className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
//         >
//           <span className="text-xl">+</span>
//           Add another finding
//         </button>
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           General Treatment
//         </label>
//         <textarea
//           name="generalTreatment"
//           value={formData.generalTreatment}
//           onChange={handleChange}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//           rows="3"
//         ></textarea>
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-700">
//           Refer to HCP
//         </label>
//         <input
//           type="text"
//           name="referToHCP"
//           value={formData.referToHCP}
//           onChange={handleChange}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//         />
//       </div>

//       <div>
//         <label className="block text-sm font-medium text-gray-700">Notes</label>
//         <textarea
//           name="notes"
//           value={formData.notes}
//           onChange={handleChange}
//           className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//           rows="3"
//         ></textarea>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Payment Type
//           </label>
//           <select
//             name="paymentType"
//             value={formData.paymentType}
//             onChange={handleChange}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//             required
//           >
//             <option value="">Select payment type</option>
//             <option value="credit">Credit</option>
//             <option value="debit">Debit</option>
//             <option value="cash/e-transfer">Cash/E-transfer</option>
//             <option value="unpaid">Unpaid</option>
//             <option value="gift_card">Gift Card</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Price
//           </label>
//           <select
//             name="price"
//             value={formData.price}
//             onChange={handleChange}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//             required
//             disabled={formData.paymentType === "gift_card"}
//           >
//             <option value="">Select price</option>
//             <option value="129.95">$129.95 (60 min)</option>
//             <option value="152.55">$152.55 (75 min)</option>
//             <option value="175.15">$175.15 (90 min)</option>
//             <option value="other">Other</option>
//             {formData.paymentType === "gift_card" && (
//               <option value="0">Gift Card Redeemed</option>
//             )}
//           </select>
//           {formData.price === "other" && (
//             <input
//               type="number"
//               name="otherPrice"
//               value={formData.otherPrice}
//               onChange={handleChange}
//               className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
//             />
//           )}
//         </div>
//       </div>

//       {formData.paymentType === "gift_card" && (
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Gift Card Code
//           </label>
//           <input
//             type="text"
//             name="giftCardCode"
//             value={formData.giftCardCode}
//             onChange={handleChange}
//             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 uppercase"
//             required
//             readOnly={!!treatment?.code}
//             disabled={!!treatment?.code}
//           />
//           {treatment?.code && (
//             <p className="text-sm text-gray-500 mt-1">
//               This appointment was booked with gift card code: {treatment.code}
//             </p>
//           )}
//         </div>
//       )}

//       <div className="mt-4 flex justify-end space-x-2">
//         <button
//           type="button"
//           onClick={onClose}
//           className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
//         >
//           Cancel
//         </button>
//         <button
//           type="submit"
//           className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           Save Notes
//         </button>
//       </div>
//     </form>
//   );
// };

// export default TreatmentNotesForm;
