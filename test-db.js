const mongoose = require('mongoose');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found in .env");
    process.exit(1);
  }

  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Successfully connected to MongoDB!");
    
    // Check if the connection state is 'connected' (1)
    if (mongoose.connection.readyState === 1) {
      console.log("✅ Database is ready to store data directly.");
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB after successful test.");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:");
    console.error(error);
  }
}

testConnection();
