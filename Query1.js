const { MongoClient } = require("mongodb");
const { createClient } = require("redis");

async function run() {
  // MongoDB setup
  const mongoUri = "mongodb://localhost:27017";
  const redisUri = "redis://localhost:6379";

  // Create MongoDB and Redis clients
  const mongoClient = new MongoClient(mongoUri);
  const redisClient = createClient({ url: redisUri });

  redisClient.on("error", (err) => {
    console.log("Redis Error: " + err);
  });

  await redisClient.connect();
  console.log("Connected to Redis");
  await redisClient.flushAll();
  try {
    await mongoClient.connect();
    console.log("Connected to MongoDB");

    const database = mongoClient.db("ieeevisTweets");
    const collection = database.collection("tweet");

    // Initialize tweetCount in Redis
    await redisClient.set("tweetCount", "0");

    // Query tweets collection in MongoDB
    const filter = {};
    const cursor = collection.find(filter);

    // Iterate through each tweet and increment the count in Redis
    while (await cursor.hasNext()) {
      await cursor.next();
      await redisClient.incr("tweetCount");
    }

    const count = await redisClient.get("tweetCount");
    console.log(`There were ${count} tweets`);

  } finally {
    await mongoClient.close();
    await redisClient.disconnect();
    console.log("Disconnected from MongoDB and Redis");
  }
}

run().catch(console.dir);

