"use client";

import { useState, useEffect } from "react";
import {
  getClientProfileData,
  createTreatmentPlan,
  setDNSTreatmentStatusAttachment,
} from "@/app/_actions";
import TreatmentNotesForm from "@/components/rmt/TreatmentNotesForm";
import NewTreatmentPlanForm from "@/components/rmt/NewTreatmentPlanForm";
import BookAppointmentModal from "@/components/rmt/BookAppointmentModal";
import ClientHealthHistory from "@/components/rmt/ClientHealthHistory";

const ClientProfilePage = ({ params }) => {
  const [clientId, setClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [healthHistory, setHealthHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("treatment-notes");
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [draggedNote, setDraggedNote] = useState(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setClientId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!clientId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getClientProfileData(clientId);

        console.log("[v0] Client profile data received:", result);

        if (result.success) {
          setClient(result.client);
          setTreatments(result.treatments || []);
          setTreatmentPlans(result.treatmentPlans || []);
          setHealthHistory(result.healthHistory || []);
        } else {
          setError(result.message);
        }
      } catch (error) {
        console.error("Error fetching client profile data:", error);
        setError("Failed to load client profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  useEffect(() => {
    const handleDragMove = (e) => {
      if (!draggedNote) return;

      const scrollThreshold = 100;
      const scrollSpeed = 10;
      const viewportHeight = window.innerHeight;
      const mouseY = e.clientY;

      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }

      if (mouseY < scrollThreshold) {
        const interval = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
        setAutoScrollInterval(interval);
      } else if (mouseY > viewportHeight - scrollThreshold) {
        const interval = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
        setAutoScrollInterval(interval);
      }
    };

    const handleDragEnd = () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    };

    if (draggedNote) {
      document.addEventListener("dragover", handleDragMove);
      document.addEventListener("dragend", handleDragEnd);
      document.addEventListener("drop", handleDragEnd);
    }

    return () => {
      document.removeEventListener("dragover", handleDragMove);
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("drop", handleDragEnd);
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
      }
    };
  }, [draggedNote, autoScrollInterval]);

  const handleDragStart = (e, treatment) => {
    setDraggedNote(treatment);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, planId) => {
    e.preventDefault();
    if (draggedNote) {
      setExpandedPlanId(planId);
      setDraggedNote(null);
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    }
  };

  const handleCreateNewPlan = async (formData) => {
    try {
      const result = await createTreatmentPlan(formData, client?.id);
      if (result.success) {
        const refreshResult = await getClientProfileData(client.id);
        if (refreshResult.success) {
          setTreatmentPlans(refreshResult.treatmentPlans);
        }
        setShowNewPlanForm(false);
        console.log("Treatment plan created successfully");
      } else {
        console.error("Failed to create treatment plan:", result.message);
        alert("Failed to create treatment plan: " + result.message);
      }
    } catch (error) {
      console.error("Error creating treatment plan:", error);
      alert("An error occurred while creating the treatment plan");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return String(dateString);
    }
  };

  const handleDidNotShow = async (e, treatmentId) => {
    e.stopPropagation();
    e.preventDefault();

    if (!treatmentId) return;

    setDnsLoading(true);
    try {
      const result = await setDNSTreatmentStatusAttachment(treatmentId);
      if (result.success) {
        // Refresh the treatments list
        const refreshResult = await getClientProfileData(client.id);
        if (refreshResult.success) {
          setTreatments(refreshResult.treatments);
        }
        console.log("Treatment marked as DNS successfully");
      } else {
        console.error("Failed to mark as DNS:", result.message);
        alert("Failed to mark as DNS: " + result.message);
      }
    } catch (error) {
      console.error("Error marking as DNS:", error);
      alert("An error occurred while marking as DNS");
    } finally {
      setDnsLoading(false);
    }
  };

  const handleButtonMouseDown = (e) => {
    e.stopPropagation();
  };

  const handleHealthHistoryTabClick = async () => {
    setActiveTab("health-history");
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  // Get unfinished treatments (no treatment notes and not DNS)
  const unfinishedTreatments = treatments.filter(
    (t) => !t.treatmentNotes && t.status !== "dns"
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-formBackground min-h-screen">
      {client && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-black">
            {client.firstName} {client.lastName}
          </h1>
          <button onClick={() => setIsBookingModalOpen(true)} className="btn">
            Book appointment
          </button>
        </div>
      )}

      <div className="border border-gray-300 bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("treatment-notes")}
            className={`flex-1 py-4 px-6 text-lg font-semibold border-r border-gray-300 transition-colors duration-200 ${
              activeTab === "treatment-notes"
                ? "bg-white text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Treatment Notes
          </button>
          <button
            onClick={handleHealthHistoryTabClick}
            className={`flex-1 py-4 px-6 text-lg font-semibold transition-colors duration-200 ${
              activeTab === "health-history"
                ? "bg-white text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Health History
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === "treatment-notes" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-6">Unfinished Notes</h2>
                {unfinishedTreatments.length > 0 ? (
                  <div className="space-y-4">
                    {unfinishedTreatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        className="border border-gray-300 p-6 bg-white rounded-lg cursor-move hover:shadow-lg transition-all duration-200 hover:border-indigo-300"
                        draggable
                        onDragStart={(e) => handleDragStart(e, treatment)}
                      >
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">
                            Date: {formatDate(treatment.appointmentDate)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Duration: {treatment.duration || "Not specified"}{" "}
                            minutes
                          </div>
                          <button
                            className={`btn ${
                              dnsLoading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            onClick={(e) => handleDidNotShow(e, treatment.id)}
                            onMouseDown={handleButtonMouseDown}
                            draggable={false}
                            disabled={dnsLoading}
                          >
                            {dnsLoading ? "Processing..." : "Did not show"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600 italic">
                    No unfinished notes
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Treatment Plans</h2>
                  <button
                    onClick={() => setShowNewPlanForm(true)}
                    className="btn text-sm"
                  >
                    create new treatment plan
                  </button>
                </div>

                {showNewPlanForm && (
                  <div className="border border-gray-300 p-6 mb-6 bg-gray-50 rounded-lg shadow-sm">
                    <NewTreatmentPlanForm
                      clientId={client?.id}
                      onClose={() => setShowNewPlanForm(false)}
                      onSubmit={handleCreateNewPlan}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {treatmentPlans.map((plan) => {
                    console.log("[v0] Rendering plan:", plan);
                    return (
                      <div
                        key={plan.id}
                        className="border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        <div
                          className="p-6 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, plan.id)}
                          onClick={() =>
                            setExpandedPlanId(
                              expandedPlanId === plan.id ? null : plan.id
                            )
                          }
                        >
                          <div className="space-y-3">
                            <div className="font-medium text-gray-900 text-lg">
                              Goals:{" "}
                              {plan.decryptedData?.clientGoals ||
                                plan.clientGoals ||
                                plan.goals ||
                                "Not specified"}
                            </div>
                            {(plan.decryptedData?.areasToBeTreated ||
                              plan.areasToTreat) && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">
                                  Areas to treat:
                                </span>{" "}
                                {plan.decryptedData?.areasToBeTreated ||
                                  plan.areasToTreat}
                              </div>
                            )}
                            {(plan.decryptedData?.durationAndFrequency ||
                              plan.durationFrequency) && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">
                                  Duration/Frequency:
                                </span>{" "}
                                {plan.decryptedData?.durationAndFrequency ||
                                  plan.durationFrequency}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                              {formatDate(plan.startDate)} -{" "}
                              {formatDate(plan.endDate)}
                            </div>
                            {plan.status && (
                              <div className="text-xs text-gray-500 capitalize">
                                <span className="font-medium">Status:</span>{" "}
                                {plan.status}
                              </div>
                            )}
                          </div>
                        </div>

                        {expandedPlanId === plan.id && draggedNote && (
                          <div className="border-t border-gray-300 p-6 bg-gray-50">
                            <TreatmentNotesForm
                              treatment={draggedNote}
                              planId={plan.id}
                              plan={plan}
                              planDetails={plan}
                              onClose={() => {
                                setExpandedPlanId(null);
                                setDraggedNote(null);
                              }}
                              onSubmit={async () => {
                                setExpandedPlanId(null);
                                setDraggedNote(null);
                                // Refresh data
                                const refreshResult =
                                  await getClientProfileData(client.id);
                                if (refreshResult.success) {
                                  setTreatments(refreshResult.treatments);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "health-history" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Health History</h2>

              {(!healthHistory || healthHistory.length === 0) && (
                <div className="text-gray-600 py-4 italic">
                  No health history found for this client.
                </div>
              )}

              {healthHistory && healthHistory.length > 0 && (
                <ClientHealthHistory healthHistory={healthHistory} />
              )}
            </div>
          )}
        </div>
      </div>

      {client && (
        <BookAppointmentModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          clientId={client.id}
        />
      )}
    </div>
  );
};

export default ClientProfilePage;
