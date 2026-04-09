"use client";

import { useState, useEffect, useRef } from "react";
import {
  loadScheduleData,
  toggleWorkingDay,
  updateWorkDayBookingCutoffHours,
  addAppointmentTime,
  updateAppointmentTime,
  deleteAppointmentTime,
} from "@/app/_actions";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];

export default function WeeklyScheduleEditor({
  locationId = "ea5fbe60-7d3c-44ff-9307-b97ea3bc10f9",
  initialScheduleLocationId = null,
  initialScheduleData = null,
}) {
  const hydrateScheduleData = (rows = []) => {
    const scheduleData = {};
    const timesData = {};

    rows.forEach((day) => {
      const dayId = day.day_of_week;
      scheduleData[dayId] = {
        id: day.id,
        isWorking: day.is_working,
        dayName: day.day_name,
        bookingCutoffHours:
          day.booking_cutoff_hours === null ||
          day.booking_cutoff_hours === undefined
            ? 0
            : Number(day.booking_cutoff_hours),
      };

      if (day.appointment_times && day.appointment_times.length > 0) {
        timesData[day.id] = day.appointment_times.map((time) => ({
          id: time.id,
          startTime: time.start_time,
          endTime: time.end_time,
        }));
      }
    });

    return { scheduleData, timesData };
  };

  const initialHydrated =
    initialScheduleData && initialScheduleLocationId === locationId
      ? hydrateScheduleData(initialScheduleData)
      : { scheduleData: {}, timesData: {} };

  const [schedule, setSchedule] = useState(initialHydrated.scheduleData);
  const [appointmentTimes, setAppointmentTimes] = useState(initialHydrated.timesData);
  const [editingTimes, setEditingTimes] = useState({});
  const [loading, setLoading] = useState(
    !(initialScheduleData && initialScheduleLocationId === locationId)
  );
  const [dirtyCutoffDayIds, setDirtyCutoffDayIds] = useState({});
  const [isSavingCutoffs, setIsSavingCutoffs] = useState(false);
  const [cutoffSaveStatus, setCutoffSaveStatus] = useState(null);
  const skipInitialClientFetchRef = useRef(
    Boolean(initialScheduleData && initialScheduleLocationId === locationId)
  );

  useEffect(() => {
    if (
      skipInitialClientFetchRef.current &&
      initialScheduleLocationId === locationId
    ) {
      skipInitialClientFetchRef.current = false;
      return;
    }
    loadData();
  }, [locationId, initialScheduleLocationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await loadScheduleData(locationId);

      if (result.success) {
        const { scheduleData, timesData } = hydrateScheduleData(result.data);

        setSchedule(scheduleData);
        setAppointmentTimes(timesData);
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkingDay = async (dayOfWeek) => {
    const currentDay = schedule[dayOfWeek];
    const newIsWorking = !currentDay.isWorking;

    const result = await toggleWorkingDay(currentDay.id, newIsWorking);

    if (result.success) {
      setSchedule((prev) => ({
        ...prev,
        [dayOfWeek]: { ...prev[dayOfWeek], isWorking: newIsWorking },
      }));
    }
  };

  const handleAddAppointmentTime = async (dayOfWeek) => {
    const workDayId = schedule[dayOfWeek].id;

    const result = await addAppointmentTime(workDayId, "09:00", "10:00");

    if (result.success) {
      setAppointmentTimes((prev) => ({
        ...prev,
        [workDayId]: [...(prev[workDayId] || []), result.data],
      }));
    }
  };

  const normalizeCutoffHours = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const handleUpdateBookingCutoffHours = async (dayOfWeek, value) => {
    const dayData = schedule[dayOfWeek];
    if (!dayData?.id) return;

    setSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        bookingCutoffHours: value,
      },
    }));
    setDirtyCutoffDayIds((prev) => ({ ...prev, [dayData.id]: true }));
    setCutoffSaveStatus(null);
  };

  const handleSaveCutoffChanges = async () => {
    const dirtyEntries = Object.entries(schedule).filter(([, dayData]) => {
      return dayData?.id && dirtyCutoffDayIds[dayData.id];
    });

    if (dirtyEntries.length === 0) {
      setCutoffSaveStatus({ type: "info", text: "No changes to save." });
      return;
    }

    setIsSavingCutoffs(true);
    setCutoffSaveStatus(null);

    let failed = 0;
    for (const [, dayData] of dirtyEntries) {
      const safeValue = normalizeCutoffHours(dayData.bookingCutoffHours);
      const result = await updateWorkDayBookingCutoffHours(dayData.id, safeValue);
      if (!result.success) {
        failed++;
        continue;
      }

      setSchedule((prev) => {
        const updated = { ...prev };
        const dayKey = Object.keys(updated).find(
          (key) => updated[key]?.id === dayData.id,
        );
        if (dayKey) {
          updated[dayKey] = {
            ...updated[dayKey],
            bookingCutoffHours: safeValue,
          };
        }
        return updated;
      });
    }

    if (failed > 0) {
      setCutoffSaveStatus({
        type: "error",
        text: `Saved with ${failed} error(s). Please try again.`,
      });
    } else {
      setCutoffSaveStatus({ type: "success", text: "Changes saved." });
      setDirtyCutoffDayIds({});
    }

    setIsSavingCutoffs(false);
  };

  const handleUpdateAppointmentTime = async (timeId, field, value) => {
    const result = await updateAppointmentTime(timeId, field, value);

    if (result.success) {
      setAppointmentTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((workDayId) => {
          updated[workDayId] = updated[workDayId].map((time) =>
            time.id === timeId ? { ...time, [field]: value } : time
          );
        });
        return updated;
      });
    }
  };

  const handleDeleteAppointmentTime = async (timeId) => {
    const result = await deleteAppointmentTime(timeId);

    if (result.success) {
      setAppointmentTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((workDayId) => {
          updated[workDayId] = updated[workDayId].filter(
            (time) => time.id !== timeId
          );
        });
        return updated;
      });
    }
  };

  const handleTimeInputChange = (timeId, field, value) => {
    setEditingTimes((prev) => ({
      ...prev,
      [timeId]: {
        ...prev[timeId],
        [field]: value,
      },
    }));
  };

  const handleSaveAppointmentTime = async (timeId) => {
    const editedTime = editingTimes[timeId];
    if (!editedTime) return;

    const result = await updateAppointmentTime(
      timeId,
      editedTime.startTime,
      editedTime.endTime
    );

    if (result.success) {
      // Update the main appointment times state
      setAppointmentTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((workDayId) => {
          updated[workDayId] = updated[workDayId].map((time) =>
            time.id === timeId
              ? {
                  ...time,
                  startTime: editedTime.startTime,
                  endTime: editedTime.endTime,
                }
              : time
          );
        });
        return updated;
      });

      // Clear the editing state for this time
      setEditingTimes((prev) => {
        const updated = { ...prev };
        delete updated[timeId];
        return updated;
      });
    }
  };

  const handleCancelEdit = (timeId) => {
    setEditingTimes((prev) => {
      const updated = { ...prev };
      delete updated[timeId];
      return updated;
    });
  };

  const getCurrentTimeValue = (time, field) => {
    return editingTimes[time.id]?.[field] ?? time[field] ?? "";
  };

  const isEditing = (timeId) => {
    return editingTimes[timeId] !== undefined;
  };

  if (loading) {
    return <div style={{ padding: "16px", color: "#1f2a1f" }}>Loading schedule...</div>;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        border: "1px solid #b7c7b0",
        borderRadius: "12px",
        backgroundColor: "#f4f7f2",
      }}
    >
      <div
        style={{
          padding: "24px",
          borderBottom: "1px solid #b7c7b0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
          Weekly Schedule
        </h2>
        <button
          onClick={handleSaveCutoffChanges}
          disabled={isSavingCutoffs}
          className="px-3.5 py-2 bg-[#c2d5bf] text-[#1a2b1a] border border-[#93ad90] rounded-md hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSavingCutoffs ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div style={{ padding: "24px" }}>
        {cutoffSaveStatus && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 10px",
              borderRadius: "6px",
              fontSize: "13px",
              border:
                cutoffSaveStatus.type === "success"
                  ? "1px solid #86efac"
                  : cutoffSaveStatus.type === "error"
                    ? "1px solid #fca5a5"
                    : "1px solid #b7c7b0",
              backgroundColor:
                cutoffSaveStatus.type === "success"
                  ? "#f0fdf4"
                  : cutoffSaveStatus.type === "error"
                    ? "#fef2f2"
                    : "#f4f7f2",
              color:
                cutoffSaveStatus.type === "success"
                  ? "#166534"
                  : cutoffSaveStatus.type === "error"
                    ? "#991b1b"
                    : "#374151",
            }}
          >
            {cutoffSaveStatus.text}
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.2fr 2fr",
            gap: "16px",
            fontWeight: "600",
            fontSize: "14px",
            color: "#6b7280",
            borderBottom: "1px solid #b7c7b0",
            paddingBottom: "8px",
            marginBottom: "16px",
          }}
        >
          <div>Day</div>
          <div>Working</div>
          <div>Hours Before Booking</div>
          <div>Appointment Times</div>
        </div>

        {/* Schedule Rows */}
        {DAYS_OF_WEEK.map((day) => {
          const dayData = schedule[day.id];
          const times = appointmentTimes[dayData?.id] || [];

          // console.log(`[v0] Rendering ${day.name} (id: ${day.id}):`, dayData)

          return (
            <div
              key={day.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1.2fr 2fr",
                gap: "16px",
                alignItems: "start",
                padding: "12px 0",
                borderBottom: "1px solid #d6e0d1",
              }}
            >
              {/* Day Name */}
              <div
                style={{
                  fontWeight: "500",
                  color: "#111827",
                  paddingTop: "8px",
                }}
              >
                {day.name}
              </div>

              {/* Working Checkbox */}
              <div style={{ paddingTop: "8px" }}>
                <input
                  type="checkbox"
                  checked={dayData?.isWorking || false}
                  onChange={() => handleToggleWorkingDay(day.id)}
                  style={{ width: "16px", height: "16px" }}
                />
              </div>

              {/* Booking cutoff hours */}
              <div style={{ paddingTop: "4px" }}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={dayData?.bookingCutoffHours ?? 0}
                  onChange={(e) => handleUpdateBookingCutoffHours(day.id, e.target.value)}
                  style={{
                    width: "110px",
                    padding: "4px 6px",
                    border: "1px solid #b7c7b0",
                    borderRadius: "4px",
                    backgroundColor: "#f4f7f2",
                  }}
                />
              </div>

              {/* Appointment Times */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {dayData?.isWorking &&
                  times.map((time) => (
                    <div
                      key={time.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="time"
                        value={getCurrentTimeValue(time, "startTime")}
                        onChange={(e) =>
                          handleTimeInputChange(
                            time.id,
                            "startTime",
                            e.target.value
                          )
                        }
                        style={{
                          width: "96px",
                          padding: "4px",
                          border: "1px solid #b7c7b0",
                          borderRadius: "4px",
                          backgroundColor: "#f4f7f2",
                        }}
                      />
                      <span style={{ color: "#6b7280" }}>-</span>
                      <input
                        type="time"
                        value={getCurrentTimeValue(time, "endTime")}
                        onChange={(e) =>
                          handleTimeInputChange(
                            time.id,
                            "endTime",
                            e.target.value
                          )
                        }
                        style={{
                          width: "96px",
                          padding: "4px",
                          border: "1px solid #b7c7b0",
                          borderRadius: "4px",
                          backgroundColor: "#f4f7f2",
                        }}
                      />

                      {isEditing(time.id) ? (
                        <>
                          <button
                            onClick={() => handleSaveAppointmentTime(time.id)}
                            className="px-2 py-1 bg-[#c2d5bf] text-[#1a2b1a] border border-[#93ad90] rounded text-xs hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleCancelEdit(time.id)}
                            className="px-2 py-1 bg-[#c2d5bf] text-[#1a2b1a] border border-[#93ad90] rounded text-xs hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}

                      <button
                        onClick={() => handleDeleteAppointmentTime(time.id)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                {dayData?.isWorking && (
                  <button
                    onClick={() => handleAddAppointmentTime(day.id)}
                    className="self-start px-3 py-1.5 bg-[#c2d5bf] text-[#1a2b1a] border border-[#93ad90] rounded text-sm hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors"
                  >
                    + Add Time
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
