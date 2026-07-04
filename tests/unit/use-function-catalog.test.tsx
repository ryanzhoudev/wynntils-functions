// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

function catalogResponse(catalog: ReturnType<typeof createRepresentativeCatalog>) {
    return {
        ok: true,
        status: 200,
        json: async () => catalog,
    } as Response;
}

describe("useFunctionCatalog", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("coalesces concurrent manual refreshes into one request and one budget attempt", async () => {
        const catalog = createRepresentativeCatalog();
        const fetchMock = vi.fn().mockResolvedValueOnce(catalogResponse(catalog));
        vi.stubGlobal("fetch", fetchMock);

        const { result, unmount } = renderHook(() => useFunctionCatalog());
        await waitFor(() => expect(result.current.data).toEqual(catalog));

        let resolveRefresh!: (response: Response) => void;
        fetchMock.mockReturnValueOnce(
            new Promise<Response>((resolve) => {
                resolveRefresh = resolve;
            }),
        );

        let refreshes!: Promise<boolean>[];
        act(() => {
            refreshes = [result.current.refresh(), result.current.refresh()];
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        resolveRefresh(catalogResponse(catalog));
        await act(() => Promise.all(refreshes));

        expect(result.current.refreshRateLimit.remaining).toBe(4);
        unmount();
    });
});
