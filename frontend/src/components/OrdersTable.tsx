"use client";

import { useEffect, useState } from "react";
import { fetchOrders } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((res) => {
      setOrders(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p>Loading orders…</p>;
  }

  return (
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
            <td>{order.customer.name}</td>
            <td>{order.status}</td>
            <td>{formatDate(order.placed_at)}</td>
            <td className="num">{formatMoney(order.total_cents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
