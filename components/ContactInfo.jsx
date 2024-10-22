"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { sendMessageToCip } from "@/app/_actions";

function SubmitButton({ isSubmitting }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center w-32"
    >
      {isSubmitting ? (
        <>
          <span>Sending</span>
          <div className="ml-2 animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        </>
      ) : (
        "Send"
      )}
    </button>
  );
}

const ContactInfo = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, formAction] = useFormState(sendMessageToCip, null);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const maxChars = 500;

  const handleInputChange = (e) => {
    const inputText = e.target.value;
    setCharCount(inputText.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await formAction(new FormData(e.target));
  };

  useEffect(() => {
    if (state && state.success === true) {
      router.push("/dashboard/patient");
    } else if (state && state.success === false) {
      setIsSubmitting(false);
      alert("There was an error sending your message. Please try again");
    }
  }, [state, router]);

  return (
    <div className="container mx-auto sm:px-4 md:px-20 lg:px-64 px-4 py-12 sm:py-16 md:py-20 lg:py-28">
      <div className="flex flex-col md:flex-row items-center md:space-x-8 space-y-8 md:space-y-0">
        <div className="w-full md:w-1/3 flex-shrink-0">
          <Image
            src="/images/cip-oct24.jpg"
            width={300}
            height={300}
            alt="Cip de Vries"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
        <div className="w-full md:w-2/3 space-y-4 md:space-y-6">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
              Cip de Vries, RMT
            </h1>
          </div>
          <div className="space-y-2">
            <p className="text-sm sm:text-base">
              <strong>Email:</strong> cipdevries@ciprmt.com
            </p>
            <p className="text-sm sm:text-base">
              <strong>Text & Phone:</strong> 416-258-1230
            </p>
          </div>
          <div className="mt-4">
            <form onSubmit={handleSubmit}>
              <h1 className="text-xl sm:text-xl md:text-xl font-semibold">
                Send a message to Cip:
              </h1>
              <textarea
                ref={textareaRef}
                name="message"
                className="w-full h-32 mt-4 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
                placeholder="Your message here..."
                maxLength={maxChars}
                onChange={handleInputChange}
              ></textarea>
              <p className="text-gray-500 text-xs mt-1">
                {charCount}/{maxChars} characters
              </p>
              <SubmitButton isSubmitting={isSubmitting} />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
