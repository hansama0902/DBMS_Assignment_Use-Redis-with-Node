const { MongoClient } = require("mongodb");
const { createClient } = require("redis");

async function run() {
  const mongoUri = "mongodb://localhost:27017";
  const redisUri = "redis://localhost:6379";

  // Create MongoDB and Redis clients
  const mongoClient = new MongoClient(mongoUri);
  const redisClient = createClient({ url: redisUri });

  try {
    // Connect to both MongoDB and Redis
    await mongoClient.connect();
    await redisClient.connect();
    await redisClient.flushAll();


    const database = mongoClient.db("ieeevisTweets");
    const collection = database.collection("tweet");

    const redisKey = "favoritesSum";
    await redisClient.set(redisKey, 0);

    const cursor = collection.find();

    while (await cursor.hasNext()) {
      const tweet = await cursor.next();
      const favoriteCount = tweet.favorite_count || 0;
      await redisClient.incrBy(redisKey, favoriteCount);
    }

    // Get the final sum from Redis and print it
    const favoritesSum = await redisClient.get(redisKey);
    console.log("Total number of favorites:", favoritesSum);

  } finally {
    // Close the connections
    await mongoClient.close();
    await redisClient.disconnect();
  }
}

run().catch(console.dir);


