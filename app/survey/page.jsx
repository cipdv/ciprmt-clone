"use client";
import React, { useState } from "react";
// TODO: Restore server action when available.

const SurveyPage = () => {
  const [formData, setFormData] = useState({
    reason: "",
    notEnjoyed: "",
    enjoyed: "",
    suggestions: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p className="text-center mt-8">
        Thank you for taking the time to submit this feedback.
      </p>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Survey</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-lg font-medium mb-2">
              1) Why have you decided you no longer wish to receive massage
              treatments from Cip?
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
          </div>
          <div>
            <label
              htmlFor="notEnjoyed"
              className="block text-lg font-medium mb-2"
            >
              2) What did you not enjoy about your massage therapy session(s)?
            </label>
            <textarea
              id="notEnjoyed"
              name="notEnjoyed"
              value={formData.notEnjoyed}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
          </div>
          <div>
            <label htmlFor="enjoyed" className="block text-lg font-medium mb-2">
              3) What did you enjoy about your massage therapy session(s)?
            </label>
            <textarea
              id="enjoyed"
              name="enjoyed"
              value={formData.enjoyed}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
          </div>
          <div>
            <label
              htmlFor="suggestions"
              className="block text-lg font-medium mb-2"
            >
              4) Do you have any suggestions for where I can improve?
            </label>
            <textarea
              id="suggestions"
              name="suggestions"
              value={formData.suggestions}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
          </div>
          <button
            type="submit"
            className="btn w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-800"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default SurveyPage;
