'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Truck, LogOut, User as UserIcon, Shield, Package, LayoutDashboard, Navigation } from 'lucide-react';
import { getStoredUser, clearAuthSession } from '../lib/auth';
import { IUser, UserRole } from '../types';

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<IUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    router.push('/login');
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <span>LastMile<span className="text-slate-900">Tracker</span></span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                {user.role === UserRole.CUSTOMER && (
                  <>
                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        pathname === '/dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/orders/new"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
                    >
                      <Package className="w-4 h-4" />
                      Book Shipment
                    </Link>
                  </>
                )}

                {user.role === UserRole.AGENT && (
                  <Link
                    href="/agent/dashboard"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                  >
                    <Navigation className="w-4 h-4" />
                    Agent Portal
                  </Link>
                )}

                {user.role === UserRole.ADMIN && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Operations
                  </Link>
                )}

                {/* User Dropdown / Role info */}
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : !isAuthPage ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                >
                  Register
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
};
