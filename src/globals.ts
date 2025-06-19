// Register global imports
import loggerImpl from "@/utils/logger";
import configImpl from "@/config/app";
import dbImpl from "@/database/connection";

// Make them globally available
(globalThis as any).logger = loggerImpl;
(globalThis as any).config = configImpl;
(globalThis as any).db = dbImpl;

// Add more auto-imports here as needed
