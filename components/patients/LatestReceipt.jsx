import React from "react";
import { getSession, getReceipts } from "@/app/_actions";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";

// Dynamically import the PDFDownloadButton to exclude it from SSR
const ReceiptDownloadButton = dynamic(() => import("./ReceiptDownloadButton"), {
  ssr: false, // This will make sure the component is only rendered on the client-side
});

const LatestReceipt = async () => {
  const currentUser = await getSession();

  //   61fc079ee6e61eab24e86b07
  const allReceipts = await getReceipts(currentUser.resultObj._id);
  let latestReceipt = null;
  const currentDate = new Date();

  for (let i = allReceipts.length - 1; i >= 0; i--) {
    const receiptDate = new Date(allReceipts[i].date);
    if (receiptDate < currentDate) {
      latestReceipt = allReceipts[i];
      break;
    }
  }

  if (!latestReceipt) {
    return <></>;
  }

  const receiptData = {
    date: latestReceipt.date,
    time: latestReceipt.time,
    duration: latestReceipt.duration,
    price: latestReceipt.price,
    firstName: latestReceipt.firstName,
    lastName: latestReceipt.lastName,
    id: latestReceipt._id.toString(),
  };

  return (
    <div>
      <Suspense
        fallback={
          <div className="flex justify-center h-screen text-2xl mt-20">
            Loading...
          </div>
        }
      >
        <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
          <div className="flex items-center space-x-8">
            <div className="flex-grow space-y-2">
              <div className="mb-4">
                <h1 className="text-3xl">
                  Here is the receipt from your previous massage appointment:
                </h1>
                {latestReceipt && (
                  <button className="btn mt-4">
                    <ReceiptDownloadButton receipt={receiptData} />
                  </button>
                )}
              </div>

              <div className="space-y-5">
                <p>
                  To access all of your receipts from previous appointments,{" "}
                  <Link href="/dashboard/patient/receipts">click here</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default LatestReceipt;
