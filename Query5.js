const { MongoClient } = require("mongodb");
const { createClient } = require("redis");

async function run() {
  const mongoUri = "mongodb://localhost:27017";
  const redisUri = "redis://localhost:6379";

  // Create MongoDB and Redis clients
  const mongoClient = new MongoClient(mongoUri);
  const redisClient = createClient({ url: redisUri });

  try {
    // Connect to MongoDB and Redis
    await mongoClient.connect();
    await redisClient.connect();
    await redisClient.flushAll();

    console.log("Connected to MongoDB and Redis");

    // MongoDB setup
    const database = mongoClient.db("ieeevisTweets");
    const collection = database.collection("tweet");

    // Count the total number of documents in the collection
    const documentCount = await collection.countDocuments();
    console.log(`Total documents in the collection: ${documentCount}`);

    if (documentCount === 0) {
      console.log("No documents found in the collection. Please verify data import.");
      return;
    }

    // Query all tweets and create the Redis structure
    const tweets = await collection.find().toArray();
    let count = 0;

    const promises = tweets.map(async (tweet) => {
      // Extract all properties of the tweet
      const tweetId = tweet.id_str || tweet.id;

      if (tweetId) {
        // Flatten the tweet object into key-value pairs for Redis hash
        const flattenedTweet = Object.entries(tweet).reduce((acc, [key, value]) => {
          acc[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
          return acc;
        }, {});

        // Store all tweet properties as a hash in Redis
        await redisClient.hSet(`tweet:${tweetId}`, flattenedTweet);

        // Add tweet ID to the list of tweets for the user
        const screenName = tweet.user?.screen_name || tweet.screen_name;
        if (screenName) {
          await redisClient.rPush(`tweets:${screenName}`, tweetId);
        }

        count++;
      }
    });

    await Promise.all(promises);

    console.log(`Processed ${count} tweets and updated Redis structure`);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // Close connections
    await mongoClient.close();
    await redisClient.disconnect();
    console.log("Disconnected from MongoDB and Redis");
  }
}

run().catch(console.dir);










