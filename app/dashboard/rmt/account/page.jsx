import AccountPageManager from "@/components/rmt/AccountPageManager";
import { getRmtAccountSettings, loadScheduleData } from "@/app/_actions";

const DEFAULT_LOCATION_ID = "ea5fbe60-7d3c-44ff-9307-b97ea3bc10f9";

export default async function AccountPage() {
  const settingsResult = await getRmtAccountSettings();
  const settingsData = settingsResult.success
    ? settingsResult.data
    : { contact: { email: "", phoneNumber: "" }, locations: [] };
  const initialLocationId = settingsData.locations?.[0]?.id || DEFAULT_LOCATION_ID;
  const scheduleResult = await loadScheduleData(initialLocationId);
  const initialScheduleData = scheduleResult.success ? scheduleResult.data : [];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="border-b border-[#b7c7b0] pb-4">
          <h1 className="text-3xl font-bold text-foreground">
            Manage Settings
          </h1>
        </div>

        <AccountPageManager
          initialData={settingsData}
          initialScheduleLocationId={initialLocationId}
          initialScheduleData={initialScheduleData}
        />
      </div>
    </div>
  );
}
