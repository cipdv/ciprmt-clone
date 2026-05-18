"use client";

import { useState } from "react";
import { createComplimentaryGiftCard } from "@/app/_actions";

export function GiftCardForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setResult(null);

    try {
      const formData = new FormData(form);
      const actionResult = await createComplimentaryGiftCard(formData);
      setResult(actionResult);

      if (actionResult.success) {
        form.reset();
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Unable to create gift card. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#b7c7b0] bg-[#f4f7f2] p-5 space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold text-[#1f2a1f]">
          Create Free Gift Card
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Generate a code for a prize, giveaway, or complimentary treatment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="recipientName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Recipient name <span className="text-sm text-gray-500">(optional)</span>
          </label>
          <input
            id="recipientName"
            name="recipientName"
            type="text"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b7c7b0]"
            placeholder="Prize winner, raffle, giveaway"
          />
        </div>

        <div>
          <label
            htmlFor="recipientEmail"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Recipient email <span className="text-sm text-gray-500">(optional)</span>
          </label>
          <input
            id="recipientEmail"
            name="recipientEmail"
            type="email"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b7c7b0]"
            placeholder="winner@example.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="duration"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Massage duration <span className="text-red-500">*</span>
        </label>
        <select
          id="duration"
          name="duration"
          required
          defaultValue="60"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b7c7b0]"
        >
          <option value="60">60 minutes</option>
          <option value="75">75 minutes</option>
          <option value="90">90 minutes</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Message <span className="text-sm text-gray-500">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows="3"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b7c7b0]"
          placeholder="Congratulations on winning this gift card."
        />
      </div>

      {result ? (
        <div
          className={`rounded-md border p-4 text-sm ${
            result.success
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-medium">{result.message}</p>
          {result.success && result.giftCard?.code ? (
            <div className="mt-3 rounded-md border border-green-200 bg-white p-3">
              <p className="text-xs uppercase text-green-700">Gift card code</p>
              <p className="mt-1 font-mono text-xl font-semibold tracking-wide">
                {result.giftCard.code}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 text-sm rounded-md font-medium text-[#1f2a1f] border border-[#b7c7b0] bg-white hover:bg-[#e8efe4] focus:outline-none focus:ring-2 focus:ring-[#b7c7b0] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Generating..." : "Generate Gift Card Code"}
      </button>
    </form>
  );
}
