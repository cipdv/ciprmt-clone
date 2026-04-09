"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRMTCalendarData,
  bookAppointmentForClient,
  clearAppointment,
  deleteAppointment,
  addAvailableAppointmentTimesForDate,
  sendConsentFormReminderForAppointment,
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

function formatConsentAreaLabel(key) {
  const labels = {
    upperInnerThighs: "Upper inner thighs",
  };
  if (labels[key]) return labels[key];
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (s) => s.toUpperCase());
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
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [clientId, setClientId] = useState("");
  const [bookClientQuery, setBookClientQuery] = useState("");
  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const [slotDate, setSlotDate] = useState("");
  const [slotTimeInput, setSlotTimeInput] = useState("");
  const [slotTimes, setSlotTimes] = useState([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotCutoffHours, setSlotCutoffHours] = useState(0);
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalClientId, setModalClientId] = useState("");
  const [modalClientQuery, setModalClientQuery] = useState("");
  const [modalSearchOpen, setModalSearchOpen] = useState(false);
  const [modalStartTime, setModalStartTime] = useState("");
  const [modalDuration, setModalDuration] = useState(60);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalReminderSubmitting, setModalReminderSubmitting] = useState(false);
  const [modalReminderStatus, setModalReminderStatus] = useState(null);
  const [pointerStartX, setPointerStartX] = useState(null);
  const bookSearchRef = useRef(null);
  const modalSearchRef = useRef(null);

  const range = useMemo(() => {
    if (isMobile) {
      const mobileMonthDays = buildMonthGrid(anchorDate);
      const start = mobileMonthDays[0];
      const end = new Date(
        mobileMonthDays[mobileMonthDays.length - 1].setHours(23, 59, 59, 999),
      );
      return { start, end };
    }
    const gridDays = buildMonthGrid(anchorDate);
    return {
      start: gridDays[0],
      end: new Date(gridDays[gridDays.length - 1].setHours(23, 59, 59, 999)),
    };
  }, [isMobile, anchorDate]);

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
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const applyMatch = () => setIsMobile(media.matches);
    applyMatch();
    media.addEventListener("change", applyMatch);
    return () => media.removeEventListener("change", applyMatch);
  }, []);

  const handleMove = (direction) => {
    const next = new Date(anchorDate);
    if (isMobile) {
      next.setDate(next.getDate() + direction);
    } else {
      // Avoid month overflow (e.g. Mar 31 -> May 1) by anchoring to day 1 first.
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    }
    setAnchorDate(next);
  };

  const handleJumpToDate = (dateValue) => {
    if (!dateValue) return;
    const next = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(next.getTime())) return;
    setAnchorDate(next);
  };

  const handleBook = async (event) => {
    event.preventDefault();
    if (!clientId) {
      setStatus({
        type: "error",
        text: "Select a client from the search results before booking.",
      });
      return;
    }
    if (!date || !time || !duration) return;
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
    setBookClientQuery("");
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
    const result = await deleteAppointment(appointmentId);
    if (!result?.success) {
      setStatus({
        type: "error",
        text: result?.message || "Failed to delete appointment.",
      });
      return;
    }
    setStatus({ type: "success", text: "Appointment deleted." });
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
      slotCutoffHours,
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
    setSlotCutoffHours(0);
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
        className={`w-full min-w-0 border rounded p-2 text-xs space-y-1 cursor-pointer hover:border-[#9caf97] hover:bg-[#e8efe4] transition-colors ${getEventClasses(
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
        <p className="font-semibold break-all leading-tight">
          {event.title || "Untitled"}
        </p>
        <p className="break-words">
          {event.isAllDay
            ? "All day"
            : `${formatTime(event.startDateTime)} - ${formatTime(event.endDateTime)}`}
        </p>
        {isDb && (
          <p className="break-words">{(event.status || "").toUpperCase()}</p>
        )}
      </div>
    );
  };

  const getAreasToAvoidText = (consentForm) => {
    if (!consentForm || typeof consentForm !== "object") return "";
    const areas = [];

    const consentAreas = consentForm.consentAreas;
    if (consentAreas && typeof consentAreas === "object") {
      Object.entries(consentAreas).forEach(([key, value]) => {
        if (value === false) {
          areas.push(formatConsentAreaLabel(key));
        }
      });
    }

    const explicitAreasToAvoid = String(consentForm.areasToAvoid || "").trim();
    if (explicitAreasToAvoid) {
      areas.push(explicitAreasToAvoid);
    }

    const deduped = [...new Set(areas)];
    return deduped.join(", ");
  };

  const hasConsentDetails = (consentForm) => {
    return Boolean(
      consentForm &&
        typeof consentForm === "object" &&
        Object.keys(consentForm).length > 0,
    );
  };

  const isBookedOrCompleted = (event) => {
    const normalized = String(event?.status || "").toLowerCase();
    return normalized === "booked" || normalized === "completed";
  };

  const filteredModalClients = useMemo(() => {
    const query = String(modalClientQuery || "").trim().toLowerCase();
    if (!query) return [];
    return clients
      .filter((client) => {
        const fullName = `${client.firstName || ""} ${client.lastName || ""}`.toLowerCase();
        const email = String(client.email || "").toLowerCase();
        const phone = String(client.phoneNumber || "").toLowerCase();
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          phone.includes(query)
        );
      })
      .slice(0, 8);
  }, [clients, modalClientQuery]);

  const filteredBookClients = useMemo(() => {
    const query = String(bookClientQuery || "").trim().toLowerCase();
    if (!query) return [];
    return clients
      .filter((client) => {
        const fullName = `${client.firstName || ""} ${client.lastName || ""}`.toLowerCase();
        const email = String(client.email || "").toLowerCase();
        const phone = String(client.phoneNumber || "").toLowerCase();
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          phone.includes(query)
        );
      })
      .slice(0, 8);
  }, [clients, bookClientQuery]);

  const handleSendConsentReminder = async () => {
    if (!selectedEvent?.id) return;
    setModalReminderSubmitting(true);
    setModalReminderStatus(null);
    const result = await sendConsentFormReminderForAppointment(selectedEvent.id);
    setModalReminderStatus({
      type: result?.success ? "success" : "error",
      text: result?.message || "Failed to send reminder.",
    });
    setModalReminderSubmitting(false);
  };

  const handlePointerDown = (event) => {
    if (!isMobile) return;
    setPointerStartX(event.clientX);
  };

  const handlePointerUp = (event) => {
    if (!isMobile || pointerStartX === null) return;
    const deltaX = event.clientX - pointerStartX;
    if (Math.abs(deltaX) > 50) {
      handleMove(deltaX > 0 ? -1 : 1);
    }
    setPointerStartX(null);
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
    setModalClientQuery("");
    setModalSearchOpen(false);
    setModalReminderStatus(null);
  }, [selectedEvent]);

  useEffect(() => {
    const handlePointerDownOutside = (event) => {
      if (
        bookSearchRef.current &&
        !bookSearchRef.current.contains(event.target)
      ) {
        setBookSearchOpen(false);
      }
      if (
        modalSearchRef.current &&
        !modalSearchRef.current.contains(event.target)
      ) {
        setModalSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, []);

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="w-full border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1f2a1f]">Book appointment</p>
        <form
          onSubmit={handleBook}
          className="grid grid-cols-1 md:grid-cols-5 gap-3"
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Client
            </label>
            <div className="relative" ref={bookSearchRef}>
            <input
              type="text"
              value={bookClientQuery}
              onChange={(e) => {
                setBookClientQuery(e.target.value);
                setClientId("");
                setBookSearchOpen(true);
              }}
              onFocus={() => setBookSearchOpen(true)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Search by name, email, or phone"
              required
            />
            {bookClientQuery.trim() && !clientId && bookSearchOpen && (
              <div className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-md border border-gray-300 bg-white">
                {filteredBookClients.length > 0 ? (
                  filteredBookClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setClientId(client.id);
                        setBookClientQuery(
                          `${client.firstName || ""} ${client.lastName || ""}`.trim(),
                        );
                        setBookSearchOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm border-b border-gray-200 last:border-b-0 hover:bg-[#e8efe4] transition-colors"
                    >
                      <div className="font-medium text-[#1f2a1f]">
                        {client.firstName} {client.lastName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {client.email || "No email"}{" "}
                        {client.phoneNumber ? `• ${client.phoneNumber}` : ""}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-600">No matching clients.</p>
                )}
              </div>
            )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={60}>60 min</option>
              <option value={75}>75 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-transparent select-none">
              Submit
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-[#1f2a1f] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add appointment"}
            </button>
          </div>
        </form>
      </div>

      <div className="w-full border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#1f2a1f] mr-2">
              {isMobile
                ? formatDate(anchorDate)
                : anchorDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
            </p>
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
            <input
              type="date"
              value={dayKey(anchorDate)}
              onChange={(e) => handleJumpToDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-sm"
              aria-label="Jump to date"
            />
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
        ) : isMobile ? (
          <div
            className="border border-gray-300 rounded p-3 space-y-2 touch-pan-y select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setPointerStartX(null)}
          >
            <p className="text-sm font-semibold text-[#1f2a1f]">
              {anchorDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="space-y-1">
              {(eventsByDay[dayKey(anchorDate)] || []).map(renderEvent)}
              {(eventsByDay[dayKey(anchorDate)] || []).length === 0 && (
                <p className="text-sm text-gray-600 py-2">No events for this day.</p>
              )}
            </div>
          </div>
        ) : (
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
        )}

        <details className="border border-[#d5e0d1] rounded-lg p-3 bg-[#f4f7f2]">
          <summary className="cursor-pointer text-sm font-semibold text-[#1f2a1f]">
            Add available timeslots
          </summary>
          <form
            onSubmit={handleAddAvailableSlots}
            className="space-y-3 mt-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Date
                </label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Time
                </label>
                <input
                  type="time"
                  value={slotTimeInput}
                  onChange={(e) => setSlotTimeInput(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Duration
                </label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value={60}>60 min</option>
                  <option value={75}>75 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Cutoff hours
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={slotCutoffHours}
                  onChange={(e) =>
                    setSlotCutoffHours(Number(e.target.value) || 0)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-transparent select-none">
                  Add
                </label>
                <button
                  type="button"
                  onClick={handleAddSlotTime}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-[#e8efe4] transition-colors"
                >
                  Add time
                </button>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-transparent select-none">
                  Save
                </label>
                <button
                  type="submit"
                  disabled={slotSubmitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-[#1f2a1f] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors disabled:opacity-60"
                >
                  {slotSubmitting ? "Saving..." : "Save available times"}
                </button>
              </div>
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
        </details>
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
            <div
              className={`space-y-1 ${
                selectedEvent.source === "db" &&
                String(selectedEvent.status || "").toLowerCase() === "booked" &&
                selectedEvent.clientId
                  ? "cursor-pointer hover:opacity-85 transition-opacity"
                  : ""
              }`}
              onClick={() => {
                if (
                  selectedEvent.source === "db" &&
                  String(selectedEvent.status || "").toLowerCase() === "booked" &&
                  selectedEvent.clientId
                ) {
                  setSelectedEvent(null);
                  router.push(
                    `/dashboard/rmt/client-profile/${selectedEvent.clientId}`,
                  );
                }
              }}
              role={
                selectedEvent.source === "db" &&
                String(selectedEvent.status || "").toLowerCase() === "booked" &&
                selectedEvent.clientId
                  ? "button"
                  : undefined
              }
              tabIndex={
                selectedEvent.source === "db" &&
                String(selectedEvent.status || "").toLowerCase() === "booked" &&
                selectedEvent.clientId
                  ? 0
                  : undefined
              }
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  selectedEvent.source === "db" &&
                  String(selectedEvent.status || "").toLowerCase() === "booked" &&
                  selectedEvent.clientId
                ) {
                  e.preventDefault();
                  setSelectedEvent(null);
                  router.push(
                    `/dashboard/rmt/client-profile/${selectedEvent.clientId}`,
                  );
                }
              }}
            >
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
            </div>

            {selectedEvent.source === "db" &&
              isBookedOrCompleted(selectedEvent) &&
              hasConsentDetails(selectedEvent.consentForm) && (
                <div className="space-y-2 text-sm text-[#2e3a2d] border border-[#d5e0d1] rounded-lg p-3 bg-white/60">
                  <p>
                    <span className="font-semibold">Reason for massage:</span>{" "}
                    {String(selectedEvent.consentForm.reasonForMassage || "").trim() ||
                      "Not provided"}
                  </p>
                  <p>
                    <span className="font-semibold">Areas to avoid:</span>{" "}
                    {getAreasToAvoidText(selectedEvent.consentForm) ||
                      "Not provided"}
                  </p>
                  <p>
                    <span className="font-semibold">Additional info:</span>{" "}
                    {String(selectedEvent.consentForm.additionalInfo || "").trim() ||
                      "Not provided"}
                  </p>
                </div>
              )}

            {selectedEvent.source === "db" &&
              isBookedOrCompleted(selectedEvent) &&
              !hasConsentDetails(selectedEvent.consentForm) && (
                <div className="space-y-2 text-sm text-[#2e3a2d] border border-amber-300 rounded-lg p-3 bg-amber-50">
                  <p className="font-medium text-amber-900">
                    Consent form not completed.
                  </p>
                  {String(selectedEvent.status || "").toLowerCase() === "booked" &&
                    (
                    <button
                      type="button"
                      disabled={modalReminderSubmitting}
                      onClick={handleSendConsentReminder}
                      className="px-3 py-2 border border-amber-500 text-amber-800 rounded hover:bg-[#e8efe4] transition-colors disabled:opacity-60"
                    >
                      {modalReminderSubmitting
                        ? "Sending..."
                        : "Send reminder"}
                    </button>
                    )}
                  {modalReminderStatus && (
                    <p
                      className={`text-sm ${
                        modalReminderStatus.type === "error"
                          ? "text-red-700"
                          : "text-green-700"
                      }`}
                    >
                      {modalReminderStatus.text}
                    </p>
                  )}
                </div>
              )}

            <div className="flex flex-wrap gap-2">
              {selectedEvent.source === "db" &&
                isMoreThanOneDayInPast(selectedEvent) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDelete(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="px-3 py-2 border border-red-400 text-red-700 rounded hover:bg-[#e8efe4] transition-colors"
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
                        value={modalDuration}
                        onChange={(e) => setModalDuration(Number(e.target.value))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value={60}>60 min</option>
                        <option value={75}>75 min</option>
                        <option value={90}>90 min</option>
                      </select>
                      <div className="sm:col-span-2 space-y-2" ref={modalSearchRef}>
                        <input
                          type="text"
                          value={modalClientQuery}
                          onChange={(e) => {
                            setModalClientQuery(e.target.value);
                            setModalClientId("");
                            setModalSearchOpen(true);
                          }}
                          onFocus={() => setModalSearchOpen(true)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Search client by name, email, or phone"
                        />
                        {modalClientQuery.trim() && !modalClientId && modalSearchOpen && (
                          <div className="max-h-36 overflow-y-auto rounded-md border border-gray-300 bg-white">
                            {filteredModalClients.length > 0 ? (
                              filteredModalClients.map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setModalClientId(client.id);
                                    setModalClientQuery(
                                      `${client.firstName || ""} ${client.lastName || ""}`.trim(),
                                    );
                                    setModalSearchOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm border-b border-gray-200 last:border-b-0 hover:bg-[#e8efe4] transition-colors"
                                >
                                  <div className="font-medium text-[#1f2a1f]">
                                    {client.firstName} {client.lastName}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {client.email || "No email"}{" "}
                                    {client.phoneNumber ? `• ${client.phoneNumber}` : ""}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-sm text-gray-600">
                                No matching clients.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!modalClientId || !modalStartTime || modalSubmitting}
                      onClick={handleBookFromSlot}
                      className="px-3 py-2 border border-blue-400 text-blue-700 rounded hover:bg-[#e8efe4] transition-colors disabled:opacity-50"
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
                      className="px-3 py-2 border border-amber-400 text-amber-700 rounded hover:bg-[#e8efe4] transition-colors"
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
                      className="px-3 py-2 border border-blue-400 text-blue-700 rounded hover:bg-[#e8efe4] transition-colors"
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
                    className="px-3 py-2 border border-red-400 text-red-700 rounded hover:bg-[#e8efe4] transition-colors"
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
    </div>
  );
}
