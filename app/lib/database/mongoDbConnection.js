import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local");
}

if (!dbName) {
  throw new Error("Please add your DB_NAME to .env.local");
}

const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDatabase() {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function closeConnection() {
  const client = await clientPromise;
  await client.close();
}

export default clientPromise;
