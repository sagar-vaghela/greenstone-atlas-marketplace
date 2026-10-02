import "./load-env.js";
import { config } from "./config/index.js";
import { connectMongoDB } from "./db/mongodb.js";
import { hashPassword } from "./auth/password.js";

const reset = process.argv.includes("--reset");
const marketplaceCollections = [
  "users",
  "sessions",
  "sellerProfiles",
  "listings",
  "offers",
  "transactions",
  "conversations",
  "messages",
  "notifications",
] as const;

const demoUsers = [
  {
    id: "demo-seller",
    email: "seller@example.com",
    displayName: "Maison D'Arcy",
    password: "seller123",
    role: "seller" as const,
  },
  {
    id: "demo-seller-2",
    email: "seller2@example.com",
    displayName: "Northline Time",
    password: "seller123",
    role: "seller" as const,
  },
  {
    id: "demo-seller-3",
    email: "seller3@example.com",
    displayName: "Aureate Vault",
    password: "seller123",
    role: "seller" as const,
  },
  {
    id: "demo-buyer",
    email: "buyer@example.com",
    displayName: "Aiden Rahman",
    password: "buyer123",
    role: "buyer" as const,
  },
  {
    id: "demo-buyer-2",
    email: "buyer2@example.com",
    displayName: "Mila Durrani",
    password: "buyer123",
    role: "buyer" as const,
  },
];

const sellerProfiles = [
  {
    userId: "demo-seller",
    bio: "Independent luxury watch dealer focused on modern Rolex, AP, and Patek pieces with strong provenance records and private client service.",
    location: "Dubai, UAE",
    memberSince: "2024-03-14T00:00:00.000Z",
    verificationStatus: "verified" as const,
    responseRate: 96,
  },
  {
    userId: "demo-seller-2",
    bio: "Collector-led specialist in vintage complications, deep-dive provenance review, and discreet private-sales execution.",
    location: "London, UK",
    memberSince: "2021-11-08T00:00:00.000Z",
    verificationStatus: "verified" as const,
    responseRate: 88,
  },
  {
    userId: "demo-seller-3",
    bio: "Boutique seller sourcing contemporary Swiss sports models and rare dress watches for collectors in the GCC and Europe.",
    location: "Doha, Qatar",
    memberSince: "2023-02-04T00:00:00.000Z",
    verificationStatus: "pending" as const,
    responseRate: 82,
  },
];

const listingSeeds = [
  {
    id: "listing-rolex-submariner-126610ln",
    sellerId: "demo-seller",
    title: "Rolex Submariner Date 126610LN",
    description:
      "A near-new Submariner Date in a classic black ceramic bezel configuration, presented in excellent condition with a clean bracelet and full service history documentation.",
    price: 39800,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80",
        alt: "Rolex Submariner Date on wrist",
      },
      {
        url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=900&q=80",
        alt: "Rolex case close-up",
      },
      {
        url: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch detail",
      },
    ],
    status: "active" as const,
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    version: 1,
  },
  {
    id: "listing-rolex-daytona-116500ln",
    sellerId: "demo-seller-2",
    title: "Rolex Daytona 116500LN",
    description:
      "Cosmograph Daytona in steel with a black dial, crisp case edges, and strong collector appeal for enthusiasts seeking a modern icon.",
    price: 47650,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=1200&q=80",
        alt: "Rolex Daytona",
      },
      {
        url: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=900&q=80",
        alt: "Watch face close-up",
      },
      {
        url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch on display",
      },
    ],
    status: "active" as const,
    createdAt: "2026-04-17T11:30:00.000Z",
    updatedAt: "2026-04-17T11:30:00.000Z",
    version: 1,
  },
  {
    id: "listing-patek-5711-nautilus",
    sellerId: "demo-seller",
    title: "Patek Philippe Nautilus 5711/1A-014",
    description:
      "A highly sought-after stainless steel Nautilus with a brushed bracelet, excellent finishing, and clean provenance details from a private collection.",
    price: 81200,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=1200&q=80",
        alt: "Patek Philippe Nautilus",
      },
      {
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
        alt: "Watch details",
      },
      {
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch profile",
      },
    ],
    status: "active" as const,
    createdAt: "2026-02-12T11:15:00.000Z",
    updatedAt: "2026-02-12T11:15:00.000Z",
    version: 1,
  },
  {
    id: "listing-ap-royal-oak-15510st",
    sellerId: "demo-seller-3",
    title: "Audemars Piguet Royal Oak 15510ST",
    description:
      "Royal Oak self-winding in steel with a blue dial and iconic octagonal bezel, carefully maintained and presented in premium condition.",
    price: 70200,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80",
        alt: "Audemars Piguet Royal Oak",
      },
      {
        url: "https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80",
        alt: "Watch dial close-up",
      },
      {
        url: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch bracelet",
      },
    ],
    status: "active" as const,
    createdAt: "2026-03-02T16:10:00.000Z",
    updatedAt: "2026-03-02T16:10:00.000Z",
    version: 1,
  },
  {
    id: "listing-richard-mille-rm-27-04",
    sellerId: "demo-seller",
    title: "Richard Mille RM 27-04 Tourbillon",
    description:
      "High-performance skeletonized tourbillon with a technical, race-inspired aesthetic and exceptional contemporary collector appeal.",
    price: 138000,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=1200&q=80",
        alt: "Richard Mille watch",
      },
      {
        url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch close-up",
      },
      {
        url: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=900&q=80",
        alt: "Skeleton watch detail",
      },
    ],
    status: "sold" as const,
    createdAt: "2025-12-16T10:45:00.000Z",
    updatedAt: "2026-01-11T13:55:00.000Z",
    version: 2,
  },
  {
    id: "listing-vintage-heuer-2915",
    sellerId: "demo-seller-2",
    title: "Vintage Heuer Carrera 2915A",
    description:
      "A rare manual-wind vintage Carrera with strong patina, rather than heavy polishing, giving it the honest character collectors value.",
    price: 28100,
    currency: "AED",
    category: "vintage-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80",
        alt: "Vintage Heuer watch",
      },
      {
        url: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
        alt: "Vintage watch dial",
      },
      {
        url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=900&q=80",
        alt: "Vintage watch detail",
      },
    ],
    status: "active" as const,
    createdAt: "2026-01-09T09:10:00.000Z",
    updatedAt: "2026-01-09T09:10:00.000Z",
    version: 1,
  },
  {
    id: "listing-rolex-gmt-master-ii-126710blnr",
    sellerId: "demo-seller-3",
    title: "Rolex GMT-Master II 126710BLNR",
    description:
      "Black and blue bezel reference with excellent bracelet condition, strong finishing, and modern travel-watch versatility for a weekend collector.",
    price: 42300,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=1200&q=80",
        alt: "GMT-Master II",
      },
      {
        url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80",
        alt: "Watch on leather strap",
      },
      {
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
        alt: "Watch dial close-up",
      },
    ],
    status: "active" as const,
    createdAt: "2026-03-20T12:40:00.000Z",
    updatedAt: "2026-03-20T12:40:00.000Z",
    version: 1,
  },
  {
    id: "listing-patek-5167-aqua",
    sellerId: "demo-seller",
    title: "Patek Philippe Aquanaut 5167A-001",
    description:
      "Aquanaut with a wrapped bracelet and robust sporty profile, kept in excellent condition and ready for a collector seeking a more relaxed dress watch.",
    price: 66100,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=1200&q=80",
        alt: "Patek Aquanaut",
      },
      {
        url: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=900&q=80",
        alt: "Watch bracelet detail",
      },
      {
        url: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80",
        alt: "Patek profile",
      },
    ],
    status: "active" as const,
    createdAt: "2026-01-28T08:32:00.000Z",
    updatedAt: "2026-01-28T08:32:00.000Z",
    version: 1,
  },
  {
    id: "listing-ap-hublot-pink-gold",
    sellerId: "demo-seller-2",
    title: "Audemars Piguet Royal Oak Offshore 15710ST",
    description:
      "Sporty offshore execution in steel with a blue dial and strong wrist presence. Presented with careful wear and no visible heavy service marks.",
    price: 57750,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=1200&q=80",
        alt: "AP Royal Oak Offshore",
      },
      {
        url: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
        alt: "Offshore watch profile",
      },
      {
        url: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch close-up",
      },
    ],
    status: "sold" as const,
    createdAt: "2025-10-21T18:15:00.000Z",
    updatedAt: "2026-02-02T07:45:00.000Z",
    version: 2,
  },
  {
    id: "listing-vintage-omega-speedmaster-105-001",
    sellerId: "demo-seller-3",
    title: "Vintage Omega Speedmaster 105.003",
    description:
      "Classic Moonwatch reference with a desirable asymmetrical case and original dial finishing that suits collectors who value period-correct character.",
    price: 29250,
    currency: "AED",
    category: "vintage-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80",
        alt: "Omega Speedmaster",
      },
      {
        url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=900&q=80",
        alt: "Vintage Omega case",
      },
      {
        url: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=900&q=80",
        alt: "Vintage watch dial",
      },
    ],
    status: "active" as const,
    createdAt: "2026-05-19T14:02:00.000Z",
    updatedAt: "2026-05-19T14:02:00.000Z",
    version: 1,
  },
  {
    id: "listing-rolex-explorer-124270",
    sellerId: "demo-seller-2",
    title: "Rolex Explorer 124270",
    description:
      "A crisp steel Explorer with a highly legible dial, comfortable proportions, and an understated profile that works equally well for travel and everyday wear.",
    price: 33200,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=1200&q=80",
        alt: "Rolex Explorer",
      },
      {
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
        alt: "Explorer bracelet",
      },
      {
        url: "https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=80",
        alt: "Explorer case detail",
      },
    ],
    status: "active" as const,
    createdAt: "2026-04-02T16:28:00.000Z",
    updatedAt: "2026-04-02T16:28:00.000Z",
    version: 1,
  },
  {
    id: "listing-pp-calendar-5270",
    sellerId: "demo-seller",
    title: "Patek Philippe Calatrava 6119R-001",
    description:
      "A refined dress watch with a rich rose-gold finish, clean polished surfaces, and a minimal dial that suits collectors who prefer elegance over excess.",
    price: 96400,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80",
        alt: "Patek Calatrava",
      },
      {
        url: "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80",
        alt: "Calatrava dial",
      },
      {
        url: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
        alt: "Gold case detail",
      },
    ],
    status: "active" as const,
    createdAt: "2026-02-22T13:05:00.000Z",
    updatedAt: "2026-02-22T13:05:00.000Z",
    version: 1,
  },
  {
    id: "listing-richard-mille-rm-35-03",
    sellerId: "demo-seller-3",
    title: "Richard Mille RM 35-03 Automatic",
    description:
      "A skeletonized contemporary statement piece with a vacuum titanium architecture and a high-performance feel that stands apart on the wrist.",
    price: 126500,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=1200&q=80",
        alt: "RM 35-03 skeleton watch",
      },
      {
        url: "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=900&q=80",
        alt: "Mechanical watch detail",
      },
      {
        url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
        alt: "High-end watch close-up",
      },
    ],
    status: "active" as const,
    createdAt: "2026-06-17T08:50:00.000Z",
    updatedAt: "2026-06-17T08:50:00.000Z",
    version: 1,
  },
  {
    id: "listing-vintage-jaeger-chronograph",
    sellerId: "demo-seller",
    title: "Vintage Jaeger-LeCoultre Reverso",
    description:
      "A refined Reverso with a well-preserved case and slightly aged dial, ideal for collectors seeking a quiet but deeply collectible classic.",
    price: 24800,
    currency: "AED",
    category: "vintage-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80",
        alt: "Jaeger-LeCoultre Reverso",
      },
      {
        url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=900&q=80",
        alt: "Reverso dial",
      },
      {
        url: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury vintage watch",
      },
    ],
    status: "active" as const,
    createdAt: "2026-04-28T10:12:00.000Z",
    updatedAt: "2026-04-28T10:12:00.000Z",
    version: 1,
  },
  {
    id: "listing-rolex-yacht-master-126622",
    sellerId: "demo-seller-3",
    title: "Rolex Yacht-Master 126622",
    description:
      "A polished two-tone Yacht-Master with a rich contrast case and bracelet, suited to enthusiasts who love a more distinctive dress-sports profile.",
    price: 48300,
    currency: "AED",
    category: "luxury-watches",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80",
        alt: "Rolex Yacht-Master",
      },
      {
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
        alt: "Yacht-Master profile detail",
      },
      {
        url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=900&q=80",
        alt: "Luxury watch bracelet",
      },
    ],
    status: "active" as const,
    createdAt: "2025-11-18T15:31:00.000Z",
    updatedAt: "2025-11-18T15:31:00.000Z",
    version: 1,
  },
];

const listingMetadataById = {
  "listing-rolex-submariner-126610ln": {
    brand: "Rolex",
    model: "Submariner Date",
    referenceNumber: "126610LN",
    condition: "Excellent",
    year: 2024,
    location: "Dubai, UAE",
  },
  "listing-rolex-daytona-116500ln": {
    brand: "Rolex",
    model: "Cosmograph Daytona",
    referenceNumber: "116500LN",
    condition: "Very good",
    year: 2022,
    location: "London, UK",
  },
  "listing-patek-5711-nautilus": {
    brand: "Patek Philippe",
    model: "Nautilus",
    referenceNumber: "5711/1A-014",
    condition: "Excellent",
    year: 2021,
    location: "Geneva, Switzerland",
  },
  "listing-ap-royal-oak-15510st": {
    brand: "Audemars Piguet",
    model: "Royal Oak Selfwinding",
    referenceNumber: "15510ST.OO.1320ST.06",
    condition: "Like new",
    year: 2024,
    location: "Doha, Qatar",
  },
  "listing-richard-mille-rm-27-04": {
    brand: "Richard Mille",
    model: "RM 27-04 Tourbillon",
    referenceNumber: "RM 27-04",
    condition: "Excellent",
    year: 2022,
    location: "Dubai, UAE",
  },
  "listing-vintage-heuer-2915": {
    brand: "Heuer",
    model: "Carrera",
    referenceNumber: "2915A",
    condition: "Good vintage",
    year: 1964,
    location: "London, UK",
  },
  "listing-rolex-gmt-master-ii-126710blnr": {
    brand: "Rolex",
    model: "GMT-Master II",
    referenceNumber: "126710BLNR",
    condition: "Excellent",
    year: 2023,
    location: "Doha, Qatar",
  },
  "listing-patek-5167-aqua": {
    brand: "Patek Philippe",
    model: "Aquanaut",
    referenceNumber: "5167A-001",
    condition: "Very good",
    year: 2020,
    location: "Dubai, UAE",
  },
  "listing-ap-royal-oak-offshore": {
    brand: "Audemars Piguet",
    model: "Royal Oak Offshore",
    referenceNumber: "26420SO.OO.A002CA.01",
    condition: "Excellent",
    year: 2023,
    location: "Paris, France",
  },
  "listing-rolex-day-date-40": {
    brand: "Rolex",
    model: "Day-Date 40",
    referenceNumber: "228238",
    condition: "Like new",
    year: 2025,
    location: "Abu Dhabi, UAE",
  },
  "listing-vintage-patek-calatrava": {
    brand: "Patek Philippe",
    model: "Calatrava",
    referenceNumber: "3520D",
    condition: "Good vintage",
    year: 1978,
    location: "Geneva, Switzerland",
  },
  "listing-richard-mille-rm-35-03": {
    brand: "Richard Mille",
    model: "RM 35-03 Rafael Nadal",
    referenceNumber: "RM 35-03",
    condition: "Excellent",
    year: 2023,
    location: "Monaco",
  },
  "listing-rolex-yacht-master-126622": {
    brand: "Rolex",
    model: "Yacht-Master 40",
    referenceNumber: "126622",
    condition: "Very good",
    year: 2021,
    location: "Singapore",
  },
  "listing-vintage-omega-speedmaster-105-001": {
    brand: "Omega",
    model: "Speedmaster Professional",
    referenceNumber: "105.003",
    condition: "Good vintage",
    year: 1966,
    location: "New York, USA",
  },
  "listing-rolex-explorer-124270": {
    brand: "Rolex",
    model: "Explorer",
    referenceNumber: "124270",
    condition: "Excellent",
    year: 2022,
    location: "Abu Dhabi, UAE",
  },
  "listing-pp-calendar-5270": {
    brand: "Patek Philippe",
    model: "Perpetual Calendar Chronograph",
    referenceNumber: "5270",
    condition: "Very good",
    year: 2019,
    location: "Geneva, Switzerland",
  },
  "listing-vintage-jaeger-chronograph": {
    brand: "Jaeger-LeCoultre",
    model: "Reverso Classic",
    referenceNumber: "Q3858520",
    condition: "Good vintage",
    year: 1998,
    location: "Paris, France",
  },
  "listing-ap-hublot-pink-gold": {
    brand: "Audemars Piguet",
    model: "Royal Oak Offshore",
    referenceNumber: "15710ST",
    condition: "Excellent",
    year: 2021,
    location: "Doha, Qatar",
  },
} as const;

async function main() {
  if (!config.mongodbUri) {
    throw new Error(
      "MONGODB_URI is missing. Add it to apps/api/.env before running the seed script.",
    );
  }

  const connection = await connectMongoDB(
    config.mongodbUri,
    config.mongodbDbName,
  );

  try {
    const db = connection.db;
    const usersCollection = db.collection("users");
    const sellerProfilesCollection = db.collection("sellerProfiles");
    const listingsCollection = db.collection("listings");

    if (reset) {
      console.log(
        `Resetting marketplace collections in "${config.mongodbDbName}": ${marketplaceCollections.join(", ")}`,
      );
      await Promise.all([
        ...marketplaceCollections.map((name) =>
          db.collection(name).deleteMany({}),
        ),
      ]);
    }

    for (const user of demoUsers) {
      await usersCollection.updateOne(
        { id: user.id },
        {
          $set: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            passwordHash: hashPassword(user.password),
            updatedAt: new Date().toISOString(),
          },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    }

    for (const profile of sellerProfiles) {
      await sellerProfilesCollection.updateOne(
        { userId: profile.userId },
        {
          $set: {
            ...profile,
            updatedAt: new Date().toISOString(),
          },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    }

    for (const listing of listingSeeds) {
      await listingsCollection.updateOne(
        { id: listing.id },
        {
          $set: {
            ...listingMetadataById[
              listing.id as keyof typeof listingMetadataById
            ],
            ...Object.fromEntries(
              Object.entries(listing).filter(([key]) => key !== "createdAt"),
            ),
            updatedAt: listing.updatedAt ?? new Date().toISOString(),
            version: listing.version ?? 1,
          },
          $setOnInsert: {
            createdAt: listing.createdAt ?? new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    }

    const listingCount = await listingsCollection.countDocuments({});
    console.log(`Seeded marketplace data with ${listingCount} listings.`);
  } finally {
    await connection.close();
  }
}

void (async () => {
  try {
    await main();
  } catch (error) {
    console.error("Marketplace seed failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
})();
