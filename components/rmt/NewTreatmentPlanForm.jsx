// components/rmt/NewTreatmentPlanForm.jsx
"use client";

import { useState } from "react";

const NewTreatmentPlanForm = ({ clientId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    clientId,
    startDate: "",
    clientGoals: "",
    conclusionOfTreatmentPlan: "",
    endDate: "",
    areasToBeTreated: "",
    durationAndFrequency: "",
    recommendedSelfCare: "",
    scheduleForReassessment: "",
    typeAndFocusOfTreatments: "",
    anticipatedClientResponse: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold mb-4">New Treatment Plan</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Client Goals
          </label>
          <textarea
            name="clientGoals"
            value={formData.clientGoals}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows="3"
            required
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Areas to be Treated
          </label>
          <textarea
            name="areasToBeTreated"
            value={formData.areasToBeTreated}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows="3"
            required
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Duration and Frequency
          </label>
          <input
            type="text"
            name="durationAndFrequency"
            value={formData.durationAndFrequency}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Recommended Self Care
          </label>
          <textarea
            name="recommendedSelfCare"
            value={formData.recommendedSelfCare}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows="3"
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Schedule for Reassessment
          </label>
          <input
            type="text"
            name="scheduleForReassessment"
            value={formData.scheduleForReassessment}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Type and Focus of Treatments
          </label>
          <textarea
            name="typeAndFocusOfTreatments"
            value={formData.typeAndFocusOfTreatments}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows="3"
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Anticipated Client Response
          </label>
          <textarea
            name="anticipatedClientResponse"
            value={formData.anticipatedClientResponse}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows="3"
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Conclusion of Treatment Plan
          </label>
          <textarea
            name="conclusionOfTreatmentPlan"
            value={formData.conclusionOfTreatmentPlan}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            rows="3"
          ></textarea>
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
          Create Plan
        </button>
      </div>
    </form>
  );
};

export default NewTreatmentPlanForm;
