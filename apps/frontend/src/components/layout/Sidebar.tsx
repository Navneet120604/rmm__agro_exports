'use client';

import React from 'react';
import type { NavigationSection } from '../../types';
import {
  LayoutDashboard,
  FileText,
  Factory,
  Receipt,
  Boxes,
  FolderCheck,
  CreditCard,
  Users,
  Wheat,
  Truck,
  BarChart3,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
}

export function Sidebar({ currentSection, onSelectSection }: SidebarProps) {
  const navGroups = [
    {
      title: 'SALES & EXPORT',
      items: [
        { id: 'dashboard' as NavigationSection, label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'proformas' as NavigationSection, label: 'Proforma Invoices', icon: FileText },
        { id: 'production-orders' as NavigationSection, label: 'Production Orders (Mills)', icon: Factory },
        { id: 'commercial-invoices' as NavigationSection, label: 'Commercial Invoices', icon: Receipt },
        { id: 'packing-lists' as NavigationSection, label: 'Packing Lists & Containers', icon: Boxes },
        { id: 'document-hub' as NavigationSection, label: 'Shipment Lots & Hub', icon: FolderCheck },
        { id: 'receipts' as NavigationSection, label: 'Payment Receipts', icon: CreditCard },
      ],
    },
    {
      title: 'MASTER DATA',
      items: [
        { id: 'customers' as NavigationSection, label: 'Customers (Buyers)', icon: Users },
        { id: 'products' as NavigationSection, label: 'Basmati Varieties', icon: Wheat },
        { id: 'suppliers' as NavigationSection, label: 'Rice Mill Suppliers', icon: Truck },
      ],
    },
    {
      title: 'ANALYSIS & AUDIT',
      items: [
        { id: 'registers' as NavigationSection, label: 'Export Registers (6)', icon: BarChart3 },
        { id: 'settings' as NavigationSection, label: 'Companies & Audit Log', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] select-none">
      <div className="flex-1 py-3 px-2 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 tracking-wider font-mono">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors text-left ${
                      isActive
                        ? 'bg-amber-600/20 text-amber-300 font-semibold border-l-2 border-amber-400 pl-2'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400">
        <div>ExportFly Web v0.1.0</div>
        <div className="text-slate-400">RMM Agro Exports Ltd</div>
      </div>
    </aside>
  );
}
