/// <reference lib="webworker" />

import {
    GuildColorMapRenderRequest,
    GuildColorMapRenderResponse,
    GuildColorMapWorkerResponse,
} from "@/lib/guild-color-map";
import { renderGuildColorMapSlice } from "@/lib/guild-color-map/renderer";

const worker = self as DedicatedWorkerGlobalScope;
let pendingRequest: GuildColorMapRenderRequest | null = null;
let renderScheduled = false;

function renderLatestRequest() {
    renderScheduled = false;
    const request = pendingRequest;
    pendingRequest = null;

    if (!request) {
        return;
    }

    try {
        const response = renderGuildColorMapSlice(request);
        worker.postMessage(response satisfies GuildColorMapRenderResponse, [
            response.pixels.buffer,
            response.owners.buffer,
            response.flags.buffer,
        ]);
    } catch (error) {
        const response: GuildColorMapWorkerResponse = {
            type: "error",
            requestId: request.requestId,
            message: error instanceof Error ? error.message : "The color map could not be rendered.",
        };
        worker.postMessage(response);
    }
}

worker.onmessage = (event: MessageEvent<GuildColorMapRenderRequest>) => {
    pendingRequest = event.data;

    if (renderScheduled) {
        return;
    }

    renderScheduled = true;
    setTimeout(renderLatestRequest, 0);
};

export {};
