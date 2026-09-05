import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

interface OrderFiltersProps {
  status: OrderStatus | "";
  search: string;
  onStatusChange: (status: OrderStatus | "") => void;
  onSearchChange: (search: string) => void;
}

export default function OrderFilters({ status, search, onStatusChange, onSearchChange }: OrderFiltersProps) {
  return (
    <div className="toolbar">
      <label>
        Status
        <select value={status} onChange={(e) => onStatusChange(e.target.value as OrderStatus | "")}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Search
        <input
          type="search"
          placeholder="Reference or customer"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
    </div>
  );
}
