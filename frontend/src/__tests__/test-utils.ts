import { vi } from "vitest";
import type { Order, OrderStatus } from "@/lib/types";

export interface MockResponse {
  body: unknown;
  status?: number;
  delay?: number;
}

/**
 * Stubs global fetch. Like the real fetch, the returned promise rejects with an
 * AbortError if the request's AbortSignal fires before the response arrives.
 */
export function mockFetch(handler: (url: URL, init?: RequestInit) => MockResponse) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const { body, status = 200, delay = 0 } = handler(url, init);

    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
      }, delay);

      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

export function requestedUrls(fetchMock: ReturnType<typeof mockFetch>, pathname: string): URL[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((url) => url.pathname === pathname);
}

export function makeOrder(id: number, overrides: Partial<Order> = {}): Order {
  return {
    id,
    reference: `ORD-${String(id).padStart(6, "0")}`,
    status: "paid" as OrderStatus,
    total_cents: 12_500,
    placed_at: "2026-01-15T10:00:00+00:00",
    item_count: 7,
    customer: { id: 1, name: "Alice Moreno", email: "alice@example.com", lifetime_orders: 3 },
    items: [],
    ...overrides,
  };
}
