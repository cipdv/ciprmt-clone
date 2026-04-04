"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRMTCalendarData,
  bookAppointmentForClient,
  clearAppointment,
  deleteAppointment,
  addAvailableAppointmentTimesForDate,
} from "@/app/_actions";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function dayKey(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
  }).format(d);
}

function formatDate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

function buildMonthGrid(anchorDate) {
  const firstDayOfMonth = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    1,
  );
  const lastDayOfMonth = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth() + 1,
    0,
  );
  const start = startOfWeek(firstDayOfMonth);
  const end = endOfWeek(lastDayOfMonth);
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function RMTCalendarClient() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState("month");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const [slotDate, setSlotDate] = useState("");
  const [slotTimeInput, setSlotTimeInput] = useState("");
  const [slotTimes, setSlotTimes] = useState([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalClientId, setModalClientId] = useState("");
  const [modalStartTime, setModalStartTime] = useState("");
  const [modalDuration, setModalDuration] = useState(60);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const range = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(anchorDate);
      const end = endOfWeek(anchorDate);
      return { start, end };
    }
    const gridDays = buildMonthGrid(anchorDate);
    return {
      start: gridDays[0],
      end: new Date(gridDays[gridDays.length - 1].setHours(23, 59, 59, 999)),
    };
  }, [viewMode, anchorDate]);

  const loadData = async () => {
    setLoading(true);
    const result = await getRMTCalendarData(
      range.start.toISOString(),
      range.end.toISOString(),
    );
    if (!result.success) {
      setStatus({
        type: "error",
        text: result.message || "Failed to load calendar data.",
      });
      setEvents([]);
      setClients([]);
      setLoading(false);
      return;
    }
    setEvents(result.events || []);
    setClients(result.clients || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [range.start.getTime(), range.end.getTime()]);

  const eventsByDay = useMemo(() => {
    const map = {};
    (events || []).forEach((event) => {
      const key = dayKey(event.startDateTime);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );
    });
    return map;
  }, [events]);

  const monthDays = useMemo(() => buildMonthGrid(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchorDate]);

  const handleMove = (direction) => {
    const next = new Date(anchorDate);
    if (viewMode === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      // Avoid month overflow (e.g. Mar 31 -> May 1) by anchoring to day 1 first.
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    }
    setAnchorDate(next);
  };

  const handleBook = async (event) => {
    event.preventDefault();
    if (!clientId || !date || !time || !duration) return;
    setSubmitting(true);
    setStatus(null);
    const result = await bookAppointmentForClient(clientId, {
      date,
      time,
      duration,
    });
    if (!result?.success) {
      setStatus({
        type: "error",
        text: result?.message || "Failed to add appointment.",
      });
      setSubmitting(false);
      return;
    }
    setStatus({ type: "success", text: "Appointment added." });
    setClientId("");
    setDate("");
    setTime("");
    setDuration(60);
    setSubmitting(false);
    await loadData();
  };

  const handleBookFromSlot = async () => {
    if (!selectedEvent || !modalClientId) return;
    const start = String(selectedEvent.startDateTime || "");
    if (start.length < 16) return;
    const date = start.slice(0, 10);
    const time = modalStartTime || start.slice(11, 16);
    setModalSubmitting(true);
    setStatus(null);
    const result = await bookAppointmentForClient(modalClientId, {
      date,
      time,
      duration: modalDuration,
      appointmentId: selectedEvent.id,
    });
    if (!result?.success) {
      setStatus({
        type: "error",
        text: result?.message || "Failed to book appointment.",
      });
      setModalSubmitting(false);
      return;
    }
    setStatus({ type: "success", text: "Appointment booked." });
    setModalSubmitting(false);
    setSelectedEvent(null);
    setModalClientId("");
    setModalStartTime("");
    await loadData();
  };

  const handleCancel = async (appointmentId) => {
    const confirmed = window.confirm(
      "Cancel this appointment and clear the booked details?",
    );
    if (!confirmed) return;
    await clearAppointment(appointmentId);
    await loadData();
  };

  const handleDelete = async (appointmentId) => {
    const confirmed = window.confirm("Delete this appointment time entirely?");
    if (!confirmed) return;
    await deleteAppointment(appointmentId);
    await loadData();
  };

  const handleAddSlotTime = () => {
    const nextTime = String(slotTimeInput || "").trim();
    if (!nextTime || !/^\d{2}:\d{2}$/.test(nextTime)) return;
    setSlotTimes((prev) =>
      prev.includes(nextTime)
        ? prev
        : [...prev, nextTime].sort((a, b) => a.localeCompare(b)),
    );
    setSlotTimeInput("");
  };

  const handleRemoveSlotTime = (timeValue) => {
    setSlotTimes((prev) => prev.filter((t) => t !== timeValue));
  };

  const handleAddAvailableSlots = async (event) => {
    event.preventDefault();
    if (!slotDate || slotTimes.length === 0) {
      setStatus({
        type: "error",
        text: "Please select a date and at least one time.",
      });
      return;
    }
    setSlotSubmitting(true);
    setStatus(null);
    const result = await addAvailableAppointmentTimesForDate(
      slotDate,
      slotTimes,
      slotDuration,
    );
    if (!result?.success) {
      setStatus({
        type: "error",
        text: result?.message || "Failed to add available times.",
      });
      setSlotSubmitting(false);
      return;
    }
    setStatus({ type: "success", text: result.message || "Timeslots added." });
    setSlotDate("");
    setSlotTimeInput("");
    setSlotTimes([]);
    setSlotDuration(60);
    setSlotSubmitting(false);
    await loadData();
  };

  const isMoreThanOneDayInPast = (event) => {
    const end = new Date(event.endDateTime);
    if (Number.isNaN(end.getTime())) return false;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 1);
    return end.getTime() < threshold.getTime();
  };

  const getEventClasses = (event) => {
    if (event.source !== "db") {
      return "border-[#d5e0d1] bg-[#f4f7f2] text-[#1f2a1f]";
    }

    const status = String(event.status || "").toLowerCase();
    if (status === "completed") {
      return "border-[#5d6f5a] bg-[#90a98d] text-[#102010]";
    }
    if (status === "booked") {
      return "border-[#93ad90] bg-[#c2d5bf] text-[#1a2b1a]";
    }
    if (status === "available") {
      return "border-[#d5e0d1] bg-[#edf4ea] text-[#1f2a1f]";
    }
    return "border-[#d5e0d1] bg-[#f4f7f2] text-[#1f2a1f]";
  };

  const renderEvent = (event) => {
    const isDb = event.source === "db";
    return (
      <div
        key={`${event.source}-${event.id}`}
        className={`border rounded p-2 text-xs space-y-1 cursor-pointer hover:border-[#9caf97] transition-colors ${getEventClasses(
          event,
        )}`}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedEvent(event)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedEvent(event);
          }
        }}
      >
        <p className="font-semibold">
          {event.title || "Untitled"}
        </p>
        <p>
          {event.isAllDay
            ? "All day"
            : `${formatTime(event.startDateTime)} - ${formatTime(event.endDateTime)}`}
        </p>
        {isDb && (
          <p>{(event.status || "").toUpperCase()}</p>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!selectedEvent || selectedEvent.source !== "db") return;
    const start = new Date(selectedEvent.startDateTime);
    const end = new Date(selectedEvent.endDateTime);
    const diffMinutes = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 60000),
    );
    setModalDuration(selectedEvent.duration || diffMinutes || 60);
    setModalStartTime(String(selectedEvent.startDateTime || "").slice(11, 16));
    setModalClientId("");
  }, [selectedEvent]);

  return (
    <section className="w-full space-y-6">
      <div className="border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1f2a1f]">Book appointment</p>
        <form
          onSubmit={handleBook}
          className="grid grid-cols-1 md:grid-cols-5 gap-3"
        >
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value={60}>60 min</option>
            <option value={75}>75 min</option>
            <option value={90}>90 min</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-[#1f2a1f] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add appointment"}
          </button>
        </form>
      </div>

      <div className="border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1f2a1f]">
          Add available timeslots
        </p>
        <form
          onSubmit={handleAddAvailableSlots}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-center">
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="time"
              value={slotTimeInput}
              onChange={(e) => setSlotTimeInput(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={60}>60 min</option>
              <option value={75}>75 min</option>
              <option value={90}>90 min</option>
            </select>
            <button
              type="button"
              onClick={handleAddSlotTime}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-[#e8efe4] transition-colors"
            >
              Add time
            </button>
            <button
              type="submit"
              disabled={slotSubmitting}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-[#1f2a1f] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors disabled:opacity-60 xl:justify-self-end xl:min-w-[220px]"
            >
              {slotSubmitting ? "Saving..." : "Save available times"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {slotTimes.map((slotTime) => (
              <button
                key={slotTime}
                type="button"
                onClick={() => handleRemoveSlotTime(slotTime)}
                className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-[#e8efe4] transition-colors"
                title="Remove time"
              >
                {formatTime(`1970-01-01T${slotTime}:00`)} x
              </button>
            ))}
          </div>
        </form>
      </div>

      <div className="border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleMove(-1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-[#e8efe4] transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-[#e8efe4] transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleMove(1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-[#e8efe4] transition-colors"
            >
              Next
            </button>
          </div>
          <p className="font-semibold text-[#1f2a1f]">
            {viewMode === "month"
              ? anchorDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 border rounded ${
                viewMode === "month" ? "border-blue-400" : "border-gray-300"
              } hover:bg-[#e8efe4] transition-colors`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 border rounded ${
                viewMode === "week" ? "border-blue-400" : "border-gray-300"
              } hover:bg-[#e8efe4] transition-colors`}
            >
              Week
            </button>
          </div>
        </div>

        {status && (
          <p
            className={`text-sm ${
              status.type === "error" ? "text-red-700" : "text-green-700"
            }`}
          >
            {status.text}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-gray-600">Loading calendar...</p>
        ) : viewMode === "month" ? (
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-xs font-semibold text-center text-gray-700">
                {day}
              </div>
            ))}
            {monthDays.map((dateObj) => {
              const key = dayKey(dateObj);
              const dailyEvents = eventsByDay[key] || [];
              const inCurrentMonth = dateObj.getMonth() === anchorDate.getMonth();
              return (
                <div
                  key={`${key}-${dateObj.getDate()}`}
                  className={`min-h-28 border rounded p-2 space-y-1 ${
                    inCurrentMonth ? "border-gray-300" : "border-gray-200 opacity-60"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-700">{dateObj.getDate()}</p>
                  <div className="space-y-1">{dailyEvents.map(renderEvent)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {weekDays.map((dateObj) => {
              const key = dayKey(dateObj);
              const dailyEvents = eventsByDay[key] || [];
              return (
                <div key={key} className="border border-gray-300 rounded p-2 space-y-2">
                  <p className="text-sm font-semibold text-[#1f2a1f]">
                    {dateObj.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="space-y-1">{dailyEvents.map(renderEvent)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[#1f2a1f]">
                {selectedEvent.title || "Untitled"}
              </p>
              <p className="text-sm text-[#2e3a2d]">
                {selectedEvent.isAllDay
                  ? formatDate(selectedEvent.startDateTime)
                  : `${formatDate(selectedEvent.startDateTime)} @ ${formatTime(
                      selectedEvent.startDateTime,
                    )} - ${formatTime(selectedEvent.endDateTime)}`}
              </p>
              {selectedEvent.source === "db" && (
                <p className="text-sm text-[#2e3a2d]">
                  Status: {(selectedEvent.status || "").toUpperCase()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedEvent.source === "db" &&
                isMoreThanOneDayInPast(selectedEvent) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDelete(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="px-3 py-2 border border-red-400 text-red-700 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete appointment
                  </button>
                )}

              {selectedEvent.source === "db" &&
                !isMoreThanOneDayInPast(selectedEvent) &&
                String(selectedEvent.status || "").toLowerCase() === "available" && (
                  <div className="w-full space-y-2 border border-[#d5e0d1] rounded-lg p-3">
                    <p className="text-sm font-medium text-[#1f2a1f]">
                      Book this open timeslot
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={modalStartTime}
                        onChange={(e) => setModalStartTime(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={modalClientId}
                        onChange={(e) => setModalClientId(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.firstName} {client.lastName}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={modalDuration}
                        onChange={(e) => setModalDuration(Number(e.target.value) || 60)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Duration (min)"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!modalClientId || !modalStartTime || modalSubmitting}
                      onClick={handleBookFromSlot}
                      className="px-3 py-2 border border-blue-400 text-blue-700 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {modalSubmitting ? "Booking..." : "Book appointment"}
                    </button>
                  </div>
                )}

              {selectedEvent.source === "db" &&
                !isMoreThanOneDayInPast(selectedEvent) &&
                selectedEvent.clientId && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleCancel(selectedEvent.id);
                        setSelectedEvent(null);
                      }}
                      className="px-3 py-2 border border-amber-400 text-amber-700 rounded hover:bg-amber-50 transition-colors"
                    >
                      Cancel appointment
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/rmt/reschedule-appointment/${selectedEvent.id}`,
                        )
                      }
                      className="px-3 py-2 border border-blue-400 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                    >
                      Reschedule appointment
                    </button>
                  </>
                )}

              {selectedEvent.source === "db" &&
                !selectedEvent.clientId &&
                !isMoreThanOneDayInPast(selectedEvent) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDelete(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="px-3 py-2 border border-red-400 text-red-700 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete slot
                  </button>
                )}

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-2 border border-gray-300 rounded text-[#1f2a1f] hover:bg-[#e8efe4] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
