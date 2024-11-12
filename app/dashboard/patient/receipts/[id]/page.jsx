import { Suspense } from "react";
import { getReceiptById, getSession } from "@/app/_actions";
import { notFound, redirect } from "next/navigation";
import ReceiptDownloadButton from "@/components/patients/ReceiptDownloadButton";
import LoadingSpinner from "@/components/LoadingSpinner";

async function getUserDetails() {
  const currentUser = await getSession();
  if (!currentUser) {
    redirect("/sign-in");
  }
  return currentUser.resultObj;
}

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };
  return date.toLocaleDateString("en-US", options);
};

const formatPrice = (price) => {
  if (typeof price === "number") {
    return price.toFixed(2);
  }
  return price || "N/A";
};

const formatTime = (timeString) => {
  if (!timeString) return "N/A";

  const [hours, minutes] = timeString.split(":");
  const date = new Date(2000, 0, 1, hours, minutes); // Year, month, and day are arbitrary
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

async function ReceiptDetails({ params }) {
  const user = await getUserDetails();
  const receipt = await getReceiptById(params.id);

  if (!receipt) {
    notFound();
  }

  const isAppointment = receipt.type === "appointment";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl mb-6">Receipt Details</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Date:</p>
            <p className="font-semibold">
              {formatDate(
                isAppointment ? receipt.appointmentDate : receipt.date
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Time:</p>
            <p className="font-semibold">
              {formatTime(
                isAppointment ? receipt.appointmentBeginsAt : receipt.time
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Duration:</p>
            <p className="font-semibold">
              {receipt.duration ? `${receipt.duration} minutes` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Price:</p>
            <p className="font-semibold">${formatPrice(receipt.price)}</p>
          </div>
          {!isAppointment && (
            <div>
              <p className="text-gray-600">Payment Type:</p>
              <p className="font-semibold">{receipt.paymentType || "N/A"}</p>
            </div>
          )}
        </div>
        <div className="mt-6">
          <ReceiptDownloadButton receipt={receipt} user={user} />
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage({ params }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ReceiptDetails params={params} />
    </Suspense>
  );
}
