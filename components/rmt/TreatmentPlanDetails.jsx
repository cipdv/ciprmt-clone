// components/rmt/TreatmentPlanDetails.jsx
"use client";

import { useState } from "react";
import { createTreatmentPlan } from "@/app/_actions";
import NewTreatmentPlanForm from "./NewTreatmentPlanForm";
import TreatmentNotesForm from "./TreatmentNotesForm";

const TreatmentPlanDetails = ({ treatmentPlans, clientId }) => {
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, plan) => {
    e.preventDefault();
    const treatmentData = JSON.parse(e.dataTransfer.getData("text/plain"));
    setSelectedTreatment(treatmentData);
    setSelectedPlan(plan);
    setShowNotesModal(true);
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
    console.log("Treatment Notes:", formData);
    console.log("Treatment Plan ID:", selectedPlan._id);
    setShowNotesModal(false);
    // You might want to refresh the treatment plans list here
  };

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

      {treatmentPlans.success && treatmentPlans.data.length > 0 ? (
        <div className="space-y-4">
          {treatmentPlans.data.map((plan) => (
            <div
              key={plan._id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, plan)}
            >
              <h3 className="text-xl font-semibold mb-2 text-blue-600">
                {plan.decryptedData.clientGoals}
              </h3>
              <p className="text-gray-600">
                <span className="font-medium">Start Date:</span>{" "}
                {new Date(plan.startDate).toLocaleDateString()}
              </p>
              <p className="text-gray-600 mt-2">
                <span className="font-medium">Areas to be Treated:</span>{" "}
                {plan.decryptedData.areasToBeTreated}
              </p>
            </div>
          ))}
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

      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <TreatmentNotesForm
              treatment={selectedTreatment}
              planId={selectedPlan._id}
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
