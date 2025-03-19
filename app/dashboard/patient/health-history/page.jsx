import { Suspense } from "react";
import HealthHistoryForm from "@/components/patients/HealthHistoryForm";
import { getSession, getClientHealthHistories } from "@/app/_actions";
import { redirect } from "next/navigation";

async function getUserDetails() {
  const currentUser = await getSession();
  if (!currentUser) {
    redirect("/sign-in");
  }
  return currentUser.resultObj;
}

async function getHealthHistory(userId) {
  try {
    const histories = await getClientHealthHistories(userId);
    return histories.length > 0 ? histories[0] : null;
  } catch (error) {
    console.error("Error fetching health history:", error);
    return null;
  }
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  );
}

export default async function HealthHistoryPage() {
  const user = await getUserDetails();
  // Use user.id instead of user._id for PostgreSQL
  const healthHistory = await getHealthHistory(user.id);

  return (
    <section className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingFallback />}>
        <HealthHistoryForm user={user} initialHealthHistory={healthHistory} />
      </Suspense>
    </section>
  );
}
