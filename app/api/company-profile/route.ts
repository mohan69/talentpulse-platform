export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_ID = "default";

export async function GET() {
  try {
    let profile = await prisma.companyProfile.findUnique({ where: { id: DEFAULT_ID } });
    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: {
          id: DEFAULT_ID,
          name: "CareerPaths India",
          brandName: "CareerPaths",
          website: "https://www.careerpathsindia.com/",
          email: "john.sagayaraj@careerpathsindia.com",
          phone: "+91 9972344773",
          tagline: "Connecting talent with opportunity",
          regAddress: "B-501, 5th Floor, B-Block, 124/1, ITPL Main Road, Kundalahalli, Bangalore - 560037",
          regCity: "Bangalore",
          regState: "Karnataka",
          regCountry: "India",
          branchAddress: "#187, AA Arcade, 3rd Floor, R.J. Garden, Outer Ring Road, Marathahalli, Bangalore - 560037",
          branchCity: "Bangalore",
          branchState: "Karnataka",
          branchCountry: "India",
        },
      });
    }
    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("GET /api/company-profile error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name, brandName, website, email, phone, tagline,
      regAddress, regCity, regState, regCountry,
      branchAddress, branchCity, branchState, branchCountry,
    } = body;

    const profile = await prisma.companyProfile.upsert({
      where: { id: DEFAULT_ID },
      update: {
        name, brandName, website, email, phone, tagline,
        regAddress, regCity, regState, regCountry,
        branchAddress, branchCity, branchState, branchCountry,
      },
      create: {
        id: DEFAULT_ID,
        name: name || "",
        brandName: brandName || "",
        website: website || "",
        email: email || "",
        phone: phone || "",
        tagline: tagline || "",
        regAddress: regAddress || "",
        regCity: regCity || "",
        regState: regState || "",
        regCountry: regCountry || "India",
        branchAddress: branchAddress || "",
        branchCity: branchCity || "",
        branchState: branchState || "",
        branchCountry: branchCountry || "India",
      },
    });

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("PUT /api/company-profile error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
