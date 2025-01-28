"use client";

import { useState } from "react";
import { saveTreatmentNotes } from "@/app/_actions";

const TreatmentNotesForm = ({ treatment, planId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    reasonForMassage: treatment?.consentForm?.reasonForMassage,
    findings: "",
    treatment: {
      specificTreatment: "",
      generalTreatment:
        "Compressions bi: feet, entire legs and glutes, entire back and UFT region, arms and hands, anterior shoulder girdles and upper chest, neck, scalp and face. Stretching bi: ankle d/p flexion, knee flexion, hip flexion/extension/abduction/adduction/IR/ER/SLR/FABER, spinal rotation/ext/lateral flexion, T/S extension, GH flexion/extension/horizontal abduction/adduction, scapulae retraction/depression/general mobilization, neck flexion/ext/rotation/lateral flexion.",
    },
    results: {
      subjectiveResults: "",
      objectiveResults: "",
    },
    remex: "",
    referToHCP: "none given",
    notes: "",
    paymentType: "",
    price: "",
    otherPrice: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleNestedChange = (e, parent) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [parent]: {
        ...prevData[parent],
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await saveTreatmentNotes(treatment._id, planId, formData);
      if (result.success) {
        onSubmit(formData);
      } else {
        console.error("Failed to save treatment notes:", result.message);
      }
    } catch (error) {
      console.error("Error saving treatment notes:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Treatment Notes</h3>
      <p className="text-gray-600 mb-4">
        For: {treatment.firstName} {treatment.lastName} -{" "}
        {new Date(treatment.appointmentDate).toLocaleDateString()}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Reason for Massage
        </label>
        <textarea
          name="reasonForMassage"
          value={formData.reasonForMassage}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          rows="3"
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Findings
        </label>
        <textarea
          name="findings"
          value={formData.findings}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          rows="3"
          required
        ></textarea>
      </div>

      <div>
        <h4 className="font-medium text-gray-700">Treatment</h4>
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Specific Treatment
            </label>
            <textarea
              name="specificTreatment"
              value={formData.treatment.specificTreatment}
              onChange={(e) => handleNestedChange(e, "treatment")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows="3"
              required
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              General Treatment
            </label>
            <textarea
              name="generalTreatment"
              value={formData.treatment.generalTreatment}
              onChange={(e) => handleNestedChange(e, "treatment")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-700">Results</h4>
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subjective Results
            </label>
            <textarea
              name="subjectiveResults"
              value={formData.results.subjectiveResults}
              onChange={(e) => handleNestedChange(e, "results")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows="3"
              required
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Objective Results
            </label>
            <textarea
              name="objectiveResults"
              value={formData.results.objectiveResults}
              onChange={(e) => handleNestedChange(e, "results")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows="3"
              required
            ></textarea>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Remex</label>
        <input
          type="text"
          name="remex"
          value={formData.remex}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
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

      <div className="grid grid-cols-2 gap-4">
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
          >
            <option value="">Select price</option>
            <option value="129.95">$129.95 (60 min)</option>
            <option value="152.55">$152.55 (75 min)</option>
            <option value="175.15">$175.15 (90 min)</option>
            <option value="other">Other</option>
          </select>
          {formData.price === "other" && (
            <input
              type="number"
              name="otherPrice"
              value={formData.otherPrice}
              onChange={handleChange}
              placeholder="Enter custom price"
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          )}
        </div>
      </div>

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
