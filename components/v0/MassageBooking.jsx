"use client";

import { useState } from "react";
import { addLocation, getLocations } from "@/app/_actions";
import { addService, getServices } from "@/app/_actions";

export default function TherapistDashboard() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleAddLocation = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const result = await addLocation(formData);
    if (result.success) {
      // Refresh locations
      const updatedLocations = await getLocations();
      setLocations(updatedLocations);
    }
  };

  const handleAddService = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    formData.append("locationId", selectedLocation._id);
    const result = await addService(formData);
    if (result.success) {
      // Refresh services for the selected location
      const updatedServices = await getServices(selectedLocation._id);
      setSelectedLocation({ ...selectedLocation, services: updatedServices });
    }
  };

  return (
    <div>
      <h1>Therapist Dashboard</h1>

      <form onSubmit={handleAddLocation}>
        {/* Add form fields for location details */}
        <button type="submit">Add Location</button>
      </form>

      <select
        onChange={(e) =>
          setSelectedLocation(locations.find((l) => l._id === e.target.value))
        }
      >
        {locations.map((location) => (
          <option key={location._id} value={location._id}>
            {location.name}
          </option>
        ))}
      </select>

      {selectedLocation && (
        <form onSubmit={handleAddService}>
          {/* Add form fields for service details */}
          <button type="submit">Add Service</button>
        </form>
      )}
    </div>
  );
}
