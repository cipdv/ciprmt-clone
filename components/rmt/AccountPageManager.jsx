"use client";

import { useMemo, useState } from "react";
import WorkScheduleDisplay from "@/components/WeeklyScheduleEditor";
import AccountSettings from "@/components/rmt/AccountSettings";

export default function AccountPageManager({
  initialData,
  initialScheduleLocationId,
  initialScheduleData,
}) {
  const locations = initialData?.locations || [];
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialScheduleLocationId || locations[0]?.id || ""
  );

  const selectedLocationLabel = useMemo(() => {
    const match = locations.find((location) => location.id === selectedLocationId);
    if (!match) return "";
    return match.locationName || match.streetAddress || match.id;
  }, [locations, selectedLocationId]);

  return (
    <div className="space-y-8">
      {locations.length > 0 ? (
        <div className="rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] p-6">
          <label className="block text-sm font-medium text-[#1f2a1f] mb-1">
            Selected location
          </label>
          <select
            value={selectedLocationId}
            onChange={(event) => setSelectedLocationId(event.target.value)}
            className="w-full md:w-96 rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b7c7b0] hover:bg-[#e8efe4] transition-colors"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.locationName || location.streetAddress || location.id}
              </option>
            ))}
          </select>
          {selectedLocationLabel ? (
            <p className="mt-2 text-xs text-gray-600">
              Editing settings for: <span className="font-medium">{selectedLocationLabel}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="pt-2">
        <WorkScheduleDisplay
          locationId={selectedLocationId || "ea5fbe60-7d3c-44ff-9307-b97ea3bc10f9"}
          initialScheduleLocationId={initialScheduleLocationId}
          initialScheduleData={initialScheduleData}
        />
      </div>

      <AccountSettings
        initialData={initialData}
        selectedLocationId={selectedLocationId}
      />
    </div>
  );
}
