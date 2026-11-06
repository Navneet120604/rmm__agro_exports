'use client';

import React from 'react';
import { useCompany } from '../../context/CompanyContext';
import { Building2, ChevronDown, ShieldCheck, Wifi, UserCheck } from 'lucide-react';

export function Header() {
  const { companies, activeCompany, financialYear, switchCompany, currentUser } =
    useCompany();

  return (
    <header className="h-14 border-b border-slate-700 bg-slate-900 text-slate-100 flex items-center justify-between px-4 sticky top-0 z-50 shadow-md">
      {/* Brand & Sister Company Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-amber-600 flex items-center justify-center font-bold text-white shadow">
            EF
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide flex items-center gap-1.5">
              <span>EXPORTFLY WEB</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                ENTERPRISE
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Basmati Rice Export ERP
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-5 w-px bg-slate-700 mx-1" />

        {/* Company Switcher Dropdown */}
        <div className="relative flex items-center">
          <Building2 className="w-4 h-4 text-amber-400 absolute left-2.5 pointer-events-none" />
          <select
            aria-label="Active Exporting Entity"
            value={activeCompany.id}
            onChange={(e) => switchCompany(e.target.value)}
            className="pl-8 pr-7 py-1 text-xs font-semibold rounded bg-slate-800 border border-slate-600 text-amber-300 hover:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer appearance-none transition-colors"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
        </div>
      </div>

      {/* Center status badges */}
      <div className="hidden md:flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
          <span className="text-slate-400">FY:</span>
          <span className="text-emerald-400 font-bold">{financialYear}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-[11px]">
          <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Office LAN • Online</span>
        </div>
      </div>

      {/* Right User & Security Info */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-end gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentUser.username}</span>
          </div>
          <div className="text-[10px] text-amber-400 font-mono flex items-center justify-end gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>{currentUser.role}</span>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-indigo-400/30 shadow">
          NK
        </div>
      </div>
    </header>
  );
}
