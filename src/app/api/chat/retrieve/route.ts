import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ConversationSlots } from "../nlu/route";

interface Product {
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  colour: string | null;
  compatibility: Array<{
    make: string;
    model: string;
    year_from: number | null;
    year_to: number | null;
    notes: string;
  }>;
  universal: boolean;
}

interface Vehicle {
  make: string;
  model: string;
  aliases: string[];
}

interface RetrievalRequest {
  slots: ConversationSlots;
  limit?: number;
  include_universal?: boolean;
}

interface RetrievalResponse {
  products: Product[];
  total_found: number;
  search_criteria: {
    vehicle?: {
      make: string;
      model: string;
      year?: number;
    };
    product_type?: string;
    color?: string;
    universal_fallback: boolean;
  };
  suggestions?: string[];
}

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:admin-lm@cluster0.h6ztrsg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = 'laxman_demo';
const PRODUCTS_COLLECTION = 'products';
const VEHICLES_COLLECTION = 'vehicles';

export async function POST(request: NextRequest) {
  try {
    const { slots, limit = 10, include_universal = true }: RetrievalRequest = await request.json();

    if (!MONGODB_URI || MONGODB_URI === 'your-mongodb-atlas-connection-string') {
      return NextResponse.json(
        { error: "MongoDB connection not configured" },
        { status: 500 }
      );
    }

    const client = new MongoClient(MONGODB_URI);

    try {
      await client.connect();
      const db = client.db(DATABASE_NAME);
      const productsCollection = client.db(DATABASE_NAME).collection(PRODUCTS_COLLECTION);
      const vehiclesCollection = client.db(DATABASE_NAME).collection(VEHICLES_COLLECTION);

      let query: any = {};
      let searchCriteria: any = {
        universal_fallback: false
      };

      // Build search criteria from slots
      if (slots.vehicle?.make || slots.vehicle?.model) {
        searchCriteria.vehicle = {
          make: slots.vehicle.make,
          model: slots.vehicle.model,
          year: slots.vehicle.year
        };
      }

      if (slots.product_type) {
        searchCriteria.product_type = slots.product_type;
        query.category = { $regex: new RegExp(slots.product_type, 'i') };
      }

      if (slots.color) {
        searchCriteria.color = slots.color;
        query.colour = { $regex: new RegExp(slots.color, 'i') };
      }

      // First, try to find vehicle-specific products
      let products: Product[] = [];
      let vehicleSpecificQuery = { ...query };

      if (slots.vehicle?.make && slots.vehicle?.model) {
        // Search for exact vehicle match
        vehicleSpecificQuery.compatibility = {
          $elemMatch: {
            make: { $regex: new RegExp(slots.vehicle.make, 'i') },
            model: { $regex: new RegExp(slots.vehicle.model, 'i') }
          }
        };

        // Also check year compatibility if provided
        if (slots.vehicle.year) {
          vehicleSpecificQuery.compatibility.$elemMatch.$or = [
            { year_from: null, year_to: null }, // No year restriction
            { year_from: { $lte: slots.vehicle.year }, year_to: null }, // Year >= from
            { year_from: null, year_to: { $gte: slots.vehicle.year } }, // Year <= to
            { year_from: { $lte: slots.vehicle.year }, year_to: { $gte: slots.vehicle.year } } // Year within range
          ];
        }

        const vehicleSpecificProducts = await productsCollection
          .find(vehicleSpecificQuery)
          .limit(limit)
          .toArray();

        products = vehicleSpecificProducts.map(doc => doc as unknown as Product);
      }

      // If no vehicle-specific products found and universal fallback is enabled
      if (products.length === 0 && include_universal && slots.product_type) {
        searchCriteria.universal_fallback = true;

        // Search for universal products in the same category
        const universalQuery = {
          ...query,
          universal: true
        };

        const universalProducts = await productsCollection
          .find(universalQuery)
          .limit(limit)
          .toArray();

        products = universalProducts.map(doc => doc as unknown as Product);
      }

      // Get total count for the query
      const totalFound = await productsCollection.countDocuments(
        products.length > 0 ? (searchCriteria.universal_fallback ? { ...query, universal: true } : vehicleSpecificQuery) : {}
      );

      // Generate suggestions if no products found
      let suggestions: string[] = [];
      if (products.length === 0) {
        // Suggest alternative categories or general help
        const allCategories = await productsCollection.distinct("category");
        suggestions = [
          "Try searching for a different product category",
          `Available categories: ${allCategories.slice(0, 5).join(", ")}`,
          "You can ask for universal products that fit all vehicles"
        ];
      }

      const response: RetrievalResponse = {
        products,
        total_found: totalFound,
        search_criteria: searchCriteria,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      return NextResponse.json(response);

    } finally {
      await client.close();
    }

  } catch (error) {
    console.error("Error in retrieval API:", error);
    return NextResponse.json(
      { error: "Failed to retrieve products" },
      { status: 500 }
    );
  }
}

// Helper function to normalize vehicle names
function normalizeVehicleName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/\b(ertiga|creta|venue|baleno|swift|ciaz|dzire|alto|wagonr|celerio|ignis|santro|i10|i20|verna|eon|grand i10|elite i20|new santro|creta|venue|sonet|selto|carens|magnite|triber|duster|compass|thar|bolero|scorpio|xuv300|innova|fortuner|etios|liva|corolla|camry|city|amaze|jazz|wr-v|br-v|brezza|grand vitara|ecosport|aspire|figo|endeavour|kwid|kiger|triber|rapid|octavia|fabia|kodiaq|virtus|polo|tiguan|taigun|mg hector|gloster|ZS EV|nexon|tigor|altroz|safari|hexa)\b/g, (match) => match.charAt(0).toUpperCase() + match.slice(1));
}
