import React from "react";

const ClientHealthHistory = ({
  healthHistory,
  isOutOfDate = false,
  onSendReminder,
  isSendingReminder = false,
  reminderStatus = null,
}) => {
  if (!healthHistory || healthHistory.length === 0) {
    return <div>No health history available.</div>;
  }

  const latestHistory = healthHistory[0];

  const renderSection = (title, fields) => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {fields.map(([key, label]) => (
        <div key={key} className="mb-2">
          <strong>{label}:</strong> {renderValue(latestHistory[key])}
        </div>
      ))}
    </div>
  );

  const renderValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return "N/A";
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
      return null;
    }

    return (
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <ul className="list-disc pl-5">
          {activeConditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderNestedSection = (title, nestedObj, fields) => {
    if (!nestedObj || typeof nestedObj !== "object") {
      return null;
    }

    return (
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        {fields.map(([key, label]) => (
          <div key={key} className="mb-2">
            <strong>{label}:</strong> {renderValue(nestedObj[key])}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white/90 shadow-md rounded border border-[#d5e0d1] px-8 pt-6 pb-8 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-[#233022]">
          Updated on: {renderValue(latestHistory.createdAt)}
        </h2>

        <div className="flex items-center gap-2">
          {isOutOfDate && (
            <span className="text-xs font-medium px-2 py-1 rounded border border-amber-300 bg-amber-100 text-amber-900">
              Health history out of date
            </span>
          )}
          {isOutOfDate && onSendReminder && (
            <button
              type="button"
              onClick={onSendReminder}
              disabled={isSendingReminder}
              className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-md shadow hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingReminder ? "Sending..." : "Email Reminder"}
            </button>
          )}
        </div>
      </div>

      {reminderStatus && (
        <div
          className={`mb-4 text-sm rounded-md px-3 py-2 border ${
            reminderStatus.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {reminderStatus.text}
        </div>
      )}

      {renderSection("Personal Information", [
        ["occupation", "Occupation"],
        ["pronouns", "Pronouns"],
        ["dateOfBirth", "Date of Birth"],
      ])}

      {renderNestedSection("Address", latestHistory.address, [
        ["streetNumber", "Street Number"],
        ["streetName", "Street Name"],
        ["city", "City"],
        ["province", "Province"],
      ])}

      {renderNestedSection("Doctor's Information", latestHistory.doctor, [
        ["noDoctor", "No Current Doctor"],
        ["doctorName", "Doctor's Name"],
      ])}

      {latestHistory.doctor &&
        !latestHistory.doctor.noDoctor &&
        renderNestedSection(
          "Doctor's Address",
          latestHistory.doctor.doctorAddress,
          [
            ["doctorStreetNumber", "Street Number"],
            ["doctorStreetName", "Street Name"],
            ["doctorCity", "City"],
            ["doctorProvince", "Province"],
          ]
        )}

      {renderSection("Health History", [
        ["generalHealth", "General Health"],
        ["historyOfMassage", "History of Massage"],
        ["otherHCP", "Other Health Care Providers"],
        ["injuries", "Recent Injuries"],
        ["surgeries", "Recent Surgeries"],
      ])}

      {renderConditionsList(
        latestHistory.medicalConditions,
        "Medical Conditions"
      )}
      {renderConditionsList(
        latestHistory.cardiovascularConditions,
        "Cardiovascular Conditions"
      )}
      {renderConditionsList(
        latestHistory.respiratoryConditions,
        "Respiratory Conditions"
      )}

      {renderSection("Additional Health Information", [
        ["internalEquipment", "Internal Equipment"],
        ["skinConditions", "Skin Conditions"],
        ["infectiousConditions", "Infectious Conditions"],
        ["lossOfFeeling", "Loss of Feeling"],
        ["allergies", "Allergies"],
        ["medications", "Medications"],
        ["pregnant", "Pregnancy Status"],
        ["otherMedicalConditions", "Other Medical Conditions"],
      ])}

      {renderSection("Other Information", [
        ["sourceOfReferral", "Source of Referral"],
        ["privacyPolicy", "Privacy Policy Agreed"],
      ])}
    </div>
  );
};

export default ClientHealthHistory;
