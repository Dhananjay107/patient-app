"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
  qualification?: string;
  serviceCharge?: number;
  hospitalId?: string;
  hospital?: {
    name: string;
    address: string;
  };
}

interface Slot {
  _id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  date: string;
}

export default function DoctorBookingPage() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params.doctorId as string;
  
  const [step, setStep] = useState(1); // 1: Details, 2: Slot, 3: Personal Info, 4: Payment
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [hasAvailableSlot, setHasAvailableSlot] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    patientName: "",
    age: "",
    gender: "",
    address: "",
    issue: "",
    channel: "PHYSICAL" as "PHYSICAL" | "VIDEO",
  });
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      
      if (!storedUser || !storedToken) {
        router.replace("/");
        return;
      }
      
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setToken(storedToken);
      setFormData(prev => ({ ...prev, patientName: userData.name || "" }));
    }
  }, [router]);

  useEffect(() => {
    if (!token || !doctorId) return;
    fetchDoctorDetails();
  }, [token, doctorId]);

  useEffect(() => {
    if (selectedDate && doctorId) {
      checkSlotAvailability();
    }
  }, [selectedDate, doctorId]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch doctor by ID using search (backend now supports ObjectId search)
      const data = await apiGet<{ success: boolean; data: Doctor[] }>(
        `/api/public/doctors?search=${encodeURIComponent(doctorId)}&limit=10`
      );
      const doctorsList = data.success && Array.isArray(data.data) ? data.data : [];
      const doctorData = doctorsList.find(d => d._id === doctorId || d.id === doctorId) || null;
      
      if (!doctorData) {
        setError("Doctor not found. Please try selecting a doctor again.");
        setLoading(false);
        return;
      }
      
      // Fetch hospital info
      if (doctorData.hospitalId) {
        try {
          const hospitals = await apiGet(`/api/public/hospitals`).then((h: any) => {
            const hospitalList = h.success && Array.isArray(h.data) 
              ? h.data 
              : Array.isArray(h) ? h : [];
            return hospitalList;
          });
          const hospital = hospitals.find((h: any) => h._id === doctorData?.hospitalId);
          setDoctor({ ...doctorData, hospital });
        } catch {
          setDoctor(doctorData);
        }
      } else {
        setDoctor(doctorData);
      }
    } catch (error: any) {
      console.error("Error fetching doctor:", error);
      setError("Failed to load doctor details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkSlotAvailability = async () => {
    try {
      const queryParams = new URLSearchParams({
        doctorId,
        date: selectedDate,
      });
      if (doctor?.hospitalId) {
        queryParams.append("hospitalId", doctor.hospitalId);
      }
      
      const data = await apiGet<Slot[]>(
        `/api/schedules/slots/available?${queryParams.toString()}`
      );
      const availableSlots = Array.isArray(data) ? data.filter(s => !s.isBooked) : [];
      setSlots(availableSlots);
      setHasAvailableSlot(availableSlots.length > 0);
    } catch (error: any) {
      console.error("Error checking slots:", error);
      setSlots([]);
      setHasAvailableSlot(false);
    }
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot("");
  };

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlot(slotId);
    setStep(3);
  };

  const handleAutoBook = () => {
    // Auto-book if slot available, otherwise show slot selection
    if (hasAvailableSlot && slots.length > 0) {
      handleSlotSelect(slots[0]._id);
    } else {
      setStep(2);
    }
  };

  const handlePayment = async () => {
    if (!token || !user || !doctor || !selectedDate) return;

    setProcessingPayment(true);
    
    // Simulate payment processing (dummy)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setProcessingPayment(false);
    setLoading(true);

    try {
      const patientId = user.id || user._id;
      if (!patientId) {
        alert("User information is missing");
        return;
      }

      let scheduledAt: string;
      if (selectedSlot) {
        const slot = slots.find(s => s._id === selectedSlot);
        scheduledAt = slot ? new Date(slot.startTime).toISOString() : new Date(selectedDate).toISOString();
      } else {
        scheduledAt = new Date(selectedDate).toISOString();
      }

      const appointmentData: any = {
        hospitalId: doctor.hospitalId || "",
        doctorId: doctor._id,
        patientId: patientId,
        scheduledAt,
        patientName: formData.patientName.trim(),
        age: parseInt(formData.age),
        address: formData.address.trim(),
        issue: formData.issue.trim(),
        channel: formData.channel,
      };

      if (selectedSlot) {
        appointmentData.slotId = selectedSlot;
      }

      await apiPost("/api/appointments", appointmentData);

      alert("Appointment booked successfully!");
      router.push("/appointments");
    } catch (error: any) {
      alert("Failed to book appointment: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading doctor details...</p>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The doctor you're looking for could not be found."}</p>
          <Link
            href="/appointments/book"
            className="inline-block rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            Go Back to Select Doctor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Book Appointment</h1>
              <p className="mt-1 text-sm text-gray-600">Step {step} of 4</p>
            </div>
            <Link
              href="/appointments/book"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step 1: Doctor Details */}
        {step === 1 && (
          <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl">
                👨‍⚕️
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900">Dr. {doctor.name}</h2>
                {doctor.specialization && (
                  <p className="text-lg text-blue-600 font-medium mt-1">{doctor.specialization}</p>
                )}
                {doctor.qualification && (
                  <p className="text-sm text-gray-600 mt-2">{doctor.qualification}</p>
                )}
              </div>
            </div>

            {doctor.hospital && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">🏥 {doctor.hospital.name}</p>
                <p className="text-sm text-gray-600 mt-1">{doctor.hospital.address}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Consultation Fee</p>
              <p className="text-2xl font-bold text-blue-900">₹{doctor.serviceCharge || 500}</p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Select Date</h3>
              <div className="grid grid-cols-7 gap-2">
                {getNext7Days().map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className={`rounded-lg border p-3 text-sm font-semibold transition-colors ${
                      selectedDate === date
                        ? "border-blue-900 bg-blue-50 text-blue-900"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {new Date(date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="mt-6">
                {hasAvailableSlot ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <p className="text-green-800 font-semibold">✓ Slot Available</p>
                    <p className="text-sm text-green-700 mt-1">
                      Doctor has available slots for {new Date(selectedDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-yellow-800 font-semibold">⚠ No Pre-defined Slots</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      You can still book by selecting a time manually
                    </p>
                  </div>
                )}
                <button
                  onClick={handleAutoBook}
                  className="w-full rounded-lg bg-blue-900 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  {hasAvailableSlot ? "Continue to Slot Selection" : "Continue to Details"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Slot Selection */}
        {step === 2 && (
          <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="text-blue-900 hover:text-blue-800 font-semibold"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Select Time Slot</h2>
            </div>

            {slots.length > 0 ? (
              <div>
                <p className="text-gray-600 mb-4">Available slots for {new Date(selectedDate).toLocaleDateString()}</p>
                <div className="grid grid-cols-4 gap-3">
                  {slots.map((slot) => {
                    const startTime = new Date(slot.startTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={slot._id}
                        onClick={() => handleSlotSelect(slot._id)}
                        className={`rounded-lg border p-4 text-sm font-semibold transition-colors ${
                          selectedSlot === slot._id
                            ? "border-blue-900 bg-blue-50 text-blue-900"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {startTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No slots available. You can proceed with manual booking.</p>
                <button
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  Continue to Details
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Personal Details */}
        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(4);
            }}
            className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg"
          >
            <div className="mb-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(selectedSlot ? 2 : 1)}
                className="text-blue-900 hover:text-blue-800 font-semibold"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Personal Details</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Age *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="150"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Gender *</label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Address *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Symptoms / Problem Description *
                </label>
                <textarea
                  required
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  placeholder="Describe your medical issue or reason for appointment"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Appointment Type *</label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="PHYSICAL"
                      checked={formData.channel === "PHYSICAL"}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value as "PHYSICAL" | "VIDEO" })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Offline (Physical)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="VIDEO"
                      checked={formData.channel === "VIDEO"}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value as "PHYSICAL" | "VIDEO" })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Online (Video)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-900 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Continue to Payment
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-2">
              <button
                onClick={() => setStep(3)}
                className="text-blue-900 hover:text-blue-800 font-semibold"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
            </div>

            <div className="mb-6 p-6 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Consultation Fee</span>
                <span className="text-2xl font-bold text-blue-900">₹{doctor.serviceCharge || 500}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>GST (if applicable)</span>
                <span>₹0</span>
              </div>
              <div className="border-t border-blue-200 mt-4 pt-4 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-900">₹{doctor.serviceCharge || 500}</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                This is a dummy payment. No actual payment will be processed.
              </p>
              <button
                onClick={handlePayment}
                disabled={loading || processingPayment}
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                    Processing Payment...
                  </span>
                ) : loading ? (
                  "Booking Appointment..."
                ) : (
                  `Pay ₹${doctor.serviceCharge || 500} & Book Appointment`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

