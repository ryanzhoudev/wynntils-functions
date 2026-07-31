/// <reference lib="webworker" />

import {
    GuildColorMapRenderRequest,
    GuildColorMapRenderResponse,
    GuildColorMapWorkerResponse,
} from "@/lib/guild-color-map";
import { renderGuildColorMapSlice } from "@/lib/guild-color-map/renderer";

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<GuildColorMapRenderRequest>) => {
    const request = event.data;

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
};

export {};
