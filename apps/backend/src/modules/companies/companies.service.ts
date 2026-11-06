import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import {
  companies,
  type Company,
} from '../../database/schema/companies.js';
import { userCompanies } from '../../database/schema/user-companies.js';

// Pre-configured default companies for RMM Agro Exports organization
export const SEED_COMPANIES = [
  {
    code: 'RMM',
    name: 'RMM Agro Exports',
    legalName: 'RMM Agro Exports Private Limited',
    gstin: '06AAACR1234F1Z5',
    iecCode: '0512009876',
    addressLine1: 'Grain Market, Taraori',
    city: 'Karnal',
    state: 'Haryana',
    country: 'India',
    pincode: '132116',
    contactEmail: 'exports@rmmagro.com',
  },
  {
    code: 'PRAGATI',
    name: 'Pragati Rice Mills',
    legalName: 'Pragati Rice Mills LLP',
    gstin: '06AABCP5678G1Z2',
    iecCode: '0515004321',
    addressLine1: 'GT Road, Nilokheri',
    city: 'Karnal',
    state: 'Haryana',
    country: 'India',
    pincode: '132117',
    contactEmail: 'contact@pragatirice.com',
  },
  {
    code: 'DUDANI',
    name: 'Dudani Exports',
    legalName: 'Dudani Exports Pvt Ltd',
    gstin: '06AACCD9012H1Z9',
    iecCode: '0518001122',
    addressLine1: 'Industrial Area, Phase 2',
    city: 'Karnal',
    state: 'Haryana',
    country: 'India',
    pincode: '132001',
    contactEmail: 'info@dudaniexports.com',
  },
];

@Injectable()
export class CompaniesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCompaniesForUser(
    userId: string,
    role: string,
  ): Promise<Array<Pick<Company, 'id' | 'code' | 'name' | 'legalName'>>> {
    if (!this.databaseService.isConnected) {
      // Mock companies for offline/development fallback
      return SEED_COMPANIES.map((c, i) => ({
        id: `00000000-0000-0000-0000-00000000000${i + 1}`,
        code: c.code,
        name: c.name,
        legalName: c.legalName,
      }));
    }

    const db = this.databaseService.db;

    // Super Admin has access to all companies
    if (role === 'super_admin') {
      const allCompanies = await db
        .select({
          id: companies.id,
          code: companies.code,
          name: companies.name,
          legalName: companies.legalName,
        })
        .from(companies);

      return allCompanies;
    }

    // Regular users: query through user_companies junction table
    const assignments = await db
      .select({ companyId: userCompanies.companyId })
      .from(userCompanies)
      .where(eq(userCompanies.userId, userId));

    const companyIds = assignments.map((a) => a.companyId);
    if (companyIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: companies.id,
        code: companies.code,
        name: companies.name,
        legalName: companies.legalName,
      })
      .from(companies)
      .where(inArray(companies.id, companyIds));
  }

  async getCompanyById(companyId: string): Promise<Company> {
    if (!this.databaseService.isConnected) {
      const found =
        SEED_COMPANIES.find((c) => c.code === 'RMM') ?? SEED_COMPANIES[0];
      return {
        id: companyId,
        ...found,
        addressLine2: null,
        panNumber: null,
        lutNumber: 'AD060326001234X',
        adCode: '0290123',
        contactPhone: '+91-9896000000',
        logoPath: null,
        signaturePath: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const rows = await this.databaseService.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return rows[0];
  }
}
