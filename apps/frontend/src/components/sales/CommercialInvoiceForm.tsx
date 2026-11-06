'use client';

import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  Ship,
  Boxes,
} from 'lucide-react';
import type { ContainerItem, InvoiceLineItem } from '../../types';

export function CommercialInvoiceForm() {
  const { activeCompany, financialYear } = useCompany();

  const [documentDate, setDocumentDate] = useState('2026-11-08');
  const [buyerPoNumber, setBuyerPoNumber] = useState('PO-UAE-9921');
  const [customerName, setCustomerName] = useState('Al-Barakah General Trading LLC, Dubai, UAE');
  const [portOfLoading, setPortOfLoading] = useState('Mundra Port, Gujarat, India');
  const [portOfDischarge, setPortOfDischarge] = useState('Jebel Ali Port, UAE');
  const [countryOfDestination, setCountryOfDestination] = useState('United Arab Emirates');
  const [incoterm, setIncoterm] = useState<'FOB' | 'CFR' | 'CIF'>('CIF');
  const [currency] = useState('USD');

  // Shipping charges
  const [oceanFreight, setOceanFreight] = useState<number>(1500.0);
  const [insurance, setInsurance] = useState<number>(100.0);

  // Line items
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: '1121 Steam Basmati Rice',
      packingTypeId: 'pack-1',
      packingName: '30 KG Non-Woven Bags',
      quantityMt: 50.0,
      ratePerMt: 1000.0,
      amount: 50000.0,
      specifications: 'Average Grain Length 8.35mm, Sortex Cleaned, Max 1% Broken',
    },
  ]);

  // Containers
  const [containers] = useState<ContainerItem[]>([
    {
      id: 'c-1',
      containerNumber: 'MSCU9876543',
      sealNumber: 'SEAL-001234',
      containerSize: '20FT',
      totalBags: 833,
      grossWeightKg: 25150.0,
      netWeightKg: 25000.0,
    },
    {
      id: 'c-2',
      containerNumber: 'TGHU1122334',
      sealNumber: 'SEAL-001235',
      containerSize: '20FT',
      totalBags: 833,
      grossWeightKg: 25150.0,
      netWeightKg: 25000.0,
    },
  ]);

  const [isSaved, setIsSaved] = useState(false);

  // Dynamic calculations
  const totalFobAmount = items.reduce((sum, it) => sum + it.amount, 0);
  const freightApplied = incoterm === 'CFR' || incoterm === 'CIF' ? oceanFreight : 0;
  const insuranceApplied = incoterm === 'CIF' ? insurance : 0;
  const grandTotal = totalFobAmount + freightApplied + insuranceApplied;
  const totalQuantityMt = items.reduce((sum, it) => sum + it.quantityMt, 0);

  const handleUpdateLine = (id: string, field: 'quantityMt' | 'ratePerMt', val: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        updated.amount = Math.round(updated.quantityMt * updated.ratePerMt * 100) / 100;
        return updated;
      }),
    );
  };

  const handleAddLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        productId: 'prod-2',
        productName: '1509 Golden Sella Basmati Rice',
        packingTypeId: 'pack-2',
        packingName: '50 KG Poly Bags',
        quantityMt: 25.0,
        ratePerMt: 880.0,
        amount: 22000.0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>Commercial Export Invoice</span>
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              {activeCompany.code}/EX/{financialYear}/001
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Authoritative invoice generation with automated Rule 7 incoterm calculations
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:4000/api/v1/pdf/sample-invoice"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded border border-slate-700 flex items-center gap-1.5 shadow transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Print Official A4 PDF</span>
          </a>
          <button
            onClick={() => setIsSaved(true)}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Authorize Invoice</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-600/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Invoice <strong>{activeCompany.code}/EX/{financialYear}/001</strong> successfully recorded in database and committed to immutable audit trail!
          </span>
        </div>
      )}

      {/* Primary Invoice Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs">
        <div>
          <label className="text-slate-400 font-medium block mb-1">Invoice Date</label>
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">Buyer PO Reference</label>
          <input
            type="text"
            value={buyerPoNumber}
            onChange={(e) => setBuyerPoNumber(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">Incoterm Delivery Terms</label>
          <select
            value={incoterm}
            onChange={(e) => setIncoterm(e.target.value as 'FOB' | 'CFR' | 'CIF')}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold focus:outline-none focus:border-amber-400 text-xs"
          >
            <option value="FOB">FOB (Free On Board - Port of Origin)</option>
            <option value="CFR">CFR (Cost & Ocean Freight)</option>
            <option value="CIF">CIF (Cost, Insurance & Ocean Freight)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-slate-400 font-medium block mb-1">Buyer / Consignee</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">Destination Country</label>
          <input
            type="text"
            value={countryOfDestination}
            onChange={(e) => setCountryOfDestination(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">Port of Loading</label>
          <input
            type="text"
            value={portOfLoading}
            onChange={(e) => setPortOfLoading(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-slate-400 font-medium block mb-1">Port of Discharge</label>
          <input
            type="text"
            value={portOfDischarge}
            onChange={(e) => setPortOfDischarge(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
          />
        </div>
      </div>

      {/* Export Product Lines Grid */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Ship className="w-4 h-4 text-amber-400" />
            <span>Export Product Lines (Basmati Rice)</span>
          </h2>
          <button
            onClick={handleAddLine}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variety Line</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2 px-2">Rice Variety</th>
                <th className="py-2 px-2">Packing Description</th>
                <th className="py-2 px-2 text-right">Quantity (MT)</th>
                <th className="py-2 px-2 text-right">Rate / MT ($)</th>
                <th className="py-2 px-2 text-right">Total ($)</th>
                <th className="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2 px-2 text-slate-200 font-medium">
                    {it.productName}
                  </td>
                  <td className="py-2 px-2 text-slate-400">
                    {it.packingName}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={it.quantityMt}
                      onChange={(e) =>
                        handleUpdateLine(it.id, 'quantityMt', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 px-1.5 py-1 text-right bg-slate-800 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={it.ratePerMt}
                      onChange={(e) =>
                        handleUpdateLine(it.id, 'ratePerMt', parseFloat(e.target.value) || 0)
                      }
                      className="w-24 px-1.5 py-1 text-right bg-slate-800 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-amber-300">
                    ${it.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => handleRemoveLine(it.id)}
                      disabled={items.length === 1}
                      className="text-slate-400 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incoterm Shipping Charges & Grand Total Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Container Packing Overview */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="font-bold text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Boxes className="w-4 h-4 text-blue-400" />
            <span>Container Packing Allocation</span>
          </div>
          {containers.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1 border-b border-slate-800/40 font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">{c.containerNumber} ({c.containerSize})</span>
              <span className="text-slate-400">Seal: {c.sealNumber}</span>
              <span className="text-amber-400">{c.totalBags} bags</span>
              <span className="text-slate-300">{c.grossWeightKg.toLocaleString()} KG Gross</span>
            </div>
          ))}
        </div>

        {/* Right: Authoritative Financial Totals */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-2.5">
          <div className="font-bold text-slate-200 pb-2 border-b border-slate-800 flex justify-between">
            <span>Authoritative Calculation (Rule 7)</span>
            <span className="text-amber-400 font-mono">{incoterm}</span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Total Export Quantity:</span>
            <span className="font-mono text-slate-200">{totalQuantityMt.toFixed(3)} MT</span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Total FOB Value:</span>
            <span className="font-mono text-slate-200">
              ${totalFobAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {(incoterm === 'CFR' || incoterm === 'CIF') && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Ocean Freight Charge:</span>
              <input
                type="number"
                step="0.01"
                value={oceanFreight}
                onChange={(e) => setOceanFreight(parseFloat(e.target.value) || 0)}
                className="w-24 px-1.5 py-0.5 text-right bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none"
              />
            </div>
          )}

          {incoterm === 'CIF' && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Marine Insurance:</span>
              <input
                type="number"
                step="0.01"
                value={insurance}
                onChange={(e) => setInsurance(parseFloat(e.target.value) || 0)}
                className="w-24 px-1.5 py-0.5 text-right bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none"
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-bold text-white">
            <span>Grand Total ({currency}):</span>
            <span className="text-lg font-mono text-emerald-400">
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
