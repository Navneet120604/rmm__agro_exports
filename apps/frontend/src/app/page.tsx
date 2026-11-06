'use client';

import React, { useState } from 'react';
import { CompanyProvider } from '../context/CompanyContext';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ExecutiveDashboard } from '../components/dashboard/ExecutiveDashboard';
import { CommercialInvoiceForm } from '../components/sales/CommercialInvoiceForm';
import { RegistersView } from '../components/reports/RegistersView';
import { DocumentHubChecklist } from '../components/documents/DocumentHubChecklist';
import type { NavigationSection } from '../types';

export default function Home() {
  const [currentSection, setCurrentSection] =
    useState<NavigationSection>('dashboard');

  return (
    <CompanyProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top ERP Header with Company Switcher */}
        <Header />

        {/* Main Workstation Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <Sidebar
            currentSection={currentSection}
            onSelectSection={setCurrentSection}
          />

          {/* Main Working Panel */}
          <main className="flex-1 p-6 overflow-y-auto bg-slate-950">
            {currentSection === 'dashboard' && (
              <ExecutiveDashboard onNavigate={setCurrentSection} />
            )}

            {(currentSection === 'commercial-invoices' ||
              currentSection === 'proformas') && <CommercialInvoiceForm />}

            {currentSection === 'registers' && <RegistersView />}

            {(currentSection === 'document-hub' ||
              currentSection === 'packing-lists') && <DocumentHubChecklist />}

            {currentSection !== 'dashboard' &&
              currentSection !== 'commercial-invoices' &&
              currentSection !== 'proformas' &&
              currentSection !== 'registers' &&
              currentSection !== 'document-hub' &&
              currentSection !== 'packing-lists' && (
                <div className="p-8 rounded-lg bg-slate-900 border border-slate-800 text-center space-y-3">
                  <h2 className="text-lg font-bold text-white capitalize">
                    {currentSection.replace('-', ' ')}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live database master data panel scoped to active company context.
                  </p>
                </div>
              )}
          </main>
        </div>
      </div>
    </CompanyProvider>
  );
}
