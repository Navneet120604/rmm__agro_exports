'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Company } from '../types';

export const SISTER_COMPANIES: Company[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'RMM Agro Exports',
    code: 'RMM',
    gstin: '06AABCR1234F1Z5',
    iec: '0505012345',
    address: 'Export House, Taraori - 132116, Karnal, Haryana, India',
    currency: 'USD',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Pragati Agro Exports',
    code: 'PRAGATI',
    gstin: '06AABCP5678F1Z2',
    iec: '0505056789',
    address: 'G.T. Road, Karnal - 132001, Haryana, India',
    currency: 'USD',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Dudani Agro Exports',
    code: 'DUDANI',
    gstin: '06AABCD9012F1Z9',
    iec: '0505090123',
    address: 'Near Grain Market, Nissing, Karnal, Haryana, India',
    currency: 'USD',
  },
];

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company;
  financialYear: string;
  switchCompany: (companyId: string) => void;
  currentUser: {
    username: string;
    role: string;
  };
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [activeCompany, setActiveCompany] = useState<Company>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('exportfly_active_company_id');
      if (saved) {
        const found = SISTER_COMPANIES.find((c) => c.id === saved);
        if (found) return found;
      }
    }
    return SISTER_COMPANIES[0]!;
  });
  const [financialYear] = useState<string>('26-27');

  const switchCompany = (companyId: string) => {
    const found = SISTER_COMPANIES.find((c) => c.id === companyId);
    if (found) {
      setActiveCompany(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('exportfly_active_company_id', companyId);
      }
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies: SISTER_COMPANIES,
        activeCompany,
        financialYear,
        switchCompany,
        currentUser: {
          username: 'Navneet Kumar',
          role: 'Super Admin',
        },
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
