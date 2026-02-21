import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL for Prisma connection.");
}

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma =
    global.prisma ??
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString,
        }),
        log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;
