import React from 'react';
import Link from 'next/link';
// TODO: Add Admin specific navigation components (e.g., Sidebar)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar /> */}
      <aside className="w-64 bg-secondary-800 text-secondary-100 p-4">
        <h2 className="text-xl font-semibold mb-4">Admin Menu</h2>
        <nav>
          <ul>
            <li className="mb-2"><Link href="/admin/dashboard" className="hover:text-primary-300">Dashboard</Link></li>
            <li className="mb-2"><Link href="/admin/gyms" className="hover:text-primary-300">Gyms</Link></li>
            <li className="mb-2"><Link href="/admin/locations" className="hover:text-primary-300">Locations</Link></li>
            <li className="mb-2"><Link href="/admin/memberships/plans" className="hover:text-primary-300">Membership Plans</Link></li>
            <li className="mb-2"><Link href="/admin/instructors" className="hover:text-primary-300">Instructors</Link></li>
            <li className="mb-2"><Link href="/admin/ranks" className="hover:text-primary-300">Ranks</Link></li>
            <li className="mb-2"><Link href="/admin/class-types" className="hover:text-primary-300">Class Types</Link></li>
            <li className="mb-2"><Link href="/admin/schedule" className="hover:text-primary-300">Schedule</Link></li>
            <li className="mb-2"><Link href="/admin/members" className="hover:text-primary-300">Members</Link></li>
            <li className="mb-2"><Link href="/admin/settings" className="hover:text-primary-300">Settings</Link></li>
            
            {/* Attendance Section */}
            <li className="mt-4 mb-2 font-medium text-secondary-300">Attendance</li>
            <li className="mb-2 pl-2"><Link href="/admin/attendance" className="hover:text-primary-300">Check-in History</Link></li>
            <li className="mb-2 pl-2"><Link href="/admin/attendance/classes" className="hover:text-primary-300">Class Attendance</Link></li>
            <li className="mb-2 pl-2"><Link href="/admin/attendance/analytics" className="hover:text-primary-300">Analytics</Link></li>
            
            {/* Finance Section */}
            <li className="mt-4 mb-2 font-medium text-secondary-300">Finance</li>
            <li className="mb-2 pl-2"><Link href="/admin/finance" className="hover:text-primary-300">Overview</Link></li>
            <li className="mb-2 pl-2"><Link href="/admin/finance/payments" className="hover:text-primary-300">Payments</Link></li>
            <li className="mb-2 pl-2"><Link href="/admin/finance/subscriptions" className="hover:text-primary-300">Subscriptions</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-secondary-100">
        {children}
      </main>
    </div>
  );
} 