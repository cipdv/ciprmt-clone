"use client";

import { useState, useEffect } from "react";
import {
  getClientProfileData,
  createTreatmentPlan,
  setDNSTreatmentStatusAttachment,
  deleteAppointment,
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

  // drag state
  const [draggedNote, setDraggedNote] = useState(null);
  const [noteBeingEdited, setNoteBeingEdited] = useState(null);
  const [dragTargetPlanId, setDragTargetPlanId] = useState(null);

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

  // Auto-scroll while dragging
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
      setDragTargetPlanId(null);
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
      if (autoScrollInterval) clearInterval(autoScrollInterval);
    };
  }, [draggedNote, autoScrollInterval]);

  const handleDragStart = (e, treatment) => {
    setDraggedNote(treatment);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, planId) => {
    e.preventDefault();
    setDragTargetPlanId(planId);
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, planId) => {
    e.preventDefault();

    if (draggedNote) {
      setExpandedPlanId(planId);
      setNoteBeingEdited(draggedNote);
      setDraggedNote(null);
      setDragTargetPlanId(null);
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
      } else {
        alert("Failed to create treatment plan: " + result.message);
      }
    } catch {
      alert("An error occurred while creating the treatment plan");
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
        const refreshResult = await getClientProfileData(client.id);
        if (refreshResult.success) setTreatments(refreshResult.treatments);
      } else {
        alert("Failed to mark as DNS: " + result.message);
      }
    } catch {
      alert("An error occurred while marking as DNS");
    } finally {
      setDnsLoading(false);
    }
  };

  const handleDeleteAppointment = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await deleteAppointment(id);
      const refreshed = await getClientProfileData(client.id);
      if (refreshed.success) setTreatments(refreshed.treatments);
    } catch (err) {
      alert("Failed to delete appointment");
    }
  };

  const unfinishedTreatments = treatments.filter(
    (t) => !t.treatmentNotes && t.status !== "dns"
  );

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return String(dateString);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const display = h % 12 || 12;
    return `${display}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-formBackground min-h-screen">
      {/* HEADER */}
      {client && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-white/90 bg-black/40 px-3 py-1 rounded-md">
            {" "}
            {client.firstName} {client.lastName}
          </h1>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="px-4 py-2 bg-buttons text-white rounded-md shadow hover:bg-buttonsHover"
          >
            Book appointment
          </button>
        </div>
      )}

      {/* MAIN CARD */}
      <div className="border border-gray-300 bg-white rounded-xl shadow-lg overflow-hidden">
        {/* TABS */}
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("treatment-notes")}
            className={`flex-1 py-4 px-6 text-lg font-semibold border-r border-gray-300 transition-colors duration-200
              ${
                activeTab === "treatment-notes"
                  ? "bg-white text-black"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            Treatment Notes
          </button>

          <button
            onClick={() => setActiveTab("health-history")}
            className={`flex-1 py-4 px-6 text-lg font-semibold transition-colors duration-200
              ${
                activeTab === "health-history"
                  ? "bg-white text-black"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            Health History
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 sm:p-8">
          {/* TREATMENT NOTES TAB */}
          {activeTab === "treatment-notes" && (
            <div className="space-y-10">
              {/* UNFINISHED NOTES */}
              <div>
                <h2 className="text-xl font-semibold mb-6">Unfinished Notes</h2>

                {unfinishedTreatments.length > 0 ? (
                  <div className="space-y-4">
                    {unfinishedTreatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, treatment)}
                        className="border border-gray-300 bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition cursor-move"
                      >
                        <div className="space-y-2">
                          <p className="text-gray-800 font-medium">
                            {formatDate(treatment.appointmentDate)} —{" "}
                            {formatTime(treatment.appointmentBeginsAt)}
                          </p>

                          <p className="text-gray-600 text-sm">
                            Duration: {treatment.duration} minutes
                          </p>

                          {/* REASON FOR MASSAGE */}
                          {treatment.consentForm?.reasonForMassage && (
                            <p className="text-gray-700 text-sm italic">
                              <span className="font-medium">
                                Reason for Massage:
                              </span>{" "}
                              {treatment.consentForm.reasonForMassage}
                            </p>
                          )}

                          <div className="flex gap-3 pt-3">
                            <button
                              onClick={(e) => handleDidNotShow(e, treatment.id)}
                              draggable={false}
                              className="
                                px-3 py-1
                                border border-amber-400 text-amber-600
                                rounded-md text-sm font-medium
                                hover:bg-amber-50 hover:border-amber-500
                                transition
                              "
                            >
                              Did not show
                            </button>

                            <button
                              onClick={(e) =>
                                handleDeleteAppointment(e, treatment.id)
                              }
                              draggable={false}
                              className="
                                px-3 py-1
                                border border-red-400 text-red-600
                                rounded-md text-sm font-medium
                                hover:bg-red-50 hover:border-red-500
                                transition
                              "
                            >
                              Delete appointment
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic">No unfinished notes.</p>
                )}
              </div>

              {/* TREATMENT PLANS */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Treatment Plans</h2>

                  <button
                    onClick={() => setShowNewPlanForm(true)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded shadow-sm hover:bg-blue-200 text-sm"
                  >
                    Create new plan
                  </button>
                </div>

                {showNewPlanForm && (
                  <div className="border border-gray-300 p-6 mb-6 bg-gray-50 rounded-lg shadow">
                    <NewTreatmentPlanForm
                      clientId={client?.id}
                      onClose={() => setShowNewPlanForm(false)}
                      onSubmit={handleCreateNewPlan}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {treatmentPlans.map((plan) => {
                    const isDragTarget = dragTargetPlanId === plan.id;
                    const isExpanded = expandedPlanId === plan.id;

                    return (
                      <div
                        key={plan.id}
                        onDragOver={(e) => handleDragOver(e, plan.id)}
                        onDrop={(e) => handleDrop(e, plan.id)}
                        className={`
                          border rounded-lg shadow-sm transition-all duration-200
                          ${
                            isDragTarget
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-300 bg-white"
                          }
                        `}
                      >
                        <div
                          className="p-6 cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            setExpandedPlanId(isExpanded ? null : plan.id)
                          }
                        >
                          <div className="space-y-2">
                            <p className="font-semibold text-gray-900">
                              Goals:{" "}
                              {plan.decryptedData?.clientGoals ||
                                plan.clientGoals ||
                                "Not specified"}
                            </p>

                            {(plan.decryptedData?.areasToBeTreated ||
                              plan.areasToTreat) && (
                              <p className="text-gray-700 text-sm">
                                <span className="font-medium">
                                  Areas to treat:
                                </span>{" "}
                                {plan.decryptedData?.areasToBeTreated ||
                                  plan.areasToTreat}
                              </p>
                            )}

                            {(plan.decryptedData?.durationAndFrequency ||
                              plan.durationFrequency) && (
                              <p className="text-gray-700 text-sm">
                                <span className="font-medium">
                                  Duration/Frequency:
                                </span>{" "}
                                {plan.decryptedData?.durationAndFrequency ||
                                  plan.durationFrequency}
                              </p>
                            )}

                            <p className="text-sm text-gray-500">
                              {formatDate(plan.startDate)} –{" "}
                              {formatDate(plan.endDate)}
                            </p>
                          </div>
                        </div>

                        {/* NOTES FORM AREA */}
                        {isExpanded && noteBeingEdited && (
                          <div className="border-t border-gray-300 bg-gray-50 p-6">
                            <div className="mb-4">
                              {/* REASON FOR MASSAGE inside notes area */}
                              {noteBeingEdited?.consentForm
                                ?.reasonForMassage && (
                                <p className="text-gray-800 text-sm italic">
                                  <span className="font-semibold">
                                    Reason for Massage:
                                  </span>{" "}
                                  {noteBeingEdited.consentForm.reasonForMassage}
                                </p>
                              )}
                            </div>

                            <TreatmentNotesForm
                              treatment={noteBeingEdited}
                              planId={plan.id}
                              plan={plan}
                              planDetails={plan}
                              onClose={() => {
                                setExpandedPlanId(null);
                                setNoteBeingEdited(null);
                              }}
                              onSubmit={async () => {
                                setExpandedPlanId(null);
                                setNoteBeingEdited(null);

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

          {/* HEALTH HISTORY TAB */}
          {activeTab === "health-history" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Health History</h2>

              {!healthHistory || healthHistory.length === 0 ? (
                <p className="text-gray-600 italic">
                  No health history found for this client.
                </p>
              ) : (
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
