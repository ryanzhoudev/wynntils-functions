import "dotenv/config";
import { defineConfig } from "prisma/config";

const datasourceUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    ...(datasourceUrl ? { datasource: { url: datasourceUrl } } : {}),
});
