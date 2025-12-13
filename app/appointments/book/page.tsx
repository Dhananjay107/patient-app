"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";

// Common specializations
const SPECIALIZATIONS = [
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedic",
  "Pediatrician",
  "Gynecologist",
  "Psychiatrist",
  "General Physician",
  "Dentist",
  "Ophthalmologist",
  "ENT Specialist",
  "Gastroenterologist",
  "Urologist",
  "Oncologist",
  "Endocrinologist",
];

interface Doctor {
  _id: string;
  id: string;
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

export default function BookAppointmentPage() {
  const router = useRouter();
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      
      if (!storedUser || !storedToken) {
        router.replace("/");
        return;
      }
      
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, [router]);

  const fetchDoctorsBySpecialization = async (specialization: string) => {
    setLoading(true);
    try {
      const data = await apiGet<{ success: boolean; data: Doctor[] }>(
        `/api/public/doctors?search=${encodeURIComponent(specialization)}&limit=50`
      );
      const doctorsList = data.success && Array.isArray(data.data) ? data.data : [];
      
      // Fetch hospital info for each doctor
      const doctorsWithHospitals = await Promise.all(
        doctorsList.map(async (doctor) => {
          if (doctor.hospitalId) {
            try {
              const hospital = await apiGet(`/api/public/hospitals`).then((hospitals: any) => {
                const hospitalList = hospitals.success && Array.isArray(hospitals.data) 
                  ? hospitals.data 
                  : Array.isArray(hospitals) ? hospitals : [];
                return hospitalList.find((h: any) => h._id === doctor.hospitalId);
              }).catch(() => null);
              
              return { ...doctor, hospital };
            } catch {
              return doctor;
            }
          }
          return doctor;
        })
      );
      
      setDoctors(doctorsWithHospitals);
    } catch (error: any) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationSelect = (specialization: string) => {
    setSelectedSpecialization(specialization);
    fetchDoctorsBySpecialization(specialization);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Book Appointment</h1>
              <p className="mt-1 text-sm text-gray-600">Find the right doctor for your needs</p>
            </div>
            <Link
              href="/appointments"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!selectedSpecialization ? (
          /* Step 1: Select Specialization */
          <div className="rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Select Specialization
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  onClick={() => handleSpecializationSelect(spec)}
                  className="rounded-xl border-2 border-gray-200 bg-white p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div className="text-3xl mb-2">👨‍⚕️</div>
                  <h3 className="font-semibold text-gray-900">{spec}</h3>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Step 2: Doctor List */
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedSpecialization("");
                  setDoctors([]);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSpecialization} Doctors
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {doctors.length} {doctors.length === 1 ? "doctor" : "doctors"} available
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading doctors...</p>
                </div>
              </div>
            ) : doctors.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="text-6xl mb-4">👨‍⚕️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Doctors Found</h3>
                <p className="text-gray-600 mb-6">
                  No {selectedSpecialization} doctors available at the moment.
                </p>
                <button
                  onClick={() => {
                    setSelectedSpecialization("");
                    setDoctors([]);
                  }}
                  className="rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  Choose Different Specialization
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {doctors.map((doctor) => (
                  <div
                    key={doctor._id}
                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/appointments/book/${doctor._id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Dr. {doctor.name}</h3>
                        {doctor.specialization && (
                          <p className="text-sm text-blue-600 font-medium mt-1">
                            {doctor.specialization}
                          </p>
                        )}
                        {doctor.qualification && (
                          <p className="text-xs text-gray-500 mt-1">{doctor.qualification}</p>
                        )}
                      </div>
                      <div className="text-3xl">👨‍⚕️</div>
                    </div>

                    {doctor.hospital && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700">
                          🏥 {doctor.hospital.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{doctor.hospital.address}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Consultation Fee</p>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{doctor.serviceCharge || 500}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/appointments/book/${doctor._id}`);
                        }}
                        className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 shadow-sm"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
