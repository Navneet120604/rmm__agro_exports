'use client';

import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import {
  FolderCheck,
  CheckCircle,
  Clock,
  ShieldCheck,
  Building,
  Layers,
} from 'lucide-react';

interface DocumentChecklistItem {
  id: string;
  type: string;
  title: string;
  classification: 'GENERATED' | 'COLLECTED';
  isVerified: boolean;
  status: 'PENDING' | 'DRAFTED' | 'COLLECTED' | 'VERIFIED';
  notes: string;
}

export function DocumentHubChecklist() {
  const { activeCompany, financialYear } = useCompany();

  const [items, setItems] = useState<DocumentChecklistItem[]>([
    {
      id: 'doc-1',
      type: 'COMMERCIAL_INVOICE',
      title: 'Commercial Export Invoice (Quadruplicate)',
      classification: 'GENERATED',
      isVerified: true,
      status: 'VERIFIED',
      notes: 'Signed and stamped with official company seal',
    },
    {
      id: 'doc-2',
      type: 'PACKING_LIST',
      title: 'Customs Packing List',
      classification: 'GENERATED',
      isVerified: true,
      status: 'VERIFIED',
      notes: 'Detailed container & seal numbers with gross/net weights',
    },
    {
      id: 'doc-3',
      type: 'CERT_ORIGIN',
      title: 'Certificate of Origin (Non-Preferential)',
      classification: 'GENERATED',
      isVerified: true,
      status: 'VERIFIED',
      notes: 'Issued by Chamber of Commerce & Industry',
    },
    {
      id: 'doc-4',
      type: 'BILL_OF_EXCHANGE',
      title: 'Bill of Exchange / Financial Draft',
      classification: 'GENERATED',
      isVerified: true,
      status: 'VERIFIED',
      notes: 'Drawn under LC at sight on Emirates NBD Bank',
    },
    {
      id: 'doc-5',
      type: 'BENEFICIARY_CERT',
      title: 'Beneficiary Certificate',
      classification: 'GENERATED',
      isVerified: true,
      status: 'VERIFIED',
      notes: 'Certifying non-negotiable copy dispatched via DHL',
    },
    {
      id: 'doc-6',
      type: 'BILL_OF_LADING',
      title: 'Clean On Board Marine Ocean Bill of Lading',
      classification: 'COLLECTED',
      isVerified: true,
      status: 'VERIFIED',
      notes: '3/3 original bills of lading issued by Maersk Line',
    },
    {
      id: 'doc-7',
      type: 'INSURANCE_CERT',
      title: 'Marine Cargo Insurance Policy',
      classification: 'COLLECTED',
      isVerified: true,
      status: 'VERIFIED',
      notes: 'Institute Cargo Clauses (A) 110% of CIF value',
    },
    {
      id: 'doc-8',
      type: 'PHYTOSANITARY_CERT',
      title: 'Plant Quarantine Phytosanitary Certificate',
      classification: 'COLLECTED',
      isVerified: false,
      status: 'PENDING',
      notes: 'Awaiting port quarantine clearance at Mundra',
    },
    {
      id: 'doc-9',
      type: 'INSPECTION_CERT',
      title: 'SGS Pre-Shipment Weight & Quality Survey',
      classification: 'COLLECTED',
      isVerified: false,
      status: 'PENDING',
      notes: 'Surveyor final report pending moisture test result',
    },
  ]);

  const verifiedCount = items.filter((i) => i.isVerified).length;
  const progressPercent = Math.round((verifiedCount / items.length) * 100);

  const toggleVerify = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const newVerified = !i.isVerified;
        return {
          ...i,
          isVerified: newVerified,
          status: newVerified ? 'VERIFIED' : 'PENDING',
        };
      }),
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Order & LC Header Card */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white flex items-center gap-2">
                <FolderCheck className="w-5 h-5 text-amber-400" />
                <span>Export Document Hub & Checklist</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                ORD-{activeCompany.code}/{financialYear}/001
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              500.00 MT Basmati Rice • Split into 3 Shipment Lots
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              <span>LC: LC-EMIRATES-889900</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Issuing Bank: Emirates NBD PJSC, Dubai
            </div>
          </div>
        </div>

        {/* Readiness Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Export Negotiation Readiness</span>
            </span>
            <span className="font-mono font-bold text-amber-300">
              {verifiedCount} of {items.length} Documents Verified ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Shipment Lots Quick Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="font-bold text-slate-200">Lot #1 (200.0 MT)</div>
              <div className="text-[10px] text-slate-400">Invoice: {activeCompany.code}/EX/{financialYear}/001</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">INVOICED</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="font-bold text-slate-200">Lot #2 (150.0 MT)</div>
              <div className="text-[10px] text-slate-400">Dispatching to Mundra</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">DISPATCHED</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="font-bold text-slate-200">Lot #3 (150.0 MT)</div>
              <div className="text-[10px] text-slate-400">Milling at Karnal Mill</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">PLANNED</span>
          </div>
        </div>
      </div>

      {/* 9-Point Document Checklist Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Document Set Checklist for Negotiation</span>
          </h2>
          <span className="text-xs text-slate-400">
            Click checkbox to toggle verification audit
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {items.map((doc) => (
            <div
              key={doc.id}
              onClick={() => toggleVerify(doc.id)}
              className="py-3 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-800/30 px-2 rounded transition-colors"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={doc.isVerified}
                  onChange={() => toggleVerify(doc.id)}
                  className="mt-1 h-4 w-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        doc.isVerified ? 'text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {doc.title}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        doc.classification === 'GENERATED'
                          ? 'bg-blue-900/40 text-blue-300 border border-blue-700/30'
                          : 'bg-purple-900/40 text-purple-300 border border-purple-700/30'
                      }`}
                    >
                      {doc.classification}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {doc.notes}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {doc.isVerified ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>PENDING</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
