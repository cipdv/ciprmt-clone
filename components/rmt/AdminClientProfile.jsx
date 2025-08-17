"use client";

import { useState, useEffect } from "react";
import {
  getClientProfileData,
  addTreatmentNoteToTreatmentPlan,
  createNewTreatmentPlan,
  bookAppointmentForClient,
} from "@/app/_actions";

const AdminClientProfile = ({ clientId }) => {
  const [activeTab, setActiveTab] = useState("treatment-notes");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        const result = await getClientProfileData(clientId);

        if (result.success) {
          setProfileData(result.data);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Failed to load client profile");
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      loadProfileData();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading client profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No profile data available</div>
      </div>
    );
  }

  const { client, healthHistory, unfinishedNotes, treatmentPlans } =
    profileData;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {client.firstName} {client.lastName}
          </h1>
          <div className="mt-2 text-gray-600">
            <p>Email: {client.email}</p>
            <p>Phone: {client.phoneNumber || "Not provided"}</p>
          </div>
        </div>
        <button
          onClick={() => setShowBookingModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Book Appointment
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("treatment-notes")}
          className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
            activeTab === "treatment-notes"
              ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Treatment Notes
        </button>
        <button
          onClick={() => setActiveTab("health-history")}
          className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
            activeTab === "health-history"
              ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Health History
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === "treatment-notes" && (
          <TreatmentNotesTab
            unfinishedNotes={unfinishedNotes}
            treatmentPlans={treatmentPlans}
            clientId={clientId}
            onDataUpdate={() => {
              // Reload data when changes are made
              const loadProfileData = async () => {
                const result = await getClientProfileData(clientId);
                if (result.success) {
                  setProfileData(result.data);
                }
              };
              loadProfileData();
            }}
          />
        )}

        {activeTab === "health-history" && (
          <HealthHistoryTab healthHistory={healthHistory} />
        )}
      </div>

      {/* Book Appointment Modal */}
      {showBookingModal && (
        <BookingModal
          clientId={clientId}
          clientName={`${client.firstName} ${client.lastName}`}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
};

// Treatment Notes Tab Component
const TreatmentNotesTab = ({
  unfinishedNotes,
  treatmentPlans,
  clientId,
  onDataUpdate,
}) => {
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlanGoals, setNewPlanGoals] = useState("");
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const handleCreateNewPlan = async () => {
    if (!newPlanGoals.trim()) return;

    setIsCreatingPlan(true);
    try {
      const result = await createNewTreatmentPlan(clientId, newPlanGoals);
      if (result.success) {
        setNewPlanGoals("");
        setShowNewPlanForm(false);
        onDataUpdate(); // Refresh the data
      } else {
        alert("Failed to create treatment plan: " + result.message);
      }
    } catch (error) {
      console.error("Error creating treatment plan:", error);
      alert("An error occurred while creating the treatment plan");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Unfinished Notes Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          Unfinished Treatment Notes
        </h2>
        {unfinishedNotes.length === 0 ? (
          <div className="text-gray-500 italic">
            No unfinished treatment notes
          </div>
        ) : (
          <div className="grid gap-4">
            {unfinishedNotes.map((note) => (
              <UnfinishedNoteCard
                key={note.id}
                note={note}
                onDataUpdate={onDataUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Treatment Plans Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Treatment Plans
          </h2>
          <button
            onClick={() => setShowNewPlanForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Start New Treatment Plan
          </button>
        </div>

        {showNewPlanForm && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Create New Treatment Plan
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goals
                </label>
                <textarea
                  value={newPlanGoals}
                  onChange={(e) => setNewPlanGoals(e.target.value)}
                  placeholder="Enter treatment goals and objectives..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateNewPlan}
                  disabled={isCreatingPlan || !newPlanGoals.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isCreatingPlan ? "Creating..." : "Create Plan"}
                </button>
                <button
                  onClick={() => {
                    setShowNewPlanForm(false);
                    setNewPlanGoals("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {treatmentPlans.length === 0 ? (
          <div className="text-gray-500 italic">No treatment plans</div>
        ) : (
          <div className="grid gap-4">
            {treatmentPlans.map((plan) => (
              <TreatmentPlanCard
                key={plan.id}
                plan={plan}
                onDataUpdate={onDataUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Unfinished Note Card Component
const UnfinishedNoteCard = ({ note, onDataUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(note));
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-move hover:shadow-md transition-all ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">
            {formatDate(note.appointmentDate)}
          </h3>
          <div className="text-sm text-gray-600 mt-1">
            <p>Time: {formatTime(note.startTime)}</p>
            <p>Duration: {note.duration} minutes</p>
            <p>Location: {note.location || "Not specified"}</p>
          </div>
        </div>
        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
          {note.status}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3 italic flex items-center">
        <span className="mr-2">↗️</span>
        Drag this card to a treatment plan to add treatment notes
      </p>
    </div>
  );
};

// Treatment Plan Card Component
const TreatmentPlanCard = ({ plan, onDataUpdate }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set isDragOver to false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsProcessing(true);

    try {
      const noteData = JSON.parse(e.dataTransfer.getData("text/plain"));

      const result = await addTreatmentNoteToTreatmentPlan(
        noteData.id,
        plan.id
      );

      if (result.success) {
        // Show success feedback
        const successMessage = document.createElement("div");
        successMessage.className =
          "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50";
        successMessage.textContent =
          "Treatment note added to plan successfully!";
        document.body.appendChild(successMessage);

        setTimeout(() => {
          document.body.removeChild(successMessage);
        }, 3000);

        // Refresh the data
        onDataUpdate();
      } else {
        alert("Failed to add treatment note to plan: " + result.message);
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      alert("An error occurred while adding the treatment note to the plan");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      className={`relative border-2 rounded-lg p-4 transition-all ${
        isDragOver
          ? "border-blue-400 bg-blue-50 shadow-lg scale-102"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
      } ${isProcessing ? "opacity-50" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-blue-600 font-medium">Processing...</div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-2">Treatment Plan</h3>
          <div className="text-sm text-gray-600">
            <p>
              <strong>Goals:</strong> {plan.goals || "No goals specified"}
            </p>
            <p>
              <strong>Start Date:</strong> {formatDate(plan.startDate)}
            </p>
            <p>
              <strong>End Date:</strong> {formatDate(plan.endDate)}
            </p>
          </div>
        </div>
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          {plan.status}
        </div>
      </div>

      {isDragOver && (
        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <div className="flex items-center text-blue-700">
            <span className="mr-2">📝</span>
            <span className="font-medium">
              Drop treatment note here to add to this plan
            </span>
          </div>
        </div>
      )}

      {!isDragOver && (
        <div className="mt-3 p-2 border-2 border-dashed border-gray-200 rounded-lg text-center">
          <span className="text-xs text-gray-400">
            Drop zone for treatment notes
          </span>
        </div>
      )}
    </div>
  );
};

// Health History Tab Component
const HealthHistoryTab = ({ healthHistory }) => {
  if (!healthHistory) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No health history available</div>
        <p className="text-gray-400 mt-2">
          The client has not completed their health history form yet.
        </p>
      </div>
    );
  }

  const renderSection = (title, fields) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(([key, label]) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">{label}:</span>
            <span className="text-gray-900">
              {renderValue(healthHistory[key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  };

  const renderConditionsList = (conditions, title) => {
    if (!conditions || typeof conditions !== "object") {
      return null;
    }

    const activeConditions = Object.entries(conditions)
      .filter(([_, value]) => value === true)
      .map(
        ([key, _]) =>
          key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
      );

    if (activeConditions.length === 0) {
      return (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">{title}</h3>
          <p className="text-gray-400 italic">None reported</p>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">{title}</h3>
        <ul className="list-disc pl-5 space-y-1">
          {activeConditions.map((condition) => (
            <li key={condition} className="text-gray-900">
              {condition}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Health History</h2>

      <div className="space-y-8">
        {renderSection("Personal Information", [
          ["occupation", "Occupation"],
          ["pronouns", "Pronouns"],
          ["date_of_birth", "Date of Birth"],
        ])}

        {renderSection("Contact Information", [
          ["street_number", "Street Number"],
          ["street_name", "Street Name"],
          ["city", "City"],
          ["province", "Province"],
        ])}

        {renderSection("Doctor Information", [
          ["doctor_no_doctor", "No Current Doctor"],
          ["doctor_name", "Doctor's Name"],
          ["doctor_street_number", "Doctor Street Number"],
          ["doctor_street_name", "Doctor Street Name"],
          ["doctor_city", "Doctor City"],
          ["doctor_province", "Doctor Province"],
        ])}

        {renderSection("Health History", [
          ["general_health", "General Health"],
          ["history_of_massage", "History of Massage"],
          ["other_hcp", "Other Health Care Providers"],
          ["injuries", "Recent Injuries"],
          ["surgeries", "Recent Surgeries"],
        ])}

        {renderConditionsList(
          healthHistory.medical_conditions
            ? JSON.parse(healthHistory.medical_conditions)
            : {},
          "Medical Conditions"
        )}

        {renderConditionsList(
          healthHistory.cardiovascular_conditions
            ? JSON.parse(healthHistory.cardiovascular_conditions)
            : {},
          "Cardiovascular Conditions"
        )}

        {renderConditionsList(
          healthHistory.respiratory_conditions
            ? JSON.parse(healthHistory.respiratory_conditions)
            : {},
          "Respiratory Conditions"
        )}

        {renderSection("Additional Health Information", [
          ["internal_equipment", "Internal Equipment"],
          ["skin_conditions", "Skin Conditions"],
          ["infectious_conditions", "Infectious Conditions"],
          ["loss_of_feeling", "Loss of Feeling"],
          ["allergies", "Allergies"],
          ["medications", "Medications"],
          ["pregnant", "Pregnancy Status"],
          ["other_medical_conditions", "Other Medical Conditions"],
        ])}

        {renderSection("Other Information", [
          ["source_of_referral", "Source of Referral"],
          ["privacy_policy_agreed", "Privacy Policy Agreed"],
        ])}
      </div>
    </div>
  );
};

const BookingModal = ({ clientId, clientName, onClose }) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await bookAppointmentForClient(clientId, {
        date,
        time,
        duration,
      });

      if (result.success) {
        setSuccess(true);
        // Reset form
        setDate("");
        setTime("");
        setDuration(60);

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.message || "Failed to book appointment");
      }
    } catch (err) {
      console.error("Error booking appointment:", err);
      setError("An error occurred while booking the appointment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Book Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Booking appointment for:{" "}
          <strong className="text-gray-900">{clientName}</strong>
        </p>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-lg font-medium mb-2">
              ✓ Appointment booked successfully!
            </div>
            <p className="text-gray-600 text-sm">
              The client will receive a confirmation email.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              This modal will close automatically...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Time
              </label>
              <input
                type="time"
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duration
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value={60}>60 minutes</option>
                <option value={75}>75 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? "Booking..." : "Book Appointment"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminClientProfile;
