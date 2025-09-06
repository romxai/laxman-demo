import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

interface Vehicle {
  make: string;
  model: string;
  aliases: string[];
}

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

// MongoDB connection configuration
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:admin-lm@cluster0.h6ztrsg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = 'laxman_demo';
const VEHICLES_COLLECTION = 'vehicles';
const PRODUCTS_COLLECTION = 'products';
const DRY_RUN = process.argv.includes('--dry-run');

async function uploadData() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data will be uploaded');
  } else if (!MONGODB_URI || MONGODB_URI === 'your-mongodb-atlas-connection-string') {
    console.error('❌ Please set MONGODB_URI environment variable with your MongoDB Atlas connection string');
    console.log('Example: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority');
    process.exit(1);
  }

  // Load data from files
  console.log('\n� Loading data from files...');
  const vehiclesPath = path.join(__dirname, '..', 'python', 'car_models.json');
  const productsPath = path.join(__dirname, '..', 'python', 'products_compatibility.json');

  const vehiclesData: Vehicle[] = JSON.parse(fs.readFileSync(vehiclesPath, 'utf-8'));
  const productsData: Product[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  console.log(`📊 Found ${vehiclesData.length} vehicles and ${productsData.length} products`);

  if (DRY_RUN) {
    console.log('\n✅ Dry run completed successfully!');
    console.log('To upload data, run without --dry-run flag and set MONGODB_URI');
    return;
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const db = client.db(DATABASE_NAME);

    // Upload vehicles data
    console.log('\n📤 Uploading vehicles data...');
    const vehiclesCollection = db.collection(VEHICLES_COLLECTION);
    await vehiclesCollection.deleteMany({}); // Clear existing data
    const vehiclesResult = await vehiclesCollection.insertMany(vehiclesData);
    console.log(`✅ Inserted ${vehiclesResult.insertedCount} vehicle records`);

    // Upload products data
    console.log('\n📤 Uploading products data...');
    const productsCollection = db.collection(PRODUCTS_COLLECTION);
    await productsCollection.deleteMany({}); // Clear existing data
    const productsResult = await productsCollection.insertMany(productsData);
    console.log(`✅ Inserted ${productsResult.insertedCount} product records`);

    // Create indexes for better query performance
    console.log('\n🔍 Creating indexes...');

    // Vehicles indexes
    await vehiclesCollection.createIndex({ make: 1, model: 1 }, { unique: true });
    await vehiclesCollection.createIndex({ "aliases": 1 });

    // Products indexes
    await productsCollection.createIndex({ sku: 1 }, { unique: true });
    await productsCollection.createIndex({ category: 1 });
    await productsCollection.createIndex({ brand: 1 });
    await productsCollection.createIndex({ universal: 1 });
    await productsCollection.createIndex({ "compatibility.make": 1, "compatibility.model": 1 });

    console.log('✅ Indexes created successfully');

    // Show collection stats
    console.log('\n📊 Collection Statistics:');
    const vehiclesCount = await vehiclesCollection.countDocuments();
    const productsCount = await productsCollection.countDocuments();

    console.log(`Vehicles collection: ${vehiclesCount} documents`);
    console.log(`Products collection: ${productsCount} documents`);

    console.log('\n🎉 Data upload completed successfully!');

  } catch (error) {
    console.error('❌ Error uploading data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the upload function
uploadData().catch(console.error);
