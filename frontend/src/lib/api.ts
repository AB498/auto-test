import type { Customer, NewOrder, Order, Paginated, Product } from "./types";

const BASE_URL = "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  return res.json();
}

export function fetchOrders(page = 1, signal?: AbortSignal): Promise<Paginated<Order>> {
  return request(`/orders?page=${page}`, { signal });
}

export function fetchCustomers(): Promise<{ data: Customer[] }> {
  return request("/customers");
}

export function fetchProducts(): Promise<{ data: Product[] }> {
  return request("/products");
}

export function createOrder(order: NewOrder, options: { simulateFault?: string } = {}): Promise<{ data: Order }> {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify(order),
    headers: options.simulateFault ? { "X-Simulate-Fault": options.simulateFault } : {},
  });
}
