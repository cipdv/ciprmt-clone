"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useFormState } from "react-dom";
import { sendMessageToCip } from "@/app/_actions";

const ContactInfo = () => {
  const [state, formAction] = useFormState(sendMessageToCip, null);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const maxChars = 500;

  const handleInputChange = (e) => {
    const inputText = e.target.value;
    setCharCount(inputText.length);
  };

  return (
    <div className="container mx-auto sm:px-4 md:px-20 lg:px-64 px-4 py-12 sm:py-16 md:py-20 lg:py-28">
      <div className="flex flex-col md:flex-row items-center md:space-x-8 space-y-8 md:space-y-0">
        <div className="w-full md:w-1/3 flex-shrink-0">
          <Image
            src="/images/cip-profile-pic.jpg"
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
            <form action={formAction}>
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
              <button
                type="submit"
                className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              >
                Send
              </button>
              {state && state.errors && (
                <p className="mt-2 text-red-500">{state.errors.message}</p>
              )}
              {state && state.message && (
                <p className="mt-2 text-green-500">{state.message}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
