import { describe, expect, it } from "vitest";
import { createOrder, fetchOrders } from "@/lib/api";
import { mockFetch } from "./test-utils";

const order = { customer_id: 1, items: [{ product_id: 10, quantity: 1 }] };

describe("api client", () => {
  it("resolves with the JSON body on success", async () => {
    mockFetch(() => ({ body: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } }));

    await expect(fetchOrders()).resolves.toMatchObject({ data: [] });
  });

  it("rejects with the server's message when the API returns an error", async () => {
    mockFetch(() => ({ status: 503, body: { message: "Orders are temporarily unavailable. Please retry." } }));

    await expect(createOrder(order)).rejects.toThrow("Orders are temporarily unavailable. Please retry.");
  });

  it("exposes the HTTP status on the rejected error", async () => {
    mockFetch(() => ({ status: 422, body: { message: "Only 1 of MUG-1 left in stock.", errors: { items: ["…"] } } }));

    await expect(createOrder(order)).rejects.toMatchObject({ status: 422, message: "Only 1 of MUG-1 left in stock." });
  });
});
