"use client";

import React, { useState } from "react";
import { saveTreatmentNotesAndIncome } from "@/app/_actions";

const TemporaryNotes = ({ treatments }) => {
  const [forms, setForms] = useState(
    treatments.map((treatment) => ({
      id: treatment._id,
      firstName: treatment.firstName || "",
      lastName: treatment.lastName || "",
      date: treatment.date || "",
      duration: treatment.duration || "",
      reasonForMassage:
        treatment.reasonForMassage ||
        treatment?.consentForm?.reasonForMassage ||
        "",
      findings: "",
      treatment: {
        specificTreatment: "",
        generalTreatment: "",
      },
      results: {
        subjectiveResults: "",
        objectiveResults: "",
      },
      remex: "",
      referToHCP: "",
      notes: "",
      paymentType: "",
      price: "",
    }))
  );

  const handleInputChange = (index, field, value) => {
    const newForms = [...forms];
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      newForms[index][parent][child] = value;
    } else {
      newForms[index][field] = value;
    }
    setForms(newForms);
  };

  const handleSubmit = async (e, form) => {
    e.preventDefault();
    console.log("Submitting form:", form);
    try {
      const result = await saveTreatmentNotesAndIncome(form);
      if (result.success) {
        // Handle success (e.g., show a success message, update UI)
        console.log(result.message);
      } else {
        // Handle error (e.g., show error message)
        console.error(result.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-4">
        Temporary Notes for Treatments
      </h2>
      {forms.map((form, index) => (
        <form
          key={form.id}
          onSubmit={(e) => handleSubmit(e, form)}
          className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
        >
          <h3 className="text-xl font-semibold mb-4">
            Treatment for {form.firstName} {form.lastName}
          </h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Date
              </label>
              <p className="py-2 px-3 bg-gray-100 rounded">{form.date}</p>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Duration
              </label>
              <p className="py-2 px-3 bg-gray-100 rounded">
                {form.duration} minutes
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`reasonForMassage-${index}`}
            >
              Reason for Massage
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`reasonForMassage-${index}`}
              type="text"
              value={form.reasonForMassage}
              onChange={(e) =>
                handleInputChange(index, "reasonForMassage", e.target.value)
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`findings-${index}`}
            >
              Findings
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`findings-${index}`}
              value={form.findings}
              onChange={(e) =>
                handleInputChange(index, "findings", e.target.value)
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`specificTreatment-${index}`}
            >
              Specific Treatment
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`specificTreatment-${index}`}
              type="text"
              value={form.treatment.specificTreatment}
              onChange={(e) =>
                handleInputChange(
                  index,
                  "treatment.specificTreatment",
                  e.target.value
                )
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`generalTreatment-${index}`}
            >
              General Treatment
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`generalTreatment-${index}`}
              type="text"
              value={form.treatment.generalTreatment}
              onChange={(e) =>
                handleInputChange(
                  index,
                  "treatment.generalTreatment",
                  e.target.value
                )
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`subjectiveResults-${index}`}
            >
              Subjective Results
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`subjectiveResults-${index}`}
              value={form.results.subjectiveResults}
              onChange={(e) =>
                handleInputChange(
                  index,
                  "results.subjectiveResults",
                  e.target.value
                )
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`objectiveResults-${index}`}
            >
              Objective Results
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`objectiveResults-${index}`}
              value={form.results.objectiveResults}
              onChange={(e) =>
                handleInputChange(
                  index,
                  "results.objectiveResults",
                  e.target.value
                )
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`remex-${index}`}
            >
              Remex
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`remex-${index}`}
              type="text"
              value={form.remex}
              onChange={(e) =>
                handleInputChange(index, "remex", e.target.value)
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`referToHCP-${index}`}
            >
              Refer to HCP
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`referToHCP-${index}`}
              type="text"
              value={form.referToHCP}
              onChange={(e) =>
                handleInputChange(index, "referToHCP", e.target.value)
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`notes-${index}`}
            >
              Notes
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`notes-${index}`}
              value={form.notes}
              onChange={(e) =>
                handleInputChange(index, "notes", e.target.value)
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`paymentType-${index}`}
            >
              Payment Type
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`paymentType-${index}`}
              type="text"
              value={form.paymentType}
              onChange={(e) =>
                handleInputChange(index, "paymentType", e.target.value)
              }
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor={`price-${index}`}
            >
              Price
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id={`price-${index}`}
              type="number"
              value={form.price}
              onChange={(e) =>
                handleInputChange(index, "price", e.target.value)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>
      ))}
    </div>
  );
};

export default TemporaryNotes;
