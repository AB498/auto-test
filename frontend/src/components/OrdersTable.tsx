"use client";

import { useEffect, useState } from "react";
import OrderFilters from "@/components/OrderFilters";
import StatusBadge from "@/components/StatusBadge";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchOrders } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setLoading(true);
    fetchOrders({ status, search: debouncedSearch }).then((res) => {
      setOrders(res.data);
      setLoading(false);
    });
  }, [status, debouncedSearch]);

  return (
    <>
      <OrderFilters status={status} search={search} onStatusChange={setStatus} onSearchChange={setSearch} />

      {loading ? (
        <p>Loading orders…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Placed</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.reference}</td>
                <td>
                  {order.customer.name}
                  <br />
                  <small>{order.customer.lifetime_orders} orders</small>
                </td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>{formatDate(order.placed_at)}</td>
                <td className="num">{formatMoney(order.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
