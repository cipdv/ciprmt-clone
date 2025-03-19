import { Suspense } from "react";
import Receipts from "@/components/patients/Receipts";
import { getSession, getReceipts } from "@/app/_actions";

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  );
}

async function ReceiptsContent() {
  const currentUser = await getSession();
  const user = currentUser.resultObj;
  const receipts = await getReceipts(user.id);
  return <Receipts user={user} receipts={receipts} />;
}

export default function ReceiptsPage() {
  return (
    <section className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingFallback />}>
        <ReceiptsContent />
      </Suspense>
    </section>
  );
}
