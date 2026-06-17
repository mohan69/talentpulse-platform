import { prisma } from "@/lib/db";
import { tenantPrisma } from "@/lib/repositories";

/**
 * CareerPaths India — Hardcoded fallback.
 * Prefer getCompanyProfile() for live data from DB.
 */
export const COMPANY = {
  name: "CareerPaths India",
  brandName: "CareerPaths",
  website: "https://www.careerpathsindia.com/",
  email: "john.sagayaraj@careerpathsindia.com",
  phone: "+91 9972344773",
  registeredOffice: {
    address: "B-501, 5th Floor, B-Block, 124/1, ITPL Main Road, Kundalahalli, Bangalore - 560037",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
  },
  branchOffice: {
    address: "#187, AA Arcade, 3rd Floor, R.J. Garden, Outer Ring Road, Marathahalli, Bangalore - 560037",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
  },
  tagline: "Connecting talent with opportunity",
} as const;

/**
 * Reads company profile from DB.  Falls back to hardcoded COMPANY const.
 */
export async function getCompanyProfile() {
  try {
    const row = await tenantPrisma.companyProfile.findUnique({ where: { id: "default" } });
    if (!row) return COMPANY;
    return {
      name: row.name || COMPANY.name,
      brandName: row.brandName || COMPANY.brandName,
      website: row.website || COMPANY.website,
      email: row.email || COMPANY.email,
      phone: row.phone || COMPANY.phone,
      tagline: row.tagline || COMPANY.tagline,
      registeredOffice: {
        address: row.regAddress || COMPANY.registeredOffice.address,
        city: row.regCity || COMPANY.registeredOffice.city,
        state: row.regState || COMPANY.registeredOffice.state,
        country: row.regCountry || COMPANY.registeredOffice.country,
      },
      branchOffice: {
        address: row.branchAddress || COMPANY.branchOffice.address,
        city: row.branchCity || COMPANY.branchOffice.city,
        state: row.branchState || COMPANY.branchOffice.state,
        country: row.branchCountry || COMPANY.branchOffice.country,
      },
    };
  } catch (err) {
    console.error("getCompanyProfile error, using fallback:", err);
    return COMPANY;
  }
}
