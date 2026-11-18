'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Camera, History, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show on login page
  if (pathname === '/login') return null;

  const navItems = [
    { label: 'Today', href: '/', icon: Flame },
    { label: 'Scan Meal', href: '/scan', icon: Camera, primary: true },
    { label: 'History', href: '/history', icon: History },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl px-3 py-2 flex items-center justify-around shadow-2xl shadow-black/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-6 group focus:outline-none"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30 group-active:scale-95 transition-transform duration-200">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 mt-1">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-colors duration-200 ${
                  isActive
                    ? 'text-emerald-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
