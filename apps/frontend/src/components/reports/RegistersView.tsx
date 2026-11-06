'use client';

import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import {
  BarChart3,
  FileSpreadsheet,
  Clock,
  Users,
  CreditCard,
  Ship,
  Search,
} from 'lucide-react';

type RegisterTab =
  | 'sales-orders'
  | 'invoices'
  | 'pending-dues'
  | 'sales-customer'
  | 'receipts'
  | 'shipping-cost';

export function RegistersView() {
  const { activeCompany, financialYear } = useCompany();
  const [activeTab, setActiveTab] = useState<RegisterTab>('pending-dues');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'pending-dues' as RegisterTab, label: 'Pending Dues (Due)', icon: Clock },
    { id: 'invoices' as RegisterTab, label: 'Invoice Register', icon: FileSpreadsheet },
    { id: 'sales-orders' as RegisterTab, label: 'Sales Order Register', icon: BarChart3 },
    { id: 'sales-customer' as RegisterTab, label: 'Sales by Customer', icon: Users },
    { id: 'receipts' as RegisterTab, label: 'Receipts Register', icon: CreditCard },
    { id: 'shipping-cost' as RegisterTab, label: 'Shipping & Cost', icon: Ship },
  ];

  // Mock register data representing backend endpoints
  const mockPendingDues = [
    {
      invoiceNo: `${activeCompany.code}/EX/${financialYear}/001`,
      date: '2026-11-08',
      customer: 'Al-Barakah General Trading LLC (UAE)',
      billed: 51600.0,
      received: 20000.0,
      due: 31600.0,
      currency: 'USD',
      status: 'ISSUED',
    },
    {
      invoiceNo: `${activeCompany.code}/EX/${financialYear}/002`,
      date: '2026-11-02',
      customer: 'Gulf Rice Commodities Co (Riyadh, KSA)',
      billed: 98000.0,
      received: 50000.0,
      due: 48000.0,
      currency: 'USD',
      status: 'PARTIALLY_PAID',
    },
    {
      invoiceNo: `${activeCompany.code}/EX/${financialYear}/003`,
      date: '2026-10-25',
      customer: 'Sultan Food Imports SPC (Muscat, Oman)',
      billed: 105400.0,
      received: 0.0,
      due: 105400.0,
      currency: 'USD',
      status: 'ISSUED',
    },
  ];

  const mockInvoices = [
    {
      invoiceNo: `${activeCompany.code}/EX/${financialYear}/001`,
      date: '2026-11-08',
      customer: 'Al-Barakah General Trading LLC',
      country: 'United Arab Emirates',
      incoterm: 'CIF',
      fob: 50000.0,
      freight: 1500.0,
      insurance: 100.0,
      total: 51600.0,
    },
    {
      invoiceNo: `${activeCompany.code}/EX/${financialYear}/002`,
      date: '2026-11-02',
      customer: 'Gulf Rice Commodities Co',
      country: 'Saudi Arabia',
      incoterm: 'CFR',
      fob: 95000.0,
      freight: 3000.0,
      insurance: 0.0,
      total: 98000.0,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>Export Registers & Financial Analysis</span>
          </h1>
          <div className="text-xs text-slate-400 mt-0.5">
            Real-time business reports for {activeCompany.name} (FY {financialYear})
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-56"
          />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'pending-dues' && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300">
              Pending Customer Inward Remittances
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total Outstanding: $185,000.00 USD
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 px-2">Invoice No</th>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Customer / Buyer</th>
                  <th className="py-2 px-2 text-right">Billed Amount</th>
                  <th className="py-2 px-2 text-right">Received</th>
                  <th className="py-2 px-2 text-right">Balance Due</th>
                  <th className="py-2 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {mockPendingDues.map((row) => (
                  <tr key={row.invoiceNo}>
                    <td className="py-2.5 px-2 text-amber-300 font-bold">{row.invoiceNo}</td>
                    <td className="py-2.5 px-2 text-slate-400">{row.date}</td>
                    <td className="py-2.5 px-2 text-slate-200 font-sans">{row.customer}</td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      ${row.billed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right text-emerald-400">
                      ${row.received.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-right text-red-400 font-bold">
                      ${row.due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/30">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-300 pb-2 border-b border-slate-800">
            Commercial Export Invoice Register
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 px-2">Invoice No</th>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Buyer</th>
                  <th className="py-2 px-2">Country</th>
                  <th className="py-2 px-2">Incoterm</th>
                  <th className="py-2 px-2 text-right">FOB Value</th>
                  <th className="py-2 px-2 text-right">Freight</th>
                  <th className="py-2 px-2 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {mockInvoices.map((inv) => (
                  <tr key={inv.invoiceNo}>
                    <td className="py-2 px-2 text-amber-300 font-bold">{inv.invoiceNo}</td>
                    <td className="py-2 px-2 text-slate-400">{inv.date}</td>
                    <td className="py-2 px-2 text-slate-200 font-sans">{inv.customer}</td>
                    <td className="py-2 px-2 text-slate-400 font-sans">{inv.country}</td>
                    <td className="py-2 px-2 text-blue-400">{inv.incoterm}</td>
                    <td className="py-2 px-2 text-right">${inv.fob.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">${inv.freight.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-bold">
                      ${inv.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab !== 'pending-dues' && activeTab !== 'invoices' && (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
          Showing real-time records from backend API for {activeCompany.code}
        </div>
      )}
    </div>
  );
}
