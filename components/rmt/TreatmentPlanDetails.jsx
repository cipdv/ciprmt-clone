// components/rmt/TreatmentPlanDetails.jsx
"use client";

import { useState } from "react";
import { createTreatmentPlan } from "@/app/_actions";
import NewTreatmentPlanForm from "./NewTreatmentPlanForm";
import TreatmentNotesForm from "./TreatmentNotesForm";

const TreatmentPlanDetails = ({
  treatmentPlans,
  clientId,
  selectedTreatment,
}) => {
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, plan) => {
    e.preventDefault();
    const treatmentData = JSON.parse(e.dataTransfer.getData("text/plain"));
    openTreatmentNotesModal(treatmentData, plan);
  };

  const handleCreatePlan = async (planData) => {
    try {
      await createTreatmentPlan(planData, clientId);
      setShowNewPlanModal(false);
      // You might want to refresh the treatment plans list here
    } catch (error) {
      console.error("Error creating treatment plan:", error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  const handleSaveTreatmentNotes = async (formData) => {
    setShowNotesModal(false);
    // You might want to refresh the treatment plans list here
  };

  const openTreatmentNotesModal = (treatment, plan) => {
    setSelectedPlan(plan);
    setShowNotesModal(true);
  };

  // Helper function to safely get decrypted data
  const getDecryptedData = (plan) => {
    if (!plan.decryptedData)
      return {
        clientGoals: "No goals specified",
        areasToBeTreated: "None specified",
      };

    try {
      // If decryptedData is a string, try to parse it
      if (typeof plan.decryptedData === "string") {
        return JSON.parse(plan.decryptedData);
      }
      return plan.decryptedData;
    } catch (e) {
      console.error("Error parsing decrypted data:", e);
      return {
        clientGoals: "Error loading goals",
        areasToBeTreated: "Error loading areas",
      };
    }
  };

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";

    try {
      // If it's already a Date object, convert it to a string
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString();
      }

      // Otherwise, parse it as a date and format it
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString); // Convert to string to avoid React rendering errors
    }
  };

  // Format time safely
  const formatTime = (timeString) => {
    if (!timeString) return "";
    return String(timeString).substring(0, 5);
  };

  // Check if we have treatment plans and they're in the expected format
  const hasPlans = Array.isArray(treatmentPlans)
    ? treatmentPlans.length > 0
    : treatmentPlans && treatmentPlans.data && treatmentPlans.data.length > 0;

  // Get the plans array in the correct format
  const plansArray = Array.isArray(treatmentPlans)
    ? treatmentPlans
    : (treatmentPlans && treatmentPlans.data) || [];

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Treatment Plans</h2>
        <button
          onClick={() => setShowNewPlanModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create New Treatment Plan
        </button>
      </div>

      {hasPlans ? (
        <div className="space-y-4">
          {plansArray.map((plan) => {
            const decryptedData = getDecryptedData(plan);
            return (
              <div
                key={plan.id || plan._id} // Support both PostgreSQL and MongoDB IDs
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, plan)}
                onClick={() =>
                  selectedTreatment &&
                  openTreatmentNotesModal(selectedTreatment, plan)
                }
              >
                <h3 className="text-xl font-semibold mb-2 text-blue-600">
                  {decryptedData.clientGoals || "Client Goals"}
                </h3>
                <p className="text-gray-600">
                  <span className="font-medium">Start Date:</span>{" "}
                  {formatDate(plan.startDate)}
                </p>
                <p className="text-gray-600 mt-2">
                  <span className="font-medium">Areas to be Treated:</span>{" "}
                  {decryptedData.areasToBeTreated || "Not specified"}
                </p>
                {plan.treatments && plan.treatments.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700">
                      Associated Treatments:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                      {plan.treatments.map((treatment, index) => (
                        <li key={index}>
                          {formatDate(treatment.appointmentDate)} at{" "}
                          {formatTime(treatment.appointmentBeginsAt)}
                          {treatment.status && ` (${treatment.status})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedTreatment && (
                  <p className="mt-2 text-sm text-blue-500">
                    Tap to add treatment notes
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">No treatment plans available.</p>
      )}

      {showNewPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <NewTreatmentPlanForm
              clientId={clientId}
              onClose={() => setShowNewPlanModal(false)}
              onSubmit={handleCreatePlan}
            />
          </div>
        </div>
      )}

      {showNotesModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <TreatmentNotesForm
              treatment={selectedTreatment}
              plan={selectedPlan}
              planId={selectedPlan.id || selectedPlan._id}
              planDetails={getDecryptedData(selectedPlan)}
              onClose={() => setShowNotesModal(false)}
              onSubmit={handleSaveTreatmentNotes}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentPlanDetails;
