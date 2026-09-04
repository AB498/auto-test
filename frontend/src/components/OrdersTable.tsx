"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { fetchOrders } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order, Paginated } from "@/lib/types";

export default function OrdersTable() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Order> | null>(null);

  useEffect(() => {
    // Abort the in-flight request when the page changes so a slow response
    // for an old page can never overwrite the current one.
    const controller = new AbortController();

    fetchOrders(page, controller.signal)
      .then(setResult)
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });

    return () => controller.abort();
  }, [page]);

  if (!result) {
    return <p>Loading orders…</p>;
  }

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Customer</th>
            <th>Status</th>
            <th className="num">Items</th>
            <th>Placed</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((order) => (
            <tr key={order.id}>
              <td>{order.reference}</td>
              <td>{order.customer.name}</td>
              <td>{order.status}</td>
              <td className="num">{order.item_count}</td>
              <td>{formatDate(order.placed_at)}</td>
              <td className="num">{formatMoney(order.total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={result.meta.current_page} lastPage={result.meta.last_page} onPageChange={setPage} />
    </>
  );
}
