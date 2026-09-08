import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import OrdersTable from "@/components/OrdersTable";
import { makeOrder, mockFetch, MockResponse, requestedUrls } from "./test-utils";

/**
 * Fake /api/orders: returns a single order whose reference echoes the query,
 * e.g. "shipped/-/p2" = status=shipped, no search, page 2.
 */
function ordersApi(url: URL, delays: Record<string, number> = {}): MockResponse {
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";
  const page = Number(url.searchParams.get("page") || 1);

  return {
    delay: delays[status] ?? 0,
    body: {
      data: [makeOrder(page, { reference: `${status || "any"}/${search || "-"}/p${page}`, status: (status || "paid") as never })],
      meta: { current_page: page, last_page: 3, total: 3 },
    },
  };
}

describe("OrdersTable", () => {
  it("shows status badges, item counts and pagination together", async () => {
    mockFetch((url) => ordersApi(url));
    render(<OrdersTable />);

    expect(await screen.findByText("any/-/p1")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Items" })).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("paid", { selector: ".badge" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("moves between pages", async () => {
    mockFetch((url) => ordersApi(url));
    render(<OrdersTable />);
    await screen.findByText("any/-/p1");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("any/-/p2")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("goes back to the first page when a filter changes", async () => {
    mockFetch((url) => ordersApi(url));
    render(<OrdersTable />);
    await screen.findByText("any/-/p1");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("any/-/p2");

    await userEvent.selectOptions(screen.getByLabelText("Status"), "shipped");

    expect(await screen.findByText("shipped/-/p1")).toBeInTheDocument();
  });

  it("debounces search and keeps the status filter", async () => {
    const fetchMock = mockFetch((url) => ordersApi(url));
    render(<OrdersTable />);
    await screen.findByText("any/-/p1");

    await userEvent.selectOptions(screen.getByLabelText("Status"), "paid");
    await screen.findByText("paid/-/p1");
    await userEvent.type(screen.getByLabelText("Search"), "Moreno");

    expect(await screen.findByText("paid/Moreno/p1")).toBeInTheDocument();
    const searches = requestedUrls(fetchMock, "/api/orders").map((url) => url.searchParams.get("search"));
    expect(searches.filter((s) => s && s !== "Moreno")).toEqual([]);
  });

  it("never lets a slow, outdated response overwrite a newer one", async () => {
    mockFetch((url) => ordersApi(url, { cancelled: 400 }));
    render(<OrdersTable />);
    await screen.findByText("any/-/p1");

    await userEvent.selectOptions(screen.getByLabelText("Status"), "cancelled");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "paid");

    expect(await screen.findByText("paid/-/p1")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 600));
    await waitFor(() => expect(screen.queryByText("cancelled/-/p1")).not.toBeInTheDocument());
    expect(screen.getByText("paid/-/p1")).toBeInTheDocument();
  });
});
