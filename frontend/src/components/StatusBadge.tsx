import type { OrderStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
