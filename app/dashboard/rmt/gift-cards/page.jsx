import { getRmtGiftCards } from "@/app/_actions";
import { GiftCardForm } from "./gift-card-form";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatStatus(giftCard) {
  if (giftCard.redeemed) return "Redeemed";
  if (giftCard.status === "booked") return "Booked";
  return "Available";
}

export default async function RmtGiftCardsPage() {
  const giftCardsResult = await getRmtGiftCards();
  const giftCards = giftCardsResult.success ? giftCardsResult.giftCards : [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Gift Cards</h1>
        <p className="text-sm text-gray-600">
          Create complimentary gift card codes and review recent gift cards.
        </p>
      </div>

      {!giftCardsResult.success ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {giftCardsResult.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
        <GiftCardForm />

        <section className="rounded-lg border border-[#b7c7b0] bg-white overflow-hidden">
          <div className="border-b border-[#b7c7b0] bg-[#f4f7f2] p-5">
            <h2 className="text-xl font-semibold text-[#1f2a1f]">
              Recent Gift Cards
            </h2>
          </div>

          {giftCards.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">
              No gift cards found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {giftCards.map((giftCard) => (
                    <tr key={giftCard.id}>
                      <td className="px-4 py-3 font-mono text-gray-900 whitespace-nowrap">
                        {giftCard.code}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {giftCard.recipient_name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {giftCard.duration} min
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        ${Number(giftCard.price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatStatus(giftCard)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatDate(giftCard.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
