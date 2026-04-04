"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getClientProfileData,
  getTreatmentsForPlan,
  createTreatmentPlan,
  updateTreatmentPlan,
  setDNSTreatmentStatusAttachment,
  deleteAppointment,
  clearAppointment,
  emailClientToUpdateHealthHistory,
  saveClientPhoneNumber,
} from "@/app/_actions";
import TreatmentNotesForm from "@/components/rmt/TreatmentNotesForm";
import NewTreatmentPlanForm from "@/components/rmt/NewTreatmentPlanForm";
import BookAppointmentModal from "@/components/rmt/BookAppointmentModal";
import ClientHealthHistory from "@/components/rmt/ClientHealthHistory";
import ClientBenefitsCalculator from "@/components/rmt/ClientBenefitsCalculator";
import ClientNotesList from "@/components/rmt/ClientNotesList";

const ClientProfilePage = ({ params }) => {
  const router = useRouter();
  const [clientId, setClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [healthHistory, setHealthHistory] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("treatment-notes");
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [planTreatments, setPlanTreatments] = useState({});
  const [loadingPlanTreatmentsId, setLoadingPlanTreatmentsId] = useState(null);
  const [selectedPlanTreatment, setSelectedPlanTreatment] = useState({});
  const [showAllPlanTreatments, setShowAllPlanTreatments] = useState({});
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingPlanDataById, setEditingPlanDataById] = useState({});
  const [savingPlanId, setSavingPlanId] = useState(null);

  // drag state
  const [draggedNote, setDraggedNote] = useState(null);
  const [noteBeingEdited, setNoteBeingEdited] = useState(null);
  const [dragTargetPlanId, setDragTargetPlanId] = useState(null);

  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [isSendingHealthHistoryReminder, setIsSendingHealthHistoryReminder] =
    useState(false);
  const [healthHistoryReminderStatus, setHealthHistoryReminderStatus] =
    useState(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [isSavingPhoneNumber, setIsSavingPhoneNumber] = useState(false);
  const [phoneSaveStatus, setPhoneSaveStatus] = useState(null);

  const autoScrollIntervalRef = useRef(null);

  const clearAutoScrollInterval = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

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
          setClientNotes(result.clientNotes || []);
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

      clearAutoScrollInterval();

      if (mouseY < scrollThreshold) {
        autoScrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
      } else if (mouseY > viewportHeight - scrollThreshold) {
        autoScrollIntervalRef.current = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
      }
    };

    const handleDragEnd = () => {
      clearAutoScrollInterval();
      setDragTargetPlanId(null);
      setDraggedNote(null);
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
      clearAutoScrollInterval();
    };
  }, [draggedNote]);

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
      clearAutoScrollInterval();
      setExpandedPlanId(planId);
      setNoteBeingEdited(draggedNote);
      setDraggedNote(null);
      setDragTargetPlanId(null);
      if (!planTreatments[planId]) {
        void loadPlanTreatments(planId);
      }
    }
  };

  const loadPlanTreatments = async (planId) => {
    setLoadingPlanTreatmentsId(planId);
    try {
      const result = await getTreatmentsForPlan(planId, true);
      if (result.success) {
        setPlanTreatments((prev) => ({
          ...prev,
          [planId]: result.data || [],
        }));
        return;
      }
      setPlanTreatments((prev) => ({ ...prev, [planId]: [] }));
    } catch {
      setPlanTreatments((prev) => ({ ...prev, [planId]: [] }));
    } finally {
      setLoadingPlanTreatmentsId(null);
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

  const getInitialPlanFormData = (plan) => ({
    startDate: plan?.startDate
      ? new Date(plan.startDate).toISOString().split("T")[0]
      : "",
    endDate: plan?.decryptedData?.endDate || plan?.endDate || "",
    clientGoals: plan?.decryptedData?.clientGoals || plan?.clientGoals || "",
    areasToBeTreated:
      plan?.decryptedData?.areasToBeTreated || plan?.areasToBeTreated || "",
    durationAndFrequency:
      plan?.decryptedData?.durationAndFrequency ||
      plan?.durationAndFrequency ||
      "",
    recommendedSelfCare: plan?.decryptedData?.recommendedSelfCare || "",
    scheduleForReassessment:
      plan?.decryptedData?.scheduleForReassessment || "",
    typeAndFocusOfTreatments:
      plan?.decryptedData?.typeAndFocusOfTreatments || "",
    anticipatedClientResponse:
      plan?.decryptedData?.anticipatedClientResponse || "",
    conclusionOfTreatmentPlan:
      plan?.decryptedData?.conclusionOfTreatmentPlan || "",
  });

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setEditingPlanDataById((prev) => ({
      ...prev,
      [plan.id]: getInitialPlanFormData(plan),
    }));
  };

  const handleEditPlanFieldChange = (planId, field, value) => {
    setEditingPlanDataById((prev) => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSavePlan = async (planId) => {
    const currentForm = editingPlanDataById[planId];
    if (!currentForm) return;

    let payload = { ...currentForm };
    if ((payload.conclusionOfTreatmentPlan || "").trim()) {
      const proceed = window.confirm(
        "this will conclude this treatment plan, are you sure?",
      );
      if (!proceed) return;
      payload.endDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
      }).format(new Date());
    }

    setSavingPlanId(planId);
    try {
      const result = await updateTreatmentPlan(planId, payload);
      if (!result.success) {
        alert(result.message || "Failed to update treatment plan");
        return;
      }

      const refreshResult = await getClientProfileData(client.id);
      if (refreshResult.success) {
        setTreatmentPlans(refreshResult.treatmentPlans || []);
      }
      setEditingPlanId(null);
    } catch {
      alert("Failed to update treatment plan");
    } finally {
      setSavingPlanId(null);
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
    (t) => !t.treatmentNotes && t.status !== "dns",
  );

  const handleCancelAppointment = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();

    const shouldCancel = window.confirm(
      "Are you sure you want to cancel this appointment?",
    );
    if (!shouldCancel) return;

    try {
      await clearAppointment(id);
      const refreshed = await getClientProfileData(client.id);
      if (refreshed.success) setTreatments(refreshed.treatments);
    } catch {
      alert("Failed to cancel appointment");
    }
  };

  const getAppointmentStartMs = (treatment) => {
    if (!treatment?.appointmentDate) return null;

    const parsedDate = new Date(treatment.appointmentDate);
    if (Number.isNaN(parsedDate.getTime())) return null;

    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
    }).format(parsedDate);
    const timeKey = (treatment?.appointmentBeginsAt || "00:00:00")
      .toString()
      .slice(0, 8);

    const start = new Date(`${dateKey}T${timeKey}`);
    if (Number.isNaN(start.getTime())) return null;
    return start.getTime();
  };

  const nowMs = Date.now();
  const unfinishedPastTreatments = unfinishedTreatments.filter((t) => {
    const startMs = getAppointmentStartMs(t);
    return startMs !== null && startMs < nowMs;
  });
  const upcomingUnfinishedTreatments = unfinishedTreatments.filter((t) => {
    const startMs = getAppointmentStartMs(t);
    return startMs !== null && startMs >= nowMs;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
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

  const formatAppointmentDateTime = (dateString, timeStr) => {
    if (!dateString) return "Not specified";
    try {
      const baseDate = new Date(dateString);
      const datePart = baseDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });

      if (!timeStr) return datePart;
      const [h, m] = timeStr.split(":").map(Number);
      const ampm = h >= 12 ? "pm" : "am";
      const displayHour = h % 12 || 12;
      const timePart = `${displayHour}:${m.toString().padStart(2, "0")}${ampm}`;
      return `${datePart} @${timePart}`;
    } catch {
      return String(dateString);
    }
  };

  const getTreatmentSortTime = (treatment) => {
    const parsedDate = treatment?.date ? new Date(treatment.date) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) return 0;

    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
    }).format(parsedDate);
    const timeKey = (treatment?.appointmentBeginsAt || "00:00:00")
      .toString()
      .slice(0, 8);

    return new Date(`${dateKey}T${timeKey}Z`).getTime();
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    const digits = String(phone).replace(/\D/g, "");
    const local =
      digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

    if (local.length === 10) {
      return `(${local.slice(0, 3)})${local.slice(3, 6)}-${local.slice(6)}`;
    }

    return phone;
  };

  const isHealthHistoryOutOfDate = (lastUpdate) => {
    if (!lastUpdate) return true;

    const lastUpdateDate = new Date(lastUpdate);
    if (Number.isNaN(lastUpdateDate.getTime())) return true;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return lastUpdateDate < oneYearAgo;
  };

  const handleSendHealthHistoryReminder = async () => {
    if (!client?.id) return;

    setHealthHistoryReminderStatus(null);
    setIsSendingHealthHistoryReminder(true);
    try {
      const result = await emailClientToUpdateHealthHistory(client.id);
      if (!result.success) {
        setHealthHistoryReminderStatus({
          type: "error",
          text: result.message || "Failed to send reminder email.",
        });
        return;
      }

      setHealthHistoryReminderStatus({
        type: "success",
        text: result.message || "Reminder email sent.",
      });
    } catch {
      setHealthHistoryReminderStatus({
        type: "error",
        text: "Failed to send reminder email.",
      });
    } finally {
      setIsSendingHealthHistoryReminder(false);
    }
  };

  const handleSavePhoneNumber = async () => {
    if (!client?.id) return;

    setPhoneSaveStatus(null);
    setIsSavingPhoneNumber(true);
    try {
      const result = await saveClientPhoneNumber(client.id, newPhoneNumber);
      if (!result.success) {
        setPhoneSaveStatus({
          type: "error",
          text: result.message || "Failed to save phone number.",
        });
        return;
      }

      setClient((prev) => ({
        ...prev,
        phoneNumber: result.data?.phoneNumber || newPhoneNumber.trim(),
      }));
      setNewPhoneNumber("");
      setPhoneSaveStatus({
        type: "success",
        text: result.message || "Phone number saved.",
      });
    } catch {
      setPhoneSaveStatus({
        type: "error",
        text: "Failed to save phone number.",
      });
    } finally {
      setIsSavingPhoneNumber(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto mt-6 sm:mt-8 p-4 sm:p-6 bg-[#8aa97f]/70 min-h-screen rounded-xl">
      {/* HEADER */}
      {client && (
        <div className="flex justify-between items-start mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-semibold text-black">
                {client.firstName} {client.lastName}
              </h1>
            </div>

            <p className="text-lg text-black mt-2">
              Email: {client.email || "Not provided"}
            </p>
            {client.phoneNumber ? (
              <p className="text-lg text-black">
                Phone: {formatPhoneNumber(client.phoneNumber)}
              </p>
            ) : (
              <div className="mt-2 max-w-sm">
                <label className="block text-xs font-medium text-white/90 mb-1">
                  Add phone number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    placeholder="e.g. 555-123-4567"
                    className="flex-1 rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2 text-sm text-[#1f2a1f]"
                  />
                  <button
                    type="button"
                    onClick={handleSavePhoneNumber}
                    disabled={isSavingPhoneNumber || !newPhoneNumber.trim()}
                    className="px-3 py-2 rounded-md bg-[#3f3a34] text-white text-sm hover:bg-[#2f2a25] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingPhoneNumber ? "Saving..." : "Save"}
                  </button>
                </div>
                {phoneSaveStatus && (
                  <p
                    className={`mt-1 text-xs ${
                      phoneSaveStatus.type === "success"
                        ? "text-[#e7f8e7]"
                        : "text-[#ffe9e9]"
                    }`}
                  >
                    {phoneSaveStatus.text}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="px-4 py-2 bg-[#3f3a34] text-white rounded-md shadow hover:bg-[#2f2a25]"
          >
            Book appointment
          </button>
        </div>
      )}

      <div className="mb-6">
        <ClientBenefitsCalculator
          clientId={client?.id}
          initialCoverage={client?.benefitsCoverage ?? null}
        />
      </div>

      {/* MAIN CARD */}
      <div className="border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl shadow-lg overflow-hidden">
        {/* TABS */}
        <div className="flex border-b border-[#c8d4c3]">
          <button
            onClick={() => setActiveTab("treatment-notes")}
            className={`flex-1 py-4 px-6 text-lg font-semibold border-r border-gray-300 transition-colors duration-200
              ${
                activeTab === "treatment-notes"
                  ? "bg-[#f4f7f2] text-[#1f2a1f]"
                  : "bg-[#e8efe4] text-[#475447] hover:bg-[#dfe8da]"
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
                  ? isHealthHistoryOutOfDate(client?.lastHealthHistoryUpdate)
                    ? "bg-amber-50 text-amber-900"
                    : "bg-[#f4f7f2] text-[#1f2a1f]"
                  : isHealthHistoryOutOfDate(client?.lastHealthHistoryUpdate)
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "bg-[#e8efe4] text-[#475447] hover:bg-[#dfe8da]"
              }
            `}
          >
            <span className="inline-flex items-center gap-2">
              Health History
              {isHealthHistoryOutOfDate(client?.lastHealthHistoryUpdate) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded border border-amber-300 bg-amber-100 text-amber-900">
                  Out of date
                </span>
              )}
            </span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 sm:p-8">
          {/* TREATMENT NOTES TAB */}
          {activeTab === "treatment-notes" && (
            <div className="space-y-10">
              {/* UNFINISHED NOTES */}
              <div>
                <h2 className="text-xl font-semibold mb-6">
                  Notes to complete
                </h2>

                {unfinishedPastTreatments.length > 0 ? (
                  <div className="space-y-4 mb-8">
                    {unfinishedPastTreatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, treatment)}
                        className="border border-gray-300 bg-[#f4f7f2] rounded-lg p-5 shadow-sm hover:shadow-md transition cursor-move"
                      >
                        <div className="space-y-2">
                          <p className="text-gray-800 font-medium">
                            {formatAppointmentDateTime(
                              treatment.appointmentDate,
                              treatment.appointmentBeginsAt,
                            )}
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
                  <p className="text-gray-600 italic mb-8">
                    No unfinished notes.
                  </p>
                )}

                <h3 className="text-lg font-semibold mb-4">
                  Upcoming Treatments
                </h3>
                {upcomingUnfinishedTreatments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingUnfinishedTreatments.map((treatment) => (
                      <div
                        key={treatment.id}
                        className="border border-gray-300 bg-[#f4f7f2] rounded-lg p-5 shadow-sm"
                      >
                        <div className="space-y-2">
                          <p className="text-gray-800 font-medium">
                            {formatAppointmentDateTime(
                              treatment.appointmentDate,
                              treatment.appointmentBeginsAt,
                            )}
                          </p>

                          <p className="text-gray-600 text-sm">
                            Duration: {treatment.duration} minutes
                          </p>

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
                              onClick={(e) =>
                                handleCancelAppointment(e, treatment.id)
                              }
                              className="
                                px-3 py-1
                                border border-amber-400 text-amber-600
                                rounded-md text-sm font-medium
                                hover:bg-amber-50 hover:border-amber-500
                                transition
                              "
                            >
                              Cancel appointment
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                router.push(
                                  `/dashboard/rmt/reschedule-appointment/${treatment.id}`,
                                );
                              }}
                              className="
                                px-3 py-1
                                border border-blue-400 text-blue-600
                                rounded-md text-sm font-medium
                                hover:bg-blue-50 hover:border-blue-500
                                transition
                              "
                            >
                              Reschedule appointment
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic">
                    No upcoming treatments.
                  </p>
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
                  <div className="border border-gray-300 p-6 mb-6 bg-[#f4f7f2] rounded-lg shadow">
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
                              ? "border-blue-400 bg-[#f4f7f2]"
                              : "border-gray-300 bg-[#f4f7f2]"
                          }
                        `}
                      >
                        <div
                          className="p-6 cursor-pointer hover:bg-[#f4f7f2]"
                          onClick={async () => {
                            if (isExpanded) {
                              setExpandedPlanId(null);
                              return;
                            }
                            setExpandedPlanId(plan.id);
                            setNoteBeingEdited(null);
                            setShowAllPlanTreatments((prev) => ({
                              ...prev,
                              [plan.id]: false,
                            }));
                            if (!planTreatments[plan.id]) {
                              await loadPlanTreatments(plan.id);
                            }
                          }}
                        >
                          <div className="space-y-2">
                            {!isExpanded && (
                              <>
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
                              </>
                            )}

                            <p className="text-sm text-gray-500">
                              {formatDate(plan.startDate)} -{" "}
                              {plan.endDate ? formatDate(plan.endDate) : "Ongoing"}
                            </p>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-300 bg-[#f4f7f2] p-6">
                            <div className="mb-6 border border-gray-300 rounded-md p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-base font-semibold text-[#1f2a1f]">
                                  Treatment Plan Details
                                </h4>
                                {editingPlanId !== plan.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleEditPlan(plan)}
                                    className="px-3 py-1 border border-blue-400 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-500 transition"
                                  >
                                    Edit
                                  </button>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPlanId(null)}
                                      className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSavePlan(plan.id)}
                                      disabled={savingPlanId === plan.id}
                                      className="px-3 py-1 border border-green-400 text-green-700 rounded-md text-sm font-medium hover:bg-green-50 hover:border-green-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {savingPlanId === plan.id
                                        ? "Saving..."
                                        : "Save treatment plan"}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {editingPlanId === plan.id ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <label className="block font-medium mb-1">Start Date</label>
                                    <input
                                      type="date"
                                      value={editingPlanDataById[plan.id]?.startDate || ""}
                                      onChange={(e) =>
                                        handleEditPlanFieldChange(
                                          plan.id,
                                          "startDate",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-medium mb-1">End Date</label>
                                    <input
                                      type="date"
                                      value={editingPlanDataById[plan.id]?.endDate || ""}
                                      onChange={(e) =>
                                        handleEditPlanFieldChange(
                                          plan.id,
                                          "endDate",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full rounded-md border border-gray-300 px-2 py-1"
                                    />
                                  </div>

                                  {[
                                    ["clientGoals", "Client Goals"],
                                    ["areasToBeTreated", "Areas to be Treated"],
                                    ["durationAndFrequency", "Duration and Frequency"],
                                    ["recommendedSelfCare", "Recommended Self-care"],
                                    [
                                      "scheduleForReassessment",
                                      "Schedule for Reassessment",
                                    ],
                                    [
                                      "typeAndFocusOfTreatments",
                                      "Type and Focus of Treatments",
                                    ],
                                    [
                                      "anticipatedClientResponse",
                                      "Anticipated Client Response",
                                    ],
                                    [
                                      "conclusionOfTreatmentPlan",
                                      "Conclusion of Treatment Plan",
                                    ],
                                  ].map(([field, label]) => (
                                    <div key={field} className="md:col-span-2">
                                      <label className="block font-medium mb-1">
                                        {label}
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={editingPlanDataById[plan.id]?.[field] || ""}
                                        onChange={(e) =>
                                          handleEditPlanFieldChange(
                                            plan.id,
                                            field,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-1 text-sm text-gray-700">
                                  <p>
                                    <span className="font-semibold">Start Date:</span>{" "}
                                    {formatDate(plan.startDate)}
                                  </p>
                                  <p>
                                    <span className="font-semibold">End Date:</span>{" "}
                                    {plan.decryptedData?.endDate || plan.endDate
                                      ? formatDate(
                                          plan.decryptedData?.endDate || plan.endDate,
                                        )
                                      : "Ongoing"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Client Goals:</span>{" "}
                                    {plan.decryptedData?.clientGoals || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Areas to be Treated:
                                    </span>{" "}
                                    {plan.decryptedData?.areasToBeTreated || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Duration and Frequency:
                                    </span>{" "}
                                    {plan.decryptedData?.durationAndFrequency || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Recommended Self-care:
                                    </span>{" "}
                                    {plan.decryptedData?.recommendedSelfCare || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Schedule for Reassessment:
                                    </span>{" "}
                                    {plan.decryptedData?.scheduleForReassessment || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Type and Focus of Treatments:
                                    </span>{" "}
                                    {plan.decryptedData?.typeAndFocusOfTreatments || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Anticipated Client Response:
                                    </span>{" "}
                                    {plan.decryptedData?.anticipatedClientResponse || "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Conclusion of Treatment Plan:
                                    </span>{" "}
                                    {plan.decryptedData?.conclusionOfTreatmentPlan || "N/A"}
                                  </p>
                                </div>
                              )}
                            </div>

                            <h4 className="text-base font-semibold text-[#1f2a1f] mb-3">
                              Treatments in this plan
                            </h4>

                            {loadingPlanTreatmentsId === plan.id ? (
                              <p className="text-sm text-gray-600">Loading treatments...</p>
                            ) : (planTreatments[plan.id] || []).length > 0 ? (
                              <div className="space-y-2">
                                {(() => {
                                  const sortedTreatments = [...(planTreatments[plan.id] || [])]
                                    .sort(
                                      (a, b) =>
                                        getTreatmentSortTime(b) - getTreatmentSortTime(a),
                                    );

                                  const visibleTreatments = showAllPlanTreatments[plan.id]
                                    ? sortedTreatments
                                    : sortedTreatments.slice(0, 5);

                                  return (
                                    <>
                                      {visibleTreatments.map((treatment) => {
                                        const isOpen =
                                          selectedPlanTreatment[plan.id]?.id === treatment.id;
                                        const notes =
                                          typeof treatment.treatmentNotes === "object"
                                            ? treatment.treatmentNotes
                                            : null;
                                        const findingsArray = Array.isArray(notes?.findings)
                                          ? notes.findings
                                          : [];
                                        const findingsText =
                                          typeof notes?.findings === "string"
                                            ? notes.findings
                                            : findingsArray
                                                .map((f) => f?.finding)
                                                .filter(Boolean)
                                                .join(" | ");
                                        const treatmentText =
                                          typeof notes?.treatment === "string"
                                            ? notes.treatment
                                            : notes?.treatment?.specificTreatment ||
                                              findingsArray
                                                .map((f) => f?.treatment)
                                                .filter(Boolean)
                                                .join(" | ");
                                        const subjectiveText =
                                          notes?.results?.subjectiveResults ||
                                          findingsArray
                                            .map((f) => f?.subjectiveResults)
                                            .filter(Boolean)
                                            .join(" | ");
                                        const objectiveText =
                                          notes?.results?.objectiveResults ||
                                          findingsArray
                                            .map((f) => f?.objectiveResults)
                                            .filter(Boolean)
                                            .join(" | ");
                                        const selfCareText =
                                          notes?.remex ||
                                          findingsArray
                                            .map((f) => f?.selfCare)
                                            .filter(Boolean)
                                            .join(" | ");
                                        const generalTreatmentText =
                                          notes?.generalTreatment ||
                                          notes?.treatment?.generalTreatment ||
                                          null;
                                        const referToHcpText = notes?.referToHCP || null;
                                        const paymentTypeText =
                                          notes?.paymentType || treatment.paymentType || null;
                                        const priceText =
                                          notes?.price !== undefined &&
                                          notes?.price !== null
                                            ? notes.price
                                            : treatment.price;

                                        return (
                                          <div
                                            key={treatment.id}
                                            className={`border rounded-md transition ${
                                              isOpen
                                                ? "border-blue-400"
                                                : "border-gray-300"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSelectedPlanTreatment((prev) => ({
                                                  ...prev,
                                                  [plan.id]: isOpen
                                                    ? null
                                                    : treatment,
                                                }))
                                              }
                                              className="w-full text-left px-3 py-2"
                                            >
                                              {formatAppointmentDateTime(
                                                treatment.date,
                                                treatment.appointmentBeginsAt,
                                              )}
                                            </button>

                                            <div
                                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                                isOpen
                                                  ? "max-h-[700px] opacity-100"
                                                  : "max-h-0 opacity-0"
                                              }`}
                                            >
                                              <div className="border-t border-gray-200 p-4 bg-[#f4f7f2]">
                                                <h5 className="font-semibold text-[#1f2a1f] mb-2">
                                                  Treatment Details
                                                </h5>
                                                <div className="space-y-1 text-sm text-gray-700">
                                                  <p>
                                                    <span className="font-semibold">
                                                      Date/Time:
                                                    </span>{" "}
                                                    {formatAppointmentDateTime(
                                                      treatment.date,
                                                      treatment.appointmentBeginsAt,
                                                    )}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Duration:
                                                    </span>{" "}
                                                    {treatment.duration || "N/A"} minutes
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Findings:
                                                    </span>{" "}
                                                    {findingsText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Treatment:
                                                    </span>{" "}
                                                    {treatmentText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Subjective Results:
                                                    </span>{" "}
                                                    {subjectiveText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Objective Results:
                                                    </span>{" "}
                                                    {objectiveText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Self-care:
                                                    </span>{" "}
                                                    {selfCareText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      General Treatment:
                                                    </span>{" "}
                                                    {generalTreatmentText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Refer to HCP:
                                                    </span>{" "}
                                                    {referToHcpText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Payment Type:
                                                    </span>{" "}
                                                    {paymentTypeText || "N/A"}
                                                  </p>
                                                  <p>
                                                    <span className="font-semibold">
                                                      Price:
                                                    </span>{" "}
                                                    {priceText !== null &&
                                                    priceText !== undefined
                                                      ? `$${priceText}`
                                                      : "N/A"}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {sortedTreatments.length > 5 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowAllPlanTreatments((prev) => ({
                                              ...prev,
                                              [plan.id]: !prev[plan.id],
                                            }))
                                          }
                                          className="text-sm font-medium text-blue-700 hover:text-blue-800"
                                        >
                                          {showAllPlanTreatments[plan.id]
                                            ? "Show less"
                                            : `Show more (${sortedTreatments.length - 5} more)`}
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No treatments connected to this plan.</p>
                            )}
                          </div>
                        )}

                        {/* NOTES FORM AREA */}
                        {isExpanded && noteBeingEdited && (
                          <div className="border-t border-gray-300 bg-[#f4f7f2] p-6">
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
                                  setClientNotes(
                                    refreshResult.clientNotes || [],
                                  );
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
              <h2 className="text-xl font-semibold mb-6 text-[#1f2a1f]">
                Health History
              </h2>

              {!healthHistory || healthHistory.length === 0 ? (
                <p className="text-gray-600 italic">
                  No health history found for this client.
                </p>
              ) : (
                <ClientHealthHistory
                  healthHistory={healthHistory}
                  isOutOfDate={isHealthHistoryOutOfDate(
                    client?.lastHealthHistoryUpdate,
                  )}
                  onSendReminder={handleSendHealthHistoryReminder}
                  isSendingReminder={isSendingHealthHistoryReminder}
                  reminderStatus={healthHistoryReminderStatus}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ClientNotesList notes={clientNotes} />
      </div>

      {client && (
        <BookAppointmentModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          clientId={client.id}
          onBooked={async () => {
            const refreshed = await getClientProfileData(client.id);
            if (refreshed.success) {
              setTreatments(refreshed.treatments || []);
              setClientNotes(refreshed.clientNotes || []);
            }
          }}
        />
      )}
    </div>
  );
};

export default ClientProfilePage;
