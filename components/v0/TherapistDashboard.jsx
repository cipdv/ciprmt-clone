"use client";

import { useState, useEffect } from "react";
import { getLocations } from "../actions/locationActions";
import { getServices } from "../actions/serviceActions";
import { bookAppointment } from "../actions/appointmentActions";

export default function BookingForm() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      const fetchedLocations = await getLocations();
      setLocations(fetchedLocations);
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      const fetchServices = async () => {
        const fetchedServices = await getServices(selectedLocation._id);
        setServices(fetchedServices);
      };
      fetchServices();
    }
  }, [selectedLocation]);

  // Function to fetch available slots based on selected location and service
  const fetchAvailableSlots = async () => {
    // Implement this function to fetch available slots from your backend
  };

  const handleBooking = async () => {
    if (selectedLocation && selectedService && selectedSlot) {
      const result = await bookAppointment({
        locationId: selectedLocation._id,
        serviceId: selectedService._id,
        slot: selectedSlot,
      });
      if (result.success) {
        // Handle successful booking
      } else {
        // Handle booking error
      }
    }
  };

  return (
    <div>
      <h1>Book an Appointment</h1>

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
        <select
          onChange={(e) =>
            setSelectedService(services.find((s) => s._id === e.target.value))
          }
        >
          {services.map((service) => (
            <option key={service._id} value={service._id}>
              {service.name} - {service.duration} minutes - ${service.price}
            </option>
          ))}
        </select>
      )}

      {selectedService && (
        <div>
          {/* Display available slots here */}
          <button onClick={handleBooking}>Book Appointment</button>
        </div>
      )}
    </div>
  );
}
