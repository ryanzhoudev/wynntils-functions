import { fileURLToPath } from "node:url";

export const vitestResolve = {
    alias: {
        "@": fileURLToPath(new URL(".", import.meta.url)),
    },
};
