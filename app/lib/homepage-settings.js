import "server-only";

import { unstable_cache } from "next/cache";
import { sql } from "@vercel/postgres";

function formatTimeLabel(timeValue) {
  if (!timeValue) return "";
  const [hoursRaw, minutesRaw] = String(timeValue).split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw || "0", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return String(timeValue);
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")}${suffix}`;
}

function buildAddressLine(location) {
  const parts = [
    location?.streetAddress,
    location?.city,
    location?.province,
    location?.postalCode,
  ].filter(Boolean);
  return parts.join(", ");
}

function buildMapEmbedSrc(address) {
  if (!address) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(
    address
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function sortServices(services) {
  return [...services].sort((a, b) => {
    if (a.duration !== b.duration) return a.duration - b.duration;
    return a.service.localeCompare(b.service);
  });
}

const dayOrder = [1, 2, 3, 4, 5, 6, 7];
const dayNamesByOrder = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

function normalizeDayOfWeek(value, dayName = "") {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed)) {
    // Support both DB conventions:
    // - 1..7 where Sunday is 7
    // - 0..6 where Sunday is 0
    if (parsed === 0) return 7;
    if (parsed >= 1 && parsed <= 7) return parsed;
  }

  const normalizedName = String(dayName || "").trim().toLowerCase();
  switch (normalizedName) {
    case "monday":
      return 1;
    case "tuesday":
      return 2;
    case "wednesday":
      return 3;
    case "thursday":
      return 4;
    case "friday":
      return 5;
    case "saturday":
      return 6;
    case "sunday":
      return 7;
    default:
      return null;
  }
}

function formatHoursSummary(scheduleRows) {
  const rowsByDay = new Map();
  scheduleRows.forEach((row) => {
    const day = normalizeDayOfWeek(row.day_of_week, row.day_name);
    if (!day) return;
    if (!rowsByDay.has(day)) rowsByDay.set(day, []);
    rowsByDay.get(day).push(row);
  });

  const lines = [];
  dayOrder.forEach((day) => {
    const rows = rowsByDay.get(day) || [];
    const workingRows = rows.filter((r) => r.is_working);
    if (workingRows.length === 0) return;

    const validRows = workingRows.filter((r) => r.start_time && r.end_time);
    if (validRows.length === 0) {
      lines.push(`${dayNamesByOrder[day]}: Hours vary`);
      return;
    }

    const sortedByStart = [...validRows].sort((a, b) =>
      String(a.start_time).localeCompare(String(b.start_time))
    );
    const sortedByEnd = [...validRows].sort((a, b) =>
      String(a.end_time).localeCompare(String(b.end_time))
    );

    const dayStart = formatTimeLabel(sortedByStart[0].start_time);
    const dayEnd = formatTimeLabel(sortedByEnd[sortedByEnd.length - 1].end_time);
    lines.push(`${dayNamesByOrder[day]}: ${dayStart} - ${dayEnd}`);
  });

  return lines;
}

const fetchHomepageSettingsCached = unstable_cache(
  async () => {
    const { rows: locationRows } = await sql`
      SELECT
        rl.id,
        rl.user_id,
        rl.location_name,
        rl.street_address,
        rl.city,
        rl.province,
        rl.postal_code,
        rl.phone,
        rl.email,
        rl.description,
        rl.url,
        url.is_primary
      FROM rmt_locations rl
      LEFT JOIN user_rmt_locations url ON url.rmt_location_id = rl.id
      ORDER BY COALESCE(url.is_primary, false) DESC, rl.created_at ASC
      LIMIT 1
    `;

    if (locationRows.length === 0) {
      return {
        success: false,
        data: null,
      };
    }

    const location = locationRows[0];

    const [{ rows: serviceRows }, { rows: scheduleRows }, { rows: userRows }] =
      await Promise.all([
        sql`
          SELECT service, duration, price, plus_hst
          FROM massage_services
          WHERE rmt_location_id = ${location.id}
          ORDER BY duration ASC, service ASC
        `,
        sql`
          SELECT
            wd.day_of_week,
            wd.day_name,
            wd.is_working,
            at.start_time,
            at.end_time
          FROM work_days2 wd
          LEFT JOIN appointment_times2 at ON at.work_day_id = wd.id
          WHERE wd.location_id = ${location.id}
          ORDER BY wd.day_of_week ASC, at.start_time ASC
        `,
        sql`
          SELECT email, phone_number
          FROM users
          WHERE id = ${location.user_id}
          LIMIT 1
        `,
      ]);

    const formattedLocation = {
      id: location.id,
      locationName: location.location_name || "",
      streetAddress: location.street_address || "",
      city: location.city || "",
      province: location.province || "",
      postalCode: location.postal_code || "",
      description: location.description || "",
      websiteUrl: location.url || "",
      email: location.email || userRows?.[0]?.email || "",
      phone: location.phone || userRows?.[0]?.phone_number || "",
    };

    const addressLine = buildAddressLine(formattedLocation);

    return {
      success: true,
      data: {
        location: formattedLocation,
        services: sortServices(
          (serviceRows || []).map((service) => ({
            service: service.service || "",
            duration: Number(service.duration || 0),
            price: Number(service.price || 0),
            plusHst: Boolean(service.plus_hst),
          }))
        ),
        scheduleLines: formatHoursSummary(scheduleRows || []),
        mapEmbedSrc: buildMapEmbedSrc(addressLine),
        addressLine,
      },
    };
  },
  ["homepage-settings-v1"],
  {
    revalidate: 300,
  }
);

export async function getHomepageSettings() {
  try {
    return await fetchHomepageSettingsCached();
  } catch (error) {
    console.error("Error loading homepage settings:", error);
    return { success: false, data: null };
  }
}
