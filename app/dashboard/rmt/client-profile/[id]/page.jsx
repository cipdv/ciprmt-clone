import { getClientProfile, getClientHealthHistory } from "@/app/_actions";
import BookAppointment from "@/components/rmt/BookAppointment";
import ClientHealthHistory from "@/components/rmt/ClientHealthHistory";

export default async function ClientProfile({ params }) {
  try {
    const client = await getClientProfile(params.id);
    const healthHistory = await getClientHealthHistory(params.id);

    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Client Profile</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-lg mb-2">
              {client.firstName} {client.lastName}
            </p>
            <p className="text-gray-600 mb-1">Email: {client.email}</p>
            <p className="text-gray-600">Phone: {client.phoneNumber}</p>
          </div>
          <BookAppointment clientId={params.id} />
          <ClientHealthHistory healthHistory={healthHistory} />
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }
}
