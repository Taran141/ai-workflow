import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async () => {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
};

