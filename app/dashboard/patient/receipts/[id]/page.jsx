import { getReceiptById, getSession } from "@/app/_actions";
import { notFound, redirect } from "next/navigation";
import ReceiptDownloadButton from "@/components/patients/ReceiptDownloadButton";

async function getUserDetails() {
  const currentUser = await getSession();
  if (!currentUser) {
    redirect("/sign-in");
  }
  return currentUser.resultObj;
}

// Helper function to format date consistently
const formatDate = (dateString) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

// Helper function to format price
const formatPrice = (price) => {
  if (typeof price === "number") {
    return price.toFixed(2);
  }
  return price || "N/A";
};

export default async function ReceiptPage({ params }) {
  const user = await getUserDetails();

  const receipt = await getReceiptById(params.id);

  if (!receipt) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Receipt Details</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Date:</p>
            <p className="font-semibold">
              {formatDate(receipt.appointmentDate)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Time:</p>
            <p className="font-semibold">
              {receipt.appointmentBeginsAt || "N/A"}
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

          <div>
            <p className="text-gray-600">Receipt ID:</p>
            <p className="font-semibold">{receipt._id || "N/A"}</p>
          </div>
        </div>
        <div className="mt-6">
          <ReceiptDownloadButton receipt={receipt} user={user} />
        </div>
      </div>
    </div>
  );
}
