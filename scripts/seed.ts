import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// 1. Manually load environment variables from .env / .env.local if not already set
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            // Strip surrounding quotes
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

import User from "../models/User";
import WasteListing from "../models/WasteListing";
import Contract from "../models/Contract";
import GreenCredit from "../models/GreenCredit";
import ReliabilityScore from "../models/ReliabilityScore";
import ImpactCertificate from "../models/ImpactCertificate";
import Dispute from "../models/Dispute";
import Notification from "../models/Notification";

const DEMO_EMAIL_DOMAIN = "@demo.ciirs.org";

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error(
      "❌ Error: MONGODB_URI is not defined in your environment or .env file."
    );
    process.exit(1);
  }

  console.log("🌱 Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB successfully.");

  const defaultPassword = "Password@123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // -------------------------------------------------------------
  // Clean up previous demo data (only accounts with @demo.ciirs.org)
  // -------------------------------------------------------------
  console.log("🧹 Cleaning up existing demo accounts and associated data...");
  const existingDemoUsers = await User.find({
    email: { $regex: `${DEMO_EMAIL_DOMAIN}$`, $options: "i" },
  });
  const demoUserIds = existingDemoUsers.map((u) => u._id);

  if (demoUserIds.length > 0) {
    const existingDemoListings = await WasteListing.find({
      supplierId: { $in: demoUserIds },
    });
    const demoListingIds = existingDemoListings.map((l) => l._id);

    const existingDemoContracts = await Contract.find({
      $or: [
        { supplierId: { $in: demoUserIds } },
        { startupId: { $in: demoUserIds } },
        { listingId: { $in: demoListingIds } },
      ],
    });
    const demoContractIds = existingDemoContracts.map((c) => c._id);

    await Promise.all([
      ImpactCertificate.deleteMany({
        $or: [{ userId: { $in: demoUserIds } }, { contractId: { $in: demoContractIds } }],
      }),
      GreenCredit.deleteMany({
        $or: [{ userId: { $in: demoUserIds } }, { contractId: { $in: demoContractIds } }],
      }),
      Dispute.deleteMany({
        $or: [{ raisedBy: { $in: demoUserIds } }, { contractId: { $in: demoContractIds } }],
      }),
      Notification.deleteMany({ userId: { $in: demoUserIds } }),
      ReliabilityScore.deleteMany({ userId: { $in: demoUserIds } }),
      Contract.deleteMany({ _id: { $in: demoContractIds } }),
      WasteListing.deleteMany({ _id: { $in: demoListingIds } }),
      User.deleteMany({ _id: { $in: demoUserIds } }),
    ]);
    console.log(
      `🗑️ Removed ${demoUserIds.length} existing demo users and their related records.`
    );
  }

  // -------------------------------------------------------------
  // 1. Insert 5 Supplier Users
  // -------------------------------------------------------------
  console.log("📦 Creating 5 demo suppliers (temples, apartments, restaurant, factory)...");

  const supplierData = [
    {
      name: "Ramesh Sharma (Trustee)",
      email: `meenakshi.temple${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "supplier" as const,
      organizationName: "Sri Meenakshi Temple Trust",
      organizationType: "temple" as const,
      phone: "+91 98450 11223",
      address: "East Gate Road, Madurai, Tamil Nadu 625001",
      location: { type: "Point" as const, coordinates: [78.1198, 9.9195] as [number, number] },
      greenCreditBalance: 480,
    },
    {
      name: "Deepa Krishnan (RWA President)",
      email: `prestige.oasis${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "supplier" as const,
      organizationName: "Prestige Oasis Eco-Community",
      organizationType: "apartment" as const,
      phone: "+91 99001 44556",
      address: "Sarjapur-Marathahalli Ring Road, Bellandur, Bengaluru 560103",
      location: { type: "Point" as const, coordinates: [77.6784, 12.9279] as [number, number] },
      greenCreditBalance: 320,
    },
    {
      name: "Chef Ananth Raman",
      email: `saravana.kitchens${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "supplier" as const,
      organizationName: "Saravana Grand Central Kitchens",
      organizationType: "restaurant" as const,
      phone: "+91 94440 77889",
      address: "148 GST Road, Guindy, Chennai, Tamil Nadu 600032",
      location: { type: "Point" as const, coordinates: [80.2091, 13.0067] as [number, number] },
      greenCreditBalance: 210,
    },
    {
      name: "Vikram Malhotra (Operations Head)",
      email: `sundaram.auto${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "supplier" as const,
      organizationName: "Sundaram Precision Polymer & Auto Parts",
      organizationType: "factory" as const,
      phone: "+91 97890 33445",
      address: "Plot 42, SIPCOT Industrial Park Phase II, Hosur, Tamil Nadu 635130",
      location: { type: "Point" as const, coordinates: [77.8253, 12.7409] as [number, number] },
      greenCreditBalance: 750,
    },
    {
      name: "Suresh Deshmukh (Secretary)",
      email: `siddhivinayak.temple${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "supplier" as const,
      organizationName: "Shree Siddhivinayak Seva Trust",
      organizationType: "temple" as const,
      phone: "+91 98200 99881",
      address: "SK Bole Marg, Prabhadevi, Mumbai, Maharashtra 400028",
      location: { type: "Point" as const, coordinates: [72.8311, 19.0168] as [number, number] },
      greenCreditBalance: 590,
    },
  ];

  const createdSuppliers = await User.insertMany(supplierData);

  // -------------------------------------------------------------
  // 2. Insert 4 Startup Users
  // -------------------------------------------------------------
  console.log("🚀 Creating 4 demo recycling startups...");

  const startupData = [
    {
      name: "Aditi Rao (Co-Founder)",
      email: `phoolcraft.incense${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "startup" as const,
      organizationName: "PhoolKraft Circular Incense & Bio-Leather",
      organizationType: "startup" as const,
      phone: "+91 98800 12345",
      address: "8th Block, Koramangala, Bengaluru, Karnataka 560095",
      location: { type: "Point" as const, coordinates: [77.6245, 12.9352] as [number, number] },
      greenCreditBalance: 650,
    },
    {
      name: "Karthik Subramanian",
      email: `repolymer.textiles${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "startup" as const,
      organizationName: "RePolymer Recycled Yarn & Fabric Labs",
      organizationType: "startup" as const,
      phone: "+91 98401 56789",
      address: "TIDEL Park, OMR, Taramani, Chennai, Tamil Nadu 600113",
      location: { type: "Point" as const, coordinates: [80.2443, 12.9892] as [number, number] },
      greenCreditBalance: 820,
    },
    {
      name: "Dr. Nikhil Kulkarni",
      email: `urjabio.energy${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "startup" as const,
      organizationName: "UrjaBio Clean Energy & Compressed Bio-Gas",
      organizationType: "startup" as const,
      phone: "+91 97654 22334",
      address: "Bhosari Industrial Estate, Pune, Maharashtra 411026",
      location: { type: "Point" as const, coordinates: [73.8427, 18.6279] as [number, number] },
      greenCreditBalance: 410,
    },
    {
      name: "Pooja Venkatesh",
      email: `cirkutech.ewaste${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
      role: "startup" as const,
      organizationName: "CirkuTech Precious Metals & E-Waste Recovery",
      organizationType: "startup" as const,
      phone: "+91 99400 88776",
      address: "Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka 560100",
      location: { type: "Point" as const, coordinates: [77.6648, 12.8452] as [number, number] },
      greenCreditBalance: 950,
    },
  ];

  const createdStartups = await User.insertMany(startupData);

  // -------------------------------------------------------------
  // 3. Create Reliability Scores for all demo users
  // -------------------------------------------------------------
  console.log("⭐ Initializing 12-factor Reliability Scores...");

  const allDemoUsers = [...createdSuppliers, ...createdStartups];
  for (const user of allDemoUsers) {
    const isSup = user.role === "supplier";
    const scoreVal = isSup ? 740 + Math.floor(Math.random() * 80) : 760 + Math.floor(Math.random() * 65);

    const relScore = await ReliabilityScore.create({
      userId: user._id,
      score: scoreVal,
      lastCalculatedAt: new Date(),
      factors: {
        onTimeRate: 0.94,
        cancellationRate: 0.03,
        avgResponseTime: 18,
        disputeRate: 0.01,
        volumeConsistency: 0.91,
        completionRate: 0.97,
        verifiedTransactionCount: 14,
        tenureMonths: 8,
        avgRating: 4.8,
        recurringContractRate: 0.75,
        disputeResolutionRate: 1.0,
        photoAccuracyRate: 0.95,
      },
      history: [
        { score: scoreVal - 25, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { score: scoreVal - 10, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        { score: scoreVal, date: new Date() },
      ],
    });

    user.reliabilityScoreId = relScore._id;
    await user.save();
  }

  // -------------------------------------------------------------
  // 4. Create 10 Waste Listings across suppliers
  // -------------------------------------------------------------
  console.log("📋 Inserting 10 realistic waste listings with AI inspection grades...");

  const [temple1, apt1, rest1, fact1, temple2] = createdSuppliers;
  const [startupFlower, startupPlastic, startupBiogas, startupEwaste] = createdStartups;

  const listingsData = [
    {
      supplierId: temple1._id,
      wasteType: "organic",
      subType: "Marigold, Jasmine & Rose Temple Offerings",
      quantityKg: 450,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "none",
        confidence: 0.95,
        rawResponse: "Pure segregated temple floral waste with zero plastic twine or polythene.",
      },
      status: "completed" as const,
      priceEstimate: 1350,
      location: temple1.location,
      availableFrom: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "daily",
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: temple1._id,
      wasteType: "organic",
      subType: "Temple Sacred Floral Waste & Coconut Shells",
      quantityKg: 600,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "none",
        confidence: 0.92,
        rawResponse: "High-grade organic flower petals, ideal for essential oils and organic agarbatti.",
      },
      status: "scheduled" as const,
      priceEstimate: 1800,
      location: temple1.location,
      availableFrom: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "daily",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: apt1._id,
      wasteType: "plastic",
      subType: "Baled PET Bottles & Rigid HDPE Containers",
      quantityKg: 320,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "low",
        confidence: 0.89,
        rawResponse: "Cleanly rinsed household PET beverage bottles, pre-sorted by residential community.",
      },
      status: "completed" as const,
      priceEstimate: 4800,
      location: apt1.location,
      availableFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "weekly",
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: apt1._id,
      wasteType: "plastic",
      subType: "Segregated LDPE Plastic Wrappers & Milk Pouches",
      quantityKg: 280,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "B",
        contaminationLevel: "low",
        confidence: 0.86,
        rawResponse: "Clean flexible film polymer scraps suitable for pyrolysis and plastic lumber.",
      },
      status: "matched" as const,
      priceEstimate: 3360,
      location: apt1.location,
      availableFrom: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "weekly",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: rest1._id,
      wasteType: "organic",
      subType: "Commercial Kitchen Vegetable Peels & Food Prep Scraps",
      quantityKg: 750,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "none",
        confidence: 0.94,
        rawResponse: "High caloric density organic kitchen wet waste, optimal for anaerobic digestion and biogas.",
      },
      status: "scheduled" as const,
      priceEstimate: 2250,
      location: rest1.location,
      availableFrom: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "daily",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: rest1._id,
      wasteType: "organic",
      subType: "Used Cooking Oil & Culinary Grease",
      quantityKg: 200,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "low",
        confidence: 0.91,
        rawResponse: "Filtered Used Cooking Oil (UCO) conforming to RUCO biodiesel feedstock specifications.",
      },
      status: "listed" as const,
      priceEstimate: 7000,
      location: rest1.location,
      availableFrom: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "bi-weekly",
      createdAt: new Date(),
    },
    {
      supplierId: fact1._id,
      wasteType: "plastic",
      subType: "Industrial Polypropylene & ABS Trim Scraps",
      quantityKg: 1200,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "none",
        confidence: 0.98,
        rawResponse: "Pure virgin industrial sprue & runner regrinds with zero post-consumer contamination.",
      },
      status: "completed" as const,
      priceEstimate: 36000,
      location: fact1.location,
      availableFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "monthly",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: fact1._id,
      wasteType: "e-waste",
      subType: "Decommissioned Server Racks, PCBs & Copper Wiring",
      quantityKg: 450,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "none",
        confidence: 0.96,
        rawResponse: "High-grade institutional telecom and server PCBs with high gold and palladium trace yield.",
      },
      status: "confirmed" as const,
      priceEstimate: 54000,
      location: fact1.location,
      availableFrom: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isRecurring: false,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      supplierId: temple2._id,
      wasteType: "organic",
      subType: "Hibiscus & Chrysanthemum Temple Garlands",
      quantityKg: 380,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "A",
        contaminationLevel: "none",
        confidence: 0.93,
        rawResponse: "Segregated floral offerings harvested daily from shrine altars.",
      },
      status: "listed" as const,
      priceEstimate: 1140,
      location: temple2.location,
      availableFrom: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurrencePattern: "daily",
      createdAt: new Date(),
    },
    {
      supplierId: apt1._id,
      wasteType: "e-waste",
      subType: "Household Small Electronics, Chargers & Alkaline Batteries",
      quantityKg: 150,
      unit: "kg",
      photoUrls: [
        "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=800&q=80",
      ],
      aiGrading: {
        grade: "B",
        contaminationLevel: "low",
        confidence: 0.87,
        rawResponse: "Residential e-waste drive collection; sorted into battery-safe collection drums.",
      },
      status: "listed" as const,
      priceEstimate: 6000,
      location: apt1.location,
      availableFrom: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      isRecurring: false,
      createdAt: new Date(),
    },
  ];

  const createdListings = await WasteListing.insertMany(listingsData);

  // -------------------------------------------------------------
  // 5. Create 4 Realistic Contracts (Completed & In-Progress)
  // -------------------------------------------------------------
  console.log("🤝 Generating 4 sample custody contracts with timeline milestones...");

  // Contract 1: Completed - Temple1 Floral Waste -> PhoolKraft Startup
  const c1 = await Contract.create({
    listingId: createdListings[0]._id,
    supplierId: temple1._id,
    startupId: startupFlower._id,
    timeline: [
      { stage: "matched", timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), note: "AI matched supplier waste batch to PhoolKraft based on proximity & material grade A" },
      { stage: "requested", timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), note: "Startup requested pickup contract for 450 kg floral offerings" },
      { stage: "confirmed", timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), note: "Supplier confirmed custody agreement and pickup terms" },
      { stage: "scheduled", timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), note: "Pickup vehicle scheduled for on-site collection" },
      { stage: "otp_verified", timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), note: "Driver verified 6-digit OTP 829104 at temple premises" },
      { stage: "completed", timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), note: "Raw floral waste received at facility and converted into organic charcoal-free incense" },
    ],
    scheduledPickupAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    otpCode: "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1VGfW0gGzK7ZzT/18e2j4w5G4e5t0G", // dummy hash
    otpVerifiedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    greenCreditsAwarded: 180,
    co2SavedKg: 540,
    status: "completed",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });

  // Contract 2: Completed - Industrial Factory Polypropylene -> RePolymer
  const c2 = await Contract.create({
    listingId: createdListings[6]._id,
    supplierId: fact1._id,
    startupId: startupPlastic._id,
    timeline: [
      { stage: "matched", timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), note: "Matched high-grade industrial polymer scraps to RePolymer" },
      { stage: "requested", timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), note: "RePolymer initiated procurement contract for 1200 kg" },
      { stage: "confirmed", timestamp: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), note: "Factory dispatch authorized logistics pickup" },
      { stage: "scheduled", timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), note: "Heavy vehicle dispatch arranged" },
      { stage: "otp_verified", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), note: "Secure handoff confirmed via OTP verification" },
      { stage: "completed", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), note: "1.2 metric tons converted into recycled polyester textile yarn" },
    ],
    scheduledPickupAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    otpCode: "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1VGfW0gGzK7ZzT/18e2j4w5G4e5t0G",
    otpVerifiedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    greenCreditsAwarded: 450,
    co2SavedKg: 1800,
    status: "completed",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });

  // Contract 3: Scheduled (Pending OTP) - Restaurant Kitchen Scraps -> UrjaBio
  const c3 = await Contract.create({
    listingId: createdListings[4]._id,
    supplierId: rest1._id,
    startupId: startupBiogas._id,
    timeline: [
      { stage: "matched", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), note: "AI matched commercial food waste to UrjaBio anaerobic digestion hub" },
      { stage: "requested", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), note: "UrjaBio requested 750 kg food waste batch" },
      { stage: "confirmed", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), note: "Saravana Bhavan confirmed morning dispatch window" },
      { stage: "scheduled", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), note: "Biogas tanker scheduled for pickup tomorrow morning. OTP delivered to supplier email." },
    ],
    scheduledPickupAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    otpCode: "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1VGfW0gGzK7ZzT/18e2j4w5G4e5t0G",
    greenCreditsAwarded: 220,
    co2SavedKg: 680,
    status: "scheduled",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  // Contract 4: Confirmed (In negotiation / schedule phase) - Factory E-Waste -> CirkuTech
  const c4 = await Contract.create({
    listingId: createdListings[7]._id,
    supplierId: fact1._id,
    startupId: startupEwaste._id,
    timeline: [
      { stage: "matched", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), note: "AI matched server PCBs to CirkuTech precious metals recovery" },
      { stage: "requested", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), note: "CirkuTech submitted formal procurement bid" },
      { stage: "confirmed", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), note: "Hazardous waste transit manifest (Form 10) verified and approved" },
    ],
    scheduledPickupAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "confirmed",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  });

  // -------------------------------------------------------------
  // 6. Create Impact Certificates for Completed Contracts
  // -------------------------------------------------------------
  console.log("📜 Minting verified Impact Certificates...");

  await ImpactCertificate.create({
    contractId: c1._id,
    userId: temple1._id,
    certificateNumber: ImpactCertificate.generateCertificateNumber(),
    co2SavedKg: 540,
    wasteKg: 450,
    wasteType: "organic",
    issuedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    shareUrl: `/certificates/${c1._id}`,
  });

  await ImpactCertificate.create({
    contractId: c2._id,
    userId: fact1._id,
    certificateNumber: ImpactCertificate.generateCertificateNumber(),
    co2SavedKg: 1800,
    wasteKg: 1200,
    wasteType: "plastic",
    issuedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    shareUrl: `/certificates/${c2._id}`,
  });

  // -------------------------------------------------------------
  // 7. Create Green Credit Ledger Entries
  // -------------------------------------------------------------
  console.log("🪙 Crediting Green Wallets with verified transaction history...");

  await GreenCredit.create({
    userId: temple1._id,
    contractId: c1._id,
    amount: 180,
    reason: "450 kg Temple Floral Waste converted into zero-waste incense",
    balanceAfter: temple1.greenCreditBalance,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  });

  await GreenCredit.create({
    userId: fact1._id,
    contractId: c2._id,
    amount: 450,
    reason: "1,200 kg Industrial Polymer diverted to recycled synthetic fabric production",
    balanceAfter: fact1.greenCreditBalance,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });

  console.log("\n========================================================");
  console.log("🎉 CIIRS DEMO DATA SEEDED SUCCESSFULLY!");
  console.log("========================================================");
  console.log(`Default Demo Password: ${defaultPassword}\n`);
  console.log("Suppliers Created:");
  createdSuppliers.forEach((s) => {
    console.log(` - [${s.organizationType}] ${s.organizationName} -> ${s.email}`);
  });
  console.log("\nStartups Created:");
  createdStartups.forEach((st) => {
    console.log(` - [startup] ${st.organizationName} -> ${st.email}`);
  });
  console.log(`\nListings Created: ${createdListings.length}`);
  console.log(`Contracts Created: 4 (2 Completed, 1 Scheduled awaiting OTP, 1 Confirmed)`);
  console.log("========================================================\n");

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Fatal Error during seed execution:", err);
  process.exit(1);
});
