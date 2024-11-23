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

    // Redis setup
    const leaderboardKey = "leaderboard";
    await redisClient.del(leaderboardKey); // Clear any existing sorted set
    console.log(`Leaderboard key '${leaderboardKey}' cleared`);

    // Query all tweets and update leaderboard
    const cursor = collection.find();
    let count = 0;

    while (await cursor.hasNext()) {
      const tweet = await cursor.next();
      const screenName = tweet.user?.screen_name;

      if (screenName) {
        // Increment tweet count for each user in Redis
        await redisClient.zIncrBy(leaderboardKey, 1, screenName);
        count++;
      }
    }

    console.log(`Processed ${count} tweets and updated the leaderboard`);

    // Ensure data is available in Redis
    const leaderboardLength = await redisClient.zCard(leaderboardKey);
    console.log(`Leaderboard has ${leaderboardLength} users`);

    if (leaderboardLength === 0) {
      console.log("No users found in the leaderboard.");
      return;
    }

    // Get the top 10 users from Redis
    console.log("\nTop 10 users by tweet count:");
    const topUsers = await redisClient.zRange(leaderboardKey, 0, 9, {
      REV: true,
      WITHSCORES: false, 
    });

    if (topUsers.length === 0) {
      console.log("No users found in the leaderboard.");
    } else {
      console.log("Rank | Username");
      console.log("-----|-----------------");

      topUsers.forEach((user, index) => {
        const rank = index + 1;
        console.log(`${rank.toString().padEnd(4)} | ${user}`);
      });
    }

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











