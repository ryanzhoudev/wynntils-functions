import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function normalizeConnectionString(connectionString: string) {
    try {
        const url = new URL(connectionString);
        const isPostgresProtocol = url.protocol === "postgres:" || url.protocol === "postgresql:";

        if (isPostgresProtocol && !url.searchParams.has("sslmode")) {
            url.searchParams.set("sslmode", "require");
        }

        return url.toString();
    } catch {
        return connectionString;
    }
}

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
    throw new Error("Missing DATABASE_URL or DIRECT_URL for Prisma connection.");
}

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma =
    global.prisma ??
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: normalizeConnectionString(connectionString),
        }),
        log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;
