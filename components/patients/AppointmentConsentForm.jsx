"use client";

import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import Link from "next/link";
import { submitConsentForm } from "@/app/_actions";
import { useRouter } from "next/navigation";

export default function ConsentForm({ id }) {
  const [formData, setFormData] = useState({
    consentAreas: {
      glutes: false,
      abdomen: false,
      upperInnerThighs: false,
      chest: false,
    },
    reasonForMassage: "",
    areasToAvoid: "",
    additionalInfo: "",
  });
  const [signature, setSignature] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signatureRef = useRef(null);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConsentChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      consentAreas: { ...prev.consentAreas, [name]: checked },
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.reasonForMassage) {
      newErrors.reasonForMassage = "This field is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!signature) {
      setErrors((prev) => ({
        ...prev,
        signature: "Please provide a signature",
      }));
      return;
    }

    setIsSubmitting(true);

    const submitData = {
      ...formData,
      signature,
      id,
    };

    try {
      const result = await submitConsentForm(submitData);
      if (result.success) {
        // Scroll to the top of the page
        window.scrollTo(0, 0);
        // Refresh the page data
        router.refresh();
      } else {
        throw new Error(result.error || "Failed to submit form");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to submit form. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignature(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className=" p-6 bg-authForms rounded-lg shadow-md space-y-5"
    >
      <h2 className="text-2xl font-bold mb-6">Massage Consent Form</h2>

      <div className="mb-6">
        <label
          htmlFor="reasonForMassage"
          className="block text-sm font-medium mb-2"
        >
          What is your reason for booking this massage?
        </label>
        <input
          type="text"
          id="reasonForMassage"
          name="reasonForMassage"
          value={formData.reasonForMassage}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        />
        {errors.reasonForMassage && (
          <p className="mt-1 text-sm text-red-600">{errors.reasonForMassage}</p>
        )}
      </div>

      <div className="mb-6">
        <label
          htmlFor="additionalInfo"
          className="block text-sm font-medium mb-2"
        >
          Is there any other information you want me to know?
        </label>
        <textarea
          id="additionalInfo"
          name="additionalInfo"
          value={formData.additionalInfo}
          onChange={handleInputChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        />
      </div>
      <div className="space-y-5 text-sm">
        <h3 className="text-lg font-semibold mb-2">Areas of Special Consent</h3>
        <p>
          Your comfort and safety during your massage are my top priority. There
          are areas in the body that most people would consider to be sensitive,
          and RMTs are required to get written consent to assess and treat these
          areas before every treatment. Consenting through this form to assess
          and massage the following areas during this appointment does not
          preclude you from revoking your consent before or during the massage.
          Please feel welcome to express this at any time during the massage.
          Your comfort is essential to a successful massage therapy session.{" "}
        </p>
        <p>
          <Link target="_blank" href="/dashboard/patient/special-consent">
            Click here
          </Link>{" "}
          to learn more about these areas, what assessment/treatment entails,
          and why this information is being asked.
        </p>
      </div>
      <div className="mb-6">
        <p className="text-sm font-semibold mb-4">
          Please check the boxes for areas you consent to be massaged:
        </p>
        <div className="space-y-2 text-sm">
          {Object.keys(formData.consentAreas).map((area) => (
            <div key={area} className="flex items-center">
              <input
                type="checkbox"
                id={area}
                name={area}
                checked={formData.consentAreas[area]}
                onChange={handleConsentChange}
                className="form-checkbox h-5 w-5 checked:bg-gray-600"
              />
              <label htmlFor={area} className="ml-2 capitalize">
                {area.replace(/([A-Z])/g, " $1").trim()}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-6">
        <label
          htmlFor="areasToAvoid"
          className="block text-sm font-medium mb-2"
        >
          Are there any other areas you do not want to have massaged during this
          session?
        </label>
        <input
          type="text"
          id="areasToAvoid"
          name="areasToAvoid"
          value={formData.areasToAvoid}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-6 space-y-5">
        <label className="block text-lg font-semibold">Signature</label>
        <p className="space-y-5 text-sm">
          By signing here, you acknowledge that you have read and understand the
          information regarding consent and give your informed consent at this
          time for the assessment and/or treatment of the areas selected above.
        </p>
        <SignatureCanvas
          ref={signatureRef}
          onEnd={() => setSignature(signatureRef.current?.toDataURL() || null)}
          penColor="black"
          canvasProps={{
            className: "border rounded-md w-full h-20 bg-white",
            style: { backgroundColor: "white" },
          }}
        />
        {errors.signature && (
          <p className="mt-1 text-sm text-red-600">{errors.signature}</p>
        )}
        <button
          type="button"
          onClick={clearSignature}
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Signature
        </button>
      </div>

      {errors.submit && (
        <p className="mt-1 text-sm text-red-600">{errors.submit}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-buttons text-white py-2 px-4 rounded-md hover:bg-buttonsHover focus:outline-none focus:ring-2 focus:ring-buttons focus:ring-opacity-50 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Consent Form"}
      </button>
    </form>
  );
}
