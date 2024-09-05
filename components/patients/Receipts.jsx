import React from "react";
import Link from "next/link";

const Receipts = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
      <div className="flex items-center space-x-8">
        <div className="space-y-2 flex-grow">
          {" "}
          {/* Allow text container to grow as needed */}
          <div className="mb-4">
            <h1 className="text-3xl">
              Here is your receipt from your previous massage appointment:
            </h1>
          </div>
          <div className="space-y-5">
            <div>
              <Link href="/auth/sign-up">
                <button className="btn">Download Receipt</button>
              </Link>
            </div>
            <p>
              To access all of your receipts from previous appointments,{" "}
              <Link href="/dashboard/patient/receipts">click here</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipts;
