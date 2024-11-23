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

    // MongoDB setup
    const database = mongoClient.db("ieeevisTweets");
    const collection = database.collection("tweet");
   
 
    const redisKey = "screen_names";
    await redisClient.del(redisKey); 
 
    const cursor = collection.find();

    while (await cursor.hasNext()) {
      const tweet = await cursor.next();
      const screenName = tweet.user?.screen_name;

      if (screenName) {
        // Add the screen name to the Redis set
        await redisClient.sAdd(redisKey, screenName);
      }
    }

    // Get the count of distinct screen names from the Redis set
    const distinctUsersCount = await redisClient.sCard(redisKey);
    console.log("Total number of distinct users:", distinctUsersCount);
    
  } finally {
    // Close the connections
    await mongoClient.close();
    await redisClient.disconnect();
  }
}

run().catch(console.dir);

