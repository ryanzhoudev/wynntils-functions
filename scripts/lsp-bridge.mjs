#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { WebSocketServer } from "ws";
import { createServerProcess, createWebSocketConnection, forward } from "vscode-ws-jsonrpc/server";

const projectRoot = process.cwd();
const serverEntry = resolve(projectRoot, ".generated/upstream-lsp/server.js");

const port = Number(process.env.WYNNTILS_LSP_PORT ?? 3001);
const wsPath = process.env.WYNNTILS_LSP_PATH ?? "/wynntils";
const host = process.env.WYNNTILS_LSP_HOST ?? "127.0.0.1";

if (!existsSync(serverEntry)) {
    console.error(`Missing compiled upstream LSP server at ${serverEntry}`);
    console.error("Run: pnpm build:lsp");
    process.exit(1);
}

function wrapSocket(rawSocket) {
    return {
        send: (content) => rawSocket.send(content),
        onMessage: (cb) => rawSocket.on("message", (data) => cb(data.toString())),
        onError: (cb) => rawSocket.on("error", cb),
        onClose: (cb) => rawSocket.on("close", (code, reason) => cb(code, reason.toString())),
        dispose: () => {
            if (rawSocket.readyState === rawSocket.OPEN) {
                rawSocket.close();
            }
        },
    };
}

const webSocketServer = new WebSocketServer({
    host,
    port,
    path: wsPath,
});

webSocketServer.on("connection", (rawSocket) => {
    const socket = wrapSocket(rawSocket);
    const socketConnection = createWebSocketConnection(socket);

    const serverConnection = createServerProcess("Wynntils", process.execPath, [serverEntry, "--stdio"], {
        cwd: projectRoot,
        env: process.env,
    });

    if (!serverConnection) {
        rawSocket.close(1011, "Failed to start upstream LSP server");
        return;
    }

    forward(socketConnection, serverConnection);
});

webSocketServer.on("listening", () => {
    console.log(`Wynntils upstream LSP bridge listening on ws://${host}:${port}${wsPath}`);
    console.log(`Using server: ${serverEntry}`);
});

webSocketServer.on("error", (error) => {
    console.error("Failed to start LSP bridge", error);
});

function shutdown() {
    webSocketServer.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
