"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { purchaseGiftCard } from "@/app/_actions";
import Image from "next/image";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

function GiftCardPurchaseForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    purchaserFirstName: "",
    recipientName: "",
    message: "",
    duration: "60",
  });

  const basePrices = {
    60: 115,
    75: 135,
    90: 155,
  };

  const calculatePricing = (duration) => {
    const base = basePrices[duration];
    const hst = Math.round(base * 0.13 * 100) / 100;
    const total = Math.round((base + hst) * 100) / 100;
    return { base, hst, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      const pricing = calculatePricing(formData.duration);

      const result = await purchaseGiftCard({
        email: formData.email,
        purchaserFirstName: formData.purchaserFirstName,
        recipientName: formData.recipientName || null,
        message: formData.message || null,
        duration: Number.parseInt(formData.duration),
        price: pricing.total,
        paymentMethodId: paymentMethod.id,
      });

      if (!result.success) {
        throw new Error(result.message || "Payment failed");
      }

      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.clientSecret
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      setSuccess(true);
      setFormData({
        email: "",
        purchaserFirstName: "",
        recipientName: "",
        message: "",
        duration: "60",
      });
      cardElement.clear();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: "#d5e1d0" }}
      >
        <div
          className="w-full max-w-md p-8 rounded-lg"
          style={{ backgroundColor: "#8faf83" }}
        >
          <div className="space-y-4 mb-6">
            <h2
              className="text-2xl font-semibold text-center"
              style={{ color: "#251a0e" }}
            >
              Purchase Successful!
            </h2>
            <p className="text-center" style={{ color: "#251a0e" }}>
              Your gift card has been sent to your email
            </p>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded" style={{ backgroundColor: "white" }}>
              <p style={{ color: "#251a0e" }}>
                Check your inbox for the gift card PDF. You can print it or
                forward it to the recipient.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-2 px-4 text-white rounded transition-colors"
              style={{ backgroundColor: "#423c36" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#635f5b")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#423c36")}
            >
              Purchase Another Gift Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPricing = calculatePricing(formData.duration);

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: "#d5e1d0" }}>
      <div className="w-full max-w-2xl mx-auto py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#251a0e" }}>
            Purchase a Gift Card
          </h1>
          <p style={{ color: "#5a784f" }}>
            Give the gift of relaxation with a massage gift card from Cip de
            Vries, RMT
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: "#251a0e" }}>
              Personal Information
            </h2>
            <div className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5a784f" }}
                >
                  Your Email Address <span style={{ color: "#e65151" }}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded border border-gray-300"
                  style={{ backgroundColor: "white", color: "#251a0e" }}
                />
              </div>

              {/* Purchaser First Name */}
              <div>
                <label
                  htmlFor="purchaserFirstName"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5a784f" }}
                >
                  Your First Name <span style={{ color: "#e65151" }}>*</span>
                </label>
                <input
                  id="purchaserFirstName"
                  type="text"
                  required
                  value={formData.purchaserFirstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchaserFirstName: e.target.value,
                    })
                  }
                  placeholder="First Name"
                  className="w-full px-4 py-2 rounded border border-gray-300"
                  style={{ backgroundColor: "white", color: "#251a0e" }}
                />
              </div>
            </div>
          </div>

          {/* Massage Selection Section */}
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: "#251a0e" }}>
              Massage Duration
            </h2>
            <div className="space-y-3">
              {[
                { value: "60", label: "60 Minutes" },
                { value: "75", label: "75 Minutes" },
                { value: "90", label: "90 Minutes" },
              ].map((option) => {
                const pricing = calculatePricing(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center p-4 rounded border-2 cursor-pointer transition-colors"
                    style={{
                      borderColor:
                        formData.duration === option.value ? "#5a784f" : "#ccc",
                      backgroundColor:
                        formData.duration === option.value
                          ? "#8faf83"
                          : "white",
                    }}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={option.value}
                      checked={formData.duration === option.value}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      className="mr-3"
                    />
                    <span
                      className="flex-1 font-medium"
                      style={{ color: "#251a0e" }}
                    >
                      {option.label}
                    </span>
                    <span className="font-bold" style={{ color: "#251a0e" }}>
                      ${pricing.total.toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Recipient Information Section */}
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: "#251a0e" }}>
              Recipient Information
            </h2>
            <div className="space-y-5">
              {/* Recipient Name */}
              <div>
                <label
                  htmlFor="recipientName"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5a784f" }}
                >
                  Recipient Name{" "}
                  <span style={{ color: "#999" }}>(Optional)</span>
                </label>
                <input
                  id="recipientName"
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) =>
                    setFormData({ ...formData, recipientName: e.target.value })
                  }
                  placeholder="Recipient Name"
                  className="w-full px-4 py-2 rounded border border-gray-300"
                  style={{ backgroundColor: "white", color: "#251a0e" }}
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5a784f" }}
                >
                  Would you like to include a personal message for your gift
                  card? <span style={{ color: "#999" }}>(Optional)</span>
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Let this person know why you're giving them this gift"
                  rows={4}
                  className="w-full px-4 py-2 rounded border border-gray-300"
                  style={{ backgroundColor: "white", color: "#251a0e" }}
                />
              </div>
            </div>
          </div>

          {/* Payment Information Section */}
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: "#251a0e" }}>
              Payment Information
            </h2>
            <div className="space-y-5">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#5a784f" }}
                >
                  Credit or Debit Card{" "}
                  <span style={{ color: "#e65151" }}>*</span>
                </label>
                <div className="mb-3 space-y-3">
                  <div
                    className="flex items-center gap-3 text-sm"
                    style={{ color: "#5a784f" }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>
                      Your card information is encrypted, secure, and never
                      stored.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "#5a784f" }}
                    >
                      <span>Powered by Stripe</span>
                      <Image
                        src="/images/stripe-logo.png"
                        alt="Stripe"
                        width={40}
                        height={16}
                        className="inline-block"
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Image
                        src="/images/visa-logo.svg"
                        alt="Visa"
                        width={35}
                        height={12}
                      />
                      <Image
                        src="/images/Mastercard-logo.png"
                        alt="Mastercard"
                        width={30}
                        height={20}
                      />
                      <Image
                        src="/images/interac-logo.png"
                        alt="Interac"
                        width={35}
                        height={12}
                      />
                    </div>
                  </div>
                </div>
                <div
                  className="p-4 rounded border border-gray-300"
                  style={{ backgroundColor: "white" }}
                >
                  <CardElement
                    options={{
                      hidePostalCode: true,
                      style: {
                        base: {
                          fontSize: "16px",
                          color: "#251a0e",
                          "::placeholder": {
                            color: "#aab7c4",
                          },
                        },
                        invalid: {
                          color: "#e65151",
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className="p-4 rounded"
              style={{ backgroundColor: "white", border: "1px solid #ccc" }}
            >
              <div className="space-y-2">
                <div
                  className="flex justify-between text-sm"
                  style={{ color: "#5a784f" }}
                >
                  <span>Price:</span>
                  <span>${currentPricing.base.toFixed(2)}</span>
                </div>
                <div
                  className="flex justify-between text-sm"
                  style={{ color: "#5a784f" }}
                >
                  <span>HST (13%):</span>
                  <span>${currentPricing.hst.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2" style={{ borderColor: "#ccc" }}>
                  <div className="flex justify-between items-center">
                    <span
                      className="text-lg font-bold"
                      style={{ color: "#251a0e" }}
                    >
                      Total:
                    </span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: "#251a0e" }}
                    >
                      ${currentPricing.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-4 rounded border-l-4"
              style={{
                backgroundColor: "#ffe6e6",
                borderColor: "#e65151",
                color: "#e65151",
              }}
            >
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !stripe}
            className="btn w-full py-3 px-6 text-white font-medium rounded text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#423c36" }}
            onMouseEnter={(e) =>
              !loading && stripe && (e.target.style.backgroundColor = "#635f5b")
            }
            onMouseLeave={(e) =>
              !loading && stripe && (e.target.style.backgroundColor = "#423c36")
            }
          >
            {loading ? "Processing..." : "Purchase Gift Card"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GiftCardPurchasePage() {
  return (
    <Elements stripe={stripePromise}>
      <GiftCardPurchaseForm />
    </Elements>
  );
}
