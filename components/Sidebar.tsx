"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  DashboardIcon,
  AppointmentsIcon,
  OrdersIcon,
  TranscriptsIcon,
  InvoicesIcon,
  RecordsIcon,
  NewsIcon,
} from "./icons";
import MedicalStoreIcon from "./MedicalStoreIcon";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: DashboardIcon,
    description: "Overview and quick actions",
  },
  {
    name: "Appointments",
    href: "/appointments",
    icon: AppointmentsIcon,
    description: "Book and manage appointments",
  },
  {
    name: "Medical Store",
    href: "/medical-store",
    icon: MedicalStoreIcon,
    description: "Buy medicines and health products",
  },
  {
    name: "Orders",
    href: "/orders",
    icon: OrdersIcon,
    description: "Medicine orders and tracking",
  },
  {
    name: "Transcripts",
    href: "/transcripts",
    icon: TranscriptsIcon,
    description: "Consultation transcripts",
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: InvoicesIcon,
    description: "Bills and invoices",
  },
  {
    name: "Records",
    href: "/records",
    icon: RecordsIcon,
    description: "Prescription records with templates",
  },
  {
    name: "Notifications",
    href: "/news",
    icon: NewsIcon,
    description: "notifications",
  },
];

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          w-64 bg-white border-r border-gray-200 shadow-lg lg:shadow-sm
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <span className="text-xl text-white font-bold">P</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-[100%]">Patient Portal</h2>
              <p className="text-xs text-gray-600 leading-[100%] mt-0.5">Healthcare Management</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 hover:text-blue-900"
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full"></div>
                  )}
                  <div className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-blue-600" : "text-gray-600"}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm leading-[100%] ${isActive ? "text-blue-900" : "text-gray-900"}`}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-[100%] line-clamp-1">
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center leading-[100%]">
              © 2024 Patient Portal
            </p>
            <p className="text-xs text-gray-400 text-center leading-[100%] mt-1">
              All rights reserved
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

