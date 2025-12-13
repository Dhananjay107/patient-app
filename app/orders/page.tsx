"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { initializeSocket, getSocket, onSocketEvent, offSocketEvent } from "@/lib/socket";
import DashboardLayout from "@/components/DashboardLayout";

interface Pharmacy {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

interface Prescription {
  _id: string;
  items: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  doctorId: string;
  appointmentId: string;
}

interface Order {
  _id: string;
  pharmacyId: string;
  status: string;
  items: Array<{ medicineName: string; quantity: number }>;
  totalAmount?: number;
  deliveryType: string;
  createdAt: string;
  pharmacy?: Pharmacy;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
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
      initializeSocket(storedToken);
      
      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            console.log("Location access denied");
          }
        );
      }
    }
  }, [router]);

  const fetchOrders = async () => {
    if (!token || !user?.id) return;
    
    try {
      const data = await apiGet<Order[]>(`/api/orders/my`);
      const ordersList = Array.isArray(data) ? data : [];
      
      // Fetch pharmacy details
      const enrichedOrders = await Promise.all(
        ordersList.map(async (order) => {
          try {
            const pharmacy = await apiGet<Pharmacy>(`/api/master/pharmacies/${order.pharmacyId}`).catch(() => null);
            return { ...order, pharmacy };
          } catch {
            return order;
          }
        })
      );
      
      setOrders(enrichedOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    if (!token || !user?.id) return;
    
    try {
      // Try by-patient endpoint first
      let data;
      try {
        data = await apiGet<Prescription[]>(`/api/prescriptions/by-patient/${user.id}`);
      } catch {
        // Fallback to query param
        data = await apiGet<Prescription[]>(`/api/prescriptions?patientId=${user.id}`).catch(() => []);
      }
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    }
  };

  const fetchPharmacies = async () => {
    try {
      const data = await apiGet<Pharmacy[]>("/api/public/pharmacies");
      let pharmaciesList = Array.isArray(data?.data || data) ? (data.data || data) : [];
      
      // Calculate distances if user location is available
      if (userLocation) {
        pharmaciesList = pharmaciesList.map((pharmacy) => {
          if (pharmacy.latitude && pharmacy.longitude) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              pharmacy.latitude,
              pharmacy.longitude
            );
            return { ...pharmacy, distance };
          }
          return pharmacy;
        });
        
        // Sort by distance
        pharmaciesList.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
      
      setPharmacies(pharmaciesList);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  useEffect(() => {
    if (!token || !user?.id) return;
    fetchOrders();
    fetchPrescriptions();
    fetchPharmacies();
  }, [token, user?.id, userLocation]);

  // Listen for real-time updates
  useEffect(() => {
    if (!token || !user?.id) return;

    const socket = getSocket();
    if (!socket) return;

    const handleOrderUpdate = () => {
      fetchOrders();
    };

    onSocketEvent("order:statusUpdated", handleOrderUpdate);
    onSocketEvent("order:created", handleOrderUpdate);
    
    return () => {
      offSocketEvent("order:statusUpdated", handleOrderUpdate);
      offSocketEvent("order:created", handleOrderUpdate);
    };
  }, [token, user?.id]);

  const handleOrderFromPrescription = async (prescriptionId: string, pharmacyId: string) => {
    if (!token || !user?.id) return;
    
    try {
      const prescription = prescriptions.find(p => p._id === prescriptionId);
      if (!prescription) return;

      const items = prescription.items.map(item => ({
        medicineName: item.medicineName,
        quantity: 1, // Default quantity
      }));

      await apiPost("/api/orders", {
        pharmacyId,
        prescriptionId,
        patientId: user.id,
        items,
        deliveryType: "DELIVERY",
        patientLocation: userLocation ? {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        } : undefined,
      });

      alert("Order created successfully!");
      fetchOrders();
    } catch (error: any) {
      alert("Failed to create order: " + (error.message || "Unknown error"));
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    
    try {
      await apiDelete(`/api/orders/${orderId}`);
      fetchOrders();
      alert("Order deleted successfully");
    } catch (error: any) {
      alert("Failed to delete order: " + (error.message || "Unknown error"));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "OUT_FOR_DELIVERY":
        return "bg-blue-100 text-blue-800";
      case "PACKED":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-purple-100 text-purple-800";
      case "PENDING":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Orders" description="Loading your orders...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Orders"
      description="View and track your medicine orders"
      actionButton={
        <Link
          href="/orders/new"
          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition-colors"
        >
          New Order
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto">
        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Orders</h2>
            <p className="text-gray-600 mb-6">You don't have any orders yet.</p>
            <Link
              href="/orders/new"
              className="inline-block rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              Place Your First Order
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        Order #{order._id.slice(-8)}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">
                      <strong>Pharmacy:</strong> {order.pharmacy?.name || "N/A"}
                    </p>
                    <p className="text-gray-700 mb-2">
                      <strong>Items:</strong> {order.items.map(i => `${i.medicineName} (${i.quantity})`).join(", ")}
                    </p>
                    {order.totalAmount && (
                      <p className="text-gray-700 mb-2">
                        <strong>Amount:</strong> ₹{order.totalAmount}
                      </p>
                    )}
                    <p className="text-gray-700 mb-2">
                      <strong>Type:</strong> {order.deliveryType}
                    </p>
                    <p className="text-gray-700 mb-2">
                      <strong>Ordered:</strong> {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Link
                      href={`/orders/track/${order._id}`}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                      Track Order
                    </Link>
                    {(order.status === "PENDING" || order.status === "CANCELLED") && (
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="rounded-lg border border-red-500 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 shadow-sm"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prescriptions Section */}
        {prescriptions.length > 0 && (
          <div className="mt-8 rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order from Prescription</h2>
            <div className="space-y-4">
              {prescriptions.map((prescription) => (
                <div key={prescription._id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Prescription from Appointment
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Medicines:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {prescription.items.map((item, idx) => (
                        <li key={idx}>
                          {item.medicineName} - {item.dosage}, {item.frequency}, {item.duration}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Select Nearby Pharmacy
                    </label>
                    <div className="space-y-2">
                      {pharmacies.slice(0, 5).map((pharmacy) => (
                        <button
                          key={pharmacy._id}
                          onClick={() => handleOrderFromPrescription(prescription._id, pharmacy._id)}
                          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{pharmacy.name}</h4>
                              <p className="text-sm text-gray-600">{pharmacy.address}</p>
                            </div>
                            {pharmacy.distance !== undefined && (
                              <span className="text-sm font-semibold text-blue-900">
                                {pharmacy.distance.toFixed(1)} km
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

