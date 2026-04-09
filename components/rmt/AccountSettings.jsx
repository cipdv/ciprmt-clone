"use client";

import { useMemo, useState } from "react";
import {
  addRmtLocationSettings,
  saveRmtLocationSettings,
  saveRmtServiceRate,
  addRmtServiceRate,
} from "@/app/_actions";
import { useRouter } from "next/navigation";

function normalizeLocationForForm(location) {
  return {
    id: location.id,
    locationName: location.locationName || "",
    streetAddress: location.streetAddress || "",
    city: location.city || "",
    province: location.province || "",
    country: location.country || "",
    postalCode: location.postalCode || "",
    phone: location.phone || "",
    email: location.email || "",
    workplaceType: location.workplaceType || "",
    description: location.description || "",
    whatToWear: location.whatToWear || "",
    payment: location.payment || "",
    url: location.url || "",
    services: location.services || [],
  };
}

function buildLocationFormData(location) {
  const formData = new FormData();
  formData.set("locationId", location.id);
  formData.set("locationName", location.locationName || "");
  formData.set("streetAddress", location.streetAddress || "");
  formData.set("city", location.city || "");
  formData.set("province", location.province || "");
  formData.set("country", location.country || "");
  formData.set("postalCode", location.postalCode || "");
  formData.set("phone", location.phone || "");
  formData.set("email", location.email || "");
  formData.set("workplaceType", location.workplaceType || "regular");
  formData.set("description", location.description || "");
  formData.set("whatToWear", location.whatToWear || "");
  formData.set("payment", location.payment || "");
  formData.set("url", location.url || "");
  return formData;
}

export default function AccountSettings({ initialData, selectedLocationId }) {
  const router = useRouter();
  const locations = initialData?.locations || [];
  const inputClass =
    "w-full rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b7c7b0] focus:border-[#80947a] hover:bg-[#e8efe4] transition-colors";
  const labelClass = "block text-sm font-medium text-[#1f2a1f] mb-1";

  const [contactStatus, setContactStatus] = useState(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [localSelectedLocationId, setLocalSelectedLocationId] = useState(
    locations[0]?.id || ""
  );
  const effectiveSelectedLocationId = selectedLocationId || localSelectedLocationId;
  const [locationDrafts, setLocationDrafts] = useState(
    Object.fromEntries(locations.map((location) => [location.id, normalizeLocationForForm(location)]))
  );
  const [locationStatus, setLocationStatus] = useState(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const [ratesStatus, setRatesStatus] = useState(null);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [showAddLocationForm, setShowAddLocationForm] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [addLocationStatus, setAddLocationStatus] = useState(null);
  const [newLocationDraft, setNewLocationDraft] = useState({
    locationName: "",
    streetAddress: "",
    city: "",
    province: "",
    country: "Canada",
    postalCode: "",
    phone: "",
    email: "",
    workplaceType: "regular",
    description: "",
    whatToWear: "",
    payment: "",
    url: "",
  });

  const [newRateDraft, setNewRateDraft] = useState({
    service: "Massage Therapy",
    duration: "60",
    price: "",
    plusHst: true,
  });

  const selectedLocation = useMemo(() => {
    if (!effectiveSelectedLocationId) return null;
    return locationDrafts[effectiveSelectedLocationId] || null;
  }, [locationDrafts, effectiveSelectedLocationId]);

  const updateSelectedLocationField = (field, value) => {
    if (!effectiveSelectedLocationId) return;
    setLocationDrafts((prev) => ({
      ...prev,
      [effectiveSelectedLocationId]: {
        ...prev[effectiveSelectedLocationId],
        [field]: value,
      },
    }));
  };

  const handleSaveContact = async (event) => {
    event.preventDefault();
    if (!selectedLocation) return;
    setContactStatus(null);
    setIsSavingContact(true);

    const result = await saveRmtLocationSettings(buildLocationFormData(selectedLocation));
    if (result.success) {
      setContactStatus({ type: "success", text: "Contact information saved for location." });
      router.refresh();
    } else {
      setContactStatus({
        type: "error",
        text: result.error || "Failed to save location contact information.",
      });
    }

    setIsSavingContact(false);
  };

  const handleAddLocation = async (event) => {
    event.preventDefault();
    setAddLocationStatus(null);
    setIsAddingLocation(true);

    const formData = new FormData();
    Object.entries(newLocationDraft).forEach(([key, value]) => {
      formData.set(key, String(value || ""));
    });

    const result = await addRmtLocationSettings(formData);
    if (result.success) {
      setAddLocationStatus({ type: "success", text: "New location added." });
      setNewLocationDraft({
        locationName: "",
        streetAddress: "",
        city: "",
        province: "",
        country: "Canada",
        postalCode: "",
        phone: "",
        email: "",
        workplaceType: "regular",
        description: "",
        whatToWear: "",
        payment: "",
        url: "",
      });
      setShowAddLocationForm(false);
      router.refresh();
    } else {
      setAddLocationStatus({
        type: "error",
        text: result.error || "Failed to add location.",
      });
    }

    setIsAddingLocation(false);
  };

  const handleSaveLocation = async (event) => {
    event.preventDefault();
    if (!selectedLocation) return;
    setLocationStatus(null);
    setIsSavingLocation(true);

    const formData = new FormData();
    formData.set("locationId", selectedLocation.id);
    formData.set("locationName", selectedLocation.locationName);
    formData.set("streetAddress", selectedLocation.streetAddress);
    formData.set("city", selectedLocation.city);
    formData.set("province", selectedLocation.province);
    formData.set("country", selectedLocation.country);
    formData.set("postalCode", selectedLocation.postalCode);
    formData.set("phone", selectedLocation.phone);
    formData.set("email", selectedLocation.email);
    formData.set("workplaceType", selectedLocation.workplaceType);
    formData.set("description", selectedLocation.description);
    formData.set("whatToWear", selectedLocation.whatToWear);
    formData.set("payment", selectedLocation.payment);
    formData.set("url", selectedLocation.url);

    const result = await saveRmtLocationSettings(formData);
    if (result.success) {
      setLocationStatus({ type: "success", text: "Location settings saved." });
      router.refresh();
    } else {
      setLocationStatus({
        type: "error",
        text: result.error || "Failed to save location settings.",
      });
    }

    setIsSavingLocation(false);
  };

  const handleSaveService = async (service) => {
    if (!effectiveSelectedLocationId) return;
    setRatesStatus(null);
    setIsSavingRates(true);

    const formData = new FormData();
    formData.set("serviceId", service.id);
    formData.set("service", service.service);
    formData.set("duration", String(service.duration));
    formData.set("price", String(service.price));
    if (service.plusHst) {
      formData.set("plusHst", "on");
    }

    const result = await saveRmtServiceRate(formData);
    if (result.success) {
      setRatesStatus({ type: "success", text: "Rate saved." });
      router.refresh();
    } else {
      setRatesStatus({
        type: "error",
        text: result.error || "Failed to save rate.",
      });
    }
    setIsSavingRates(false);
  };

  const handleAddService = async (event) => {
    event.preventDefault();
    if (!effectiveSelectedLocationId) return;
    setRatesStatus(null);
    setIsSavingRates(true);

    const formData = new FormData();
    formData.set("locationId", effectiveSelectedLocationId);
    formData.set("service", newRateDraft.service);
    formData.set("duration", newRateDraft.duration);
    formData.set("price", newRateDraft.price);
    if (newRateDraft.plusHst) {
      formData.set("plusHst", "on");
    }

    const result = await addRmtServiceRate(formData);
    if (result.success) {
      setRatesStatus({ type: "success", text: "New rate added." });
      setNewRateDraft({
        service: "Massage Therapy",
        duration: "60",
        price: "",
        plusHst: true,
      });
      router.refresh();
    } else {
      setRatesStatus({
        type: "error",
        text: result.error || "Failed to add new rate.",
      });
    }
    setIsSavingRates(false);
  };

  const updateServiceDraft = (serviceId, field, value) => {
    if (!effectiveSelectedLocationId) return;
    setLocationDrafts((prev) => {
      const location = prev[effectiveSelectedLocationId];
      if (!location) return prev;

      return {
        ...prev,
        [effectiveSelectedLocationId]: {
          ...location,
          services: location.services.map((service) =>
            service.id === serviceId ? { ...service, [field]: value } : service
          ),
        },
      };
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] p-6">
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
        <form onSubmit={handleSaveContact} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Location Email</label>
            <input
              type="email"
              value={selectedLocation?.email || ""}
              onChange={(event) => updateSelectedLocationField("email", event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Location Phone Number</label>
            <input
              type="tel"
              value={selectedLocation?.phone || ""}
              onChange={(event) => updateSelectedLocationField("phone", event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSavingContact}
              className="rounded-md bg-[#c2d5bf] px-4 py-2 text-sm font-medium text-[#1a2b1a] border border-[#93ad90] hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors disabled:opacity-70"
            >
              {isSavingContact ? "Saving..." : "Save location contact information"}
            </button>
            {contactStatus ? (
              <p
                className={`text-sm ${
                  contactStatus.type === "success" ? "text-green-700" : "text-red-700"
                }`}
              >
                {contactStatus.text}
              </p>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h3 className="text-lg font-semibold">Locations</h3>
          {!selectedLocationId ? (
            <select
              value={effectiveSelectedLocationId}
              onChange={(event) => setLocalSelectedLocationId(event.target.value)}
              className={inputClass}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationName || location.streetAddress || location.id}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {selectedLocation ? (
          <>
            <form
              onSubmit={handleSaveLocation}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
            <div>
              <label className="block text-sm text-gray-700 mb-1">Location Name</label>
              <input
                type="text"
                value={selectedLocation.locationName}
                onChange={(event) =>
                  updateSelectedLocationField("locationName", event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Street Address</label>
              <input
                type="text"
                value={selectedLocation.streetAddress}
                onChange={(event) =>
                  updateSelectedLocationField("streetAddress", event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={selectedLocation.city}
                onChange={(event) => updateSelectedLocationField("city", event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Province</label>
              <input
                type="text"
                value={selectedLocation.province}
                onChange={(event) =>
                  updateSelectedLocationField("province", event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                value={selectedLocation.country}
                onChange={(event) =>
                  updateSelectedLocationField("country", event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Postal Code</label>
              <input
                type="text"
                value={selectedLocation.postalCode}
                onChange={(event) =>
                  updateSelectedLocationField("postalCode", event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Workplace Type</label>
              <select
                value={selectedLocation.workplaceType}
                onChange={(event) =>
                  updateSelectedLocationField("workplaceType", event.target.value)
                }
                className={inputClass}
                required
              >
                {selectedLocation.workplaceType &&
                !["regular", "irregular"].includes(selectedLocation.workplaceType) ? (
                  <option value={selectedLocation.workplaceType}>
                    {selectedLocation.workplaceType}
                  </option>
                ) : null}
                <option value="regular">regular</option>
                <option value="irregular">irregular</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Website URL</label>
              <input
                type="text"
                value={selectedLocation.url}
                onChange={(event) => updateSelectedLocationField("url", event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                value={selectedLocation.description}
                onChange={(event) =>
                  updateSelectedLocationField("description", event.target.value)
                }
                className={inputClass}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>What To Wear</label>
              <textarea
                value={selectedLocation.whatToWear}
                onChange={(event) =>
                  updateSelectedLocationField("whatToWear", event.target.value)
                }
                className={inputClass}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Payment</label>
              <textarea
                value={selectedLocation.payment}
                onChange={(event) => updateSelectedLocationField("payment", event.target.value)}
                className={inputClass}
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingLocation}
                className="rounded-md bg-[#c2d5bf] px-4 py-2 text-sm font-medium text-[#1a2b1a] border border-[#93ad90] hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors disabled:opacity-70"
              >
                {isSavingLocation ? "Saving..." : "Save location settings"}
              </button>
              {locationStatus ? (
                <p
                  className={`text-sm ${
                    locationStatus.type === "success"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {locationStatus.text}
                </p>
              ) : null}
            </div>
            </form>

            <div className="border-t border-[#b7c7b0] pt-4 mt-2 space-y-3">
              <button
                type="button"
                onClick={() => setShowAddLocationForm((prev) => !prev)}
                className="rounded-md border border-[#b7c7b0] bg-[#f4f7f2] px-4 py-2 text-sm font-medium text-[#1f2a1f] hover:bg-[#e8efe4] transition-colors"
              >
                {showAddLocationForm ? "Hide add new location" : "Add new location"}
              </button>

              {showAddLocationForm ? (
                <form
                  onSubmit={handleAddLocation}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border border-dashed border-[#b7c7b0] p-4"
                >
                <div>
                  <label className={labelClass}>Location Name</label>
                  <input
                    type="text"
                    value={newLocationDraft.locationName}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        locationName: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Street Address</label>
                  <input
                    type="text"
                    value={newLocationDraft.streetAddress}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        streetAddress: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={newLocationDraft.city}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({ ...prev, city: event.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <input
                    type="text"
                    value={newLocationDraft.province}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        province: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    type="text"
                    value={newLocationDraft.country}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        country: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input
                    type="text"
                    value={newLocationDraft.postalCode}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        postalCode: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Location Email</label>
                  <input
                    type="email"
                    value={newLocationDraft.email}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Location Phone</label>
                  <input
                    type="tel"
                    value={newLocationDraft.phone}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Workplace Type</label>
                  <select
                    value={newLocationDraft.workplaceType}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        workplaceType: event.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  >
                    <option value="regular">regular</option>
                    <option value="irregular">irregular</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Website URL</label>
                  <input
                    type="text"
                    value={newLocationDraft.url}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        url: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={2}
                    value={newLocationDraft.description}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>What To Wear</label>
                  <textarea
                    rows={2}
                    value={newLocationDraft.whatToWear}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        whatToWear: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Payment</label>
                  <textarea
                    rows={2}
                    value={newLocationDraft.payment}
                    onChange={(event) =>
                      setNewLocationDraft((prev) => ({
                        ...prev,
                        payment: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isAddingLocation}
                      className="rounded-md bg-[#c2d5bf] px-4 py-2 text-sm font-medium text-[#1a2b1a] border border-[#93ad90] hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors disabled:opacity-70"
                    >
                      {isAddingLocation ? "Adding..." : "Save new location"}
                    </button>
                    {addLocationStatus ? (
                      <p
                        className={`text-sm ${
                          addLocationStatus.type === "success"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {addLocationStatus.text}
                      </p>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">No locations found for this RMT account.</p>
        )}
      </div>

      <div className="rounded-xl border border-[#b7c7b0] bg-[#f4f7f2] p-6 space-y-4">
        <h3 className="text-lg font-semibold">Rates</h3>
        {!selectedLocation ? (
          <p className="text-sm text-gray-600">Select a location to manage rates.</p>
        ) : (
          <>
            <div className="space-y-3">
              {selectedLocation.services.map((service) => (
                <div
                  key={service.id}
                  className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end rounded-md border border-[#b7c7b0] p-3"
                >
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Service</label>
                    <input
                      type="text"
                      value={service.service}
                      onChange={(event) =>
                        updateServiceDraft(service.id, "service", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={service.duration}
                      onChange={(event) =>
                        updateServiceDraft(
                          service.id,
                          "duration",
                          Number(event.target.value || 0)
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={service.price}
                      onChange={(event) =>
                        updateServiceDraft(
                          service.id,
                          "price",
                          Number(event.target.value || 0)
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(service.plusHst)}
                      onChange={(event) =>
                        updateServiceDraft(service.id, "plusHst", event.target.checked)
                      }
                    />
                    Plus HST
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSaveService(service)}
                    disabled={isSavingRates}
                    className="rounded-md bg-[#c2d5bf] px-3 py-2 text-sm font-medium text-[#1a2b1a] border border-[#93ad90] hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors disabled:opacity-70"
                  >
                    Save rate
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddService}
              className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end rounded-md border border-dashed border-[#b7c7b0] p-3"
            >
              <div>
                <label className="block text-xs text-gray-600 mb-1">Service</label>
                <input
                  type="text"
                  value={newRateDraft.service}
                  onChange={(event) =>
                    setNewRateDraft((prev) => ({ ...prev, service: event.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={newRateDraft.duration}
                  onChange={(event) =>
                    setNewRateDraft((prev) => ({ ...prev, duration: event.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRateDraft.price}
                  onChange={(event) =>
                    setNewRateDraft((prev) => ({ ...prev, price: event.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newRateDraft.plusHst}
                  onChange={(event) =>
                    setNewRateDraft((prev) => ({ ...prev, plusHst: event.target.checked }))
                  }
                />
                Plus HST
              </label>
              <button
                type="submit"
                disabled={isSavingRates}
                className="rounded-md bg-[#c2d5bf] px-3 py-2 text-sm font-medium text-[#1a2b1a] border border-[#93ad90] hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors disabled:opacity-70"
              >
                Add rate
              </button>
            </form>

            {ratesStatus ? (
              <p
                className={`text-sm ${
                  ratesStatus.type === "success" ? "text-green-700" : "text-red-700"
                }`}
              >
                {ratesStatus.text}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}


