import React from "react";

const ClientHealthHistory = ({ healthHistory }) => {
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
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-lg font-bold mb-4">
        Updated on: {renderValue(latestHistory.createdAt)}
      </h2>

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
