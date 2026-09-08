import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import NewOrderForm from "@/components/NewOrderForm";
import { makeOrder, mockFetch, MockResponse } from "./test-utils";

function api(orderResponse: MockResponse) {
  return mockFetch((url, init) => {
    if (url.pathname === "/api/customers") {
      return { body: { data: [{ id: 1, name: "Alice Moreno", email: "alice@example.com" }] } };
    }
    if (url.pathname === "/api/products") {
      return { body: { data: [{ id: 10, sku: "MUG-1", name: "Mug", price_cents: 1000, stock: 4 }] } };
    }
    if (url.pathname === "/api/orders" && init?.method === "POST") {
      return orderResponse;
    }
    throw new Error(`Unexpected request ${url}`);
  });
}

async function fillAndSubmit() {
  render(<NewOrderForm />);
  await screen.findByRole("option", { name: "Alice Moreno" });
  await screen.findByRole("option", { name: /Mug/ });
  await userEvent.selectOptions(screen.getByLabelText("Customer"), "1");
  await userEvent.selectOptions(screen.getByLabelText("Product"), "10");
  await userEvent.click(screen.getByRole("button", { name: "Place order" }));
}

describe("NewOrderForm", () => {
  it("confirms a placed order", async () => {
    api({ status: 201, body: { data: makeOrder(42, { reference: "ORD-000042", total_cents: 1000 }) } });

    await fillAndSubmit();

    expect(await screen.findByRole("status")).toHaveTextContent("ORD-000042");
  });

  it("shows the server error, keeps the user's input and does not claim success", async () => {
    api({ status: 503, delay: 50, body: { message: "We could not place your order. Please try again." } });

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not place your order. Please try again.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Customer")).toHaveValue("1");
    expect(screen.getByLabelText("Product")).toHaveValue("10");
  });

  it("prevents double submission while the order is being placed", async () => {
    const fetchMock = api({ status: 201, delay: 200, body: { data: makeOrder(42) } });

    await fillAndSubmit();
    expect(screen.getByRole("button", { name: /Plac/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Plac/ }));

    await screen.findByRole("status");
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1),
    );
  });
});
