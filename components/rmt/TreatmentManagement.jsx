"use client";

import { useState, useEffect } from "react";
import TreatmentDetails from "./TreatmentDetails";
import TreatmentPlans from "./TreatmentPlanDetails";
import TreatmentNotesForm from "./TreatmentNotesForm";
import {
  getTreatmentById,
  getTreatmentPlansForUser,
  createTreatmentPlan,
  saveTreatmentNotes,
} from "@/app/_actions";

export default function TreatmentManagement({ id }) {
  const [treatment, setTreatment] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [isNewPlanDialogOpen, setIsNewPlanDialogOpen] = useState(false);
  const [isNotesFormOpen, setIsNotesFormOpen] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const treatmentData = await getTreatmentById(id);
        setTreatment(treatmentData);

        if (treatmentData.userId) {
          const plansResult = await getTreatmentPlansForUser(
            treatmentData.userId
          );
          if (plansResult.success) {
            setTreatmentPlans(plansResult.data);
          } else {
            throw new Error(
              plansResult.message || "Failed to fetch treatment plans"
            );
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load treatment data. Please try again later.");
      }
    }
    fetchData();
  }, [id]);

  const handleCreatePlan = async (formData) => {
    try {
      const planData = {
        startDate: formData.get("startDate"),
        objectivesOfTreatmentPlan: formData.get("objectives"),
        clientGoals: formData.get("clientGoals"),
        areasToBeTreated: formData.get("areas"),
        durationAndFrequency: formData.get("duration"),
        typeAndFocusOfTreatments: formData.get("focus"),
        recommendedSelfCare: formData.get("selfCare"),
        scheduleForReassessment: formData.get("reassessment"),
        anticipatedClientResponse: formData.get("anticipatedResponse"),
      };

      const result = await createTreatmentPlan(planData, treatment.userId);
      if (result.success) {
        const newPlan = {
          ...result.plan,
          decryptedData: {
            objectivesOfTreatmentPlan: planData.objectivesOfTreatmentPlan,
            clientGoals: planData.clientGoals,
            areasToBeTreated: planData.areasToBeTreated,
            durationAndFrequency: planData.durationAndFrequency,
            typeAndFocusOfTreatments: planData.typeAndFocusOfTreatments,
            recommendedSelfCare: planData.recommendedSelfCare,
            scheduleForReassessment: planData.scheduleForReassessment,
            anticipatedClientResponse: planData.anticipatedClientResponse,
          },
        };
        setTreatmentPlans((prevPlans) => [...prevPlans, newPlan]);
        setIsNewPlanDialogOpen(false);
      } else {
        throw new Error(result.message || "Failed to create treatment plan");
      }
    } catch (error) {
      console.error("Failed to create treatment plan:", error);
      setError("Failed to create treatment plan. Please try again.");
    }
  };

  const handleDrop = (planId) => {
    setCurrentPlanId(planId);
    setIsNotesFormOpen(true);
  };

  const handleSaveNotes = async (notesData) => {
    try {
      const result = await saveTreatmentNotes(id, currentPlanId, notesData);
      if (result.success) {
        const updatedPlans = treatmentPlans.map((plan) =>
          plan._id === currentPlanId
            ? { ...plan, treatments: [...(plan.treatments || []), id] }
            : plan
        );
        setTreatmentPlans(updatedPlans);
        setIsNotesFormOpen(false);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error("Failed to save treatment notes:", error);
      setError("Failed to save treatment notes. Please try again.");
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!treatment) return <div>Loading...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <TreatmentDetails treatment={treatment} />
      <div>
        <TreatmentPlans
          plans={treatmentPlans}
          onCreatePlan={() => setIsNewPlanDialogOpen(true)}
          onDrop={handleDrop}
        />
        {isNewPlanDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                Create New Treatment Plan
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreatePlan(new FormData(e.target));
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Start Date
                    </label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="objectives"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Objectives
                    </label>
                    <textarea
                      id="objectives"
                      name="objectives"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="clientGoals"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Client Goals
                    </label>
                    <textarea
                      id="clientGoals"
                      name="clientGoals"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="areas"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Areas to be Treated
                    </label>
                    <input
                      id="areas"
                      name="areas"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="duration"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Duration and Frequency
                    </label>
                    <input
                      id="duration"
                      name="duration"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="focus"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Type and Focus of Treatments
                    </label>
                    <input
                      id="focus"
                      name="focus"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="selfCare"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Recommended Self-Care
                    </label>
                    <textarea
                      id="selfCare"
                      name="selfCare"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reassessment"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Schedule for Reassessment
                    </label>
                    <input
                      id="reassessment"
                      name="reassessment"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="anticipatedResponse"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Anticipated Client Response
                    </label>
                    <textarea
                      id="anticipatedResponse"
                      name="anticipatedResponse"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsNewPlanDialogOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Plan
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        {isNotesFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Treatment Notes</h2>
              <TreatmentNotesForm
                onSave={handleSaveNotes}
                onCancel={() => setIsNotesFormOpen(false)}
                treatmentPlan={treatmentPlans.find(
                  (plan) => plan._id === currentPlanId
                )}
                treatmentId={id}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
