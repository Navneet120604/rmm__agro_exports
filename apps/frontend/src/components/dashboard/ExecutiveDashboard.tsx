'use client';

import React from 'react';
import { useCompany } from '../../context/CompanyContext';
import {
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Ship,
  FilePlus2,
  FileCheck2,
  Receipt,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import type { NavigationSection } from '../../types';

interface DashboardProps {
  onNavigate: (section: NavigationSection) => void;
}

export function ExecutiveDashboard({ onNavigate }: DashboardProps) {
  const { activeCompany, financialYear } = useCompany();

  const kpis = [
    {
      title: 'TOTAL EXPORT VOLUME',
      value: '1,250.00 MT',
      subtext: `Basmati Rice FY ${financialYear}`,
      icon: Ship,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-800/40',
    },
    {
      title: 'EXPORT REVENUE (USD)',
      value: '$1,285,000.00',
      subtext: 'CIF & CFR Invoiced Sales',
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-800/40',
    },
    {
      title: 'OUTSTANDING PAYMENT DUES',
      value: '$185,000.00',
      subtext: '4 Invoices Pending Remittance',
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-800/40',
    },
    {
      title: 'ACTIVE ORDERS & LOTS',
      value: '6 Orders / 14 Lots',
      subtext: '3 Milling Jobs In Progress',
      icon: TrendingUp,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/40 border-indigo-800/40',
    },
  ];

  const recentActivities = [
    {
      id: '1',
      action: 'GENERATED_INVOICE',
      doc: `${activeCompany.code}/EX/${financialYear}/001`,
      details: 'Commercial Invoice for Al-Barakah General Trading (50.0 MT - $51,600.00 CIF)',
      user: 'Navneet Kumar',
      time: '12 mins ago',
    },
    {
      id: '2',
      action: 'RECORDED_RECEIPT',
      doc: `REC-${activeCompany.code}/${financialYear}/001`,
      details: 'Remittance $51,600.00 via WIRE_TRANSFER (Swift: SWIFT-998877)',
      user: 'Navneet Kumar',
      time: '45 mins ago',
    },
    {
      id: '3',
      action: 'PRODUCTION_ORDER',
      doc: `${activeCompany.code}/1`,
      details: 'Dispatched milling instructions to Karnal Rice Mill Ltd (100.0 MT 1121 Steam)',
      user: 'Navneet Kumar',
      time: '2 hours ago',
    },
    {
      id: '4',
      action: 'VERIFIED_DOCUMENT',
      doc: 'Clean On Board Bill of Lading (MSCU9876543)',
      details: 'Maersk Line B/L verified and filed in Document Hub',
      user: 'Navneet Kumar',
      time: '3 hours ago',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Active Entity Banner */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            Active Exporting Company Context
          </div>
          <h1 className="text-xl font-bold text-white mt-0.5">
            {activeCompany.name}
          </h1>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
            <span>GSTIN: {activeCompany.gstin}</span>
            <span>IEC: {activeCompany.iec}</span>
            <span>Origin: Mundra / Kandla, India</span>
            <span>Default Currency: {activeCompany.currency}</span>
          </div>
        </div>

        {/* Quick Document Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('commercial-invoices')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New Commercial Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('proformas')}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded border border-slate-600 flex items-center gap-1.5 transition-colors"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Issue Proforma</span>
          </button>
          <button
            onClick={() => onNavigate('receipts')}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded border border-slate-600 flex items-center gap-1.5 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Record Receipt</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className={`p-4 rounded-lg border ${kpi.bgColor} shadow-sm flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 font-mono">
                  {kpi.title}
                </span>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {kpi.value}
                </div>
                <div className="text-xs text-slate-400">{kpi.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-Column: Recent Audit Stream & Export Lifecycle Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Trail */}
        <div className="lg:col-span-2 rounded-lg bg-slate-900 border border-slate-800 p-4 shadow">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Immutable Activity Trail & Document Log</span>
            </h2>
            <button
              onClick={() => onNavigate('registers')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>View All Registers</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 mt-2">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {act.doc}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {act.action}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {act.details}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    User: {act.user}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono shrink-0">
                  {act.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Export Workflow Pipeline */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 shadow flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-800">
              Export Lifecycle Pipeline
            </h2>
            <div className="space-y-3 mt-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">1. Proforma Invoice (PI)</div>
                  <div className="text-[11px] text-slate-400">Buyer PO & frozen commercial terms quotation</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">2. Production Order (PO)</div>
                  <div className="text-[11px] text-slate-400">Strict remaining-quantity check for Rice Mill</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">3. Commercial Export Invoice</div>
                  <div className="text-[11px] text-slate-400">FOB, Freight & Insurance Incoterm rules applied</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">4. Container Packing List</div>
                  <div className="text-[11px] text-slate-400">Customs seals, container numbers & gross weights</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">5. Bank Remittance Receipt</div>
                  <div className="text-[11px] text-slate-400">LC negotiation & wire transfer tracking</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 mt-4 text-[11px] text-slate-400">
            Multi-Company Isolated • Concurrency Safe
          </div>
        </div>
      </div>
    </div>
  );
}
