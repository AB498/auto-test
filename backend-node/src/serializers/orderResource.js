/**
 * Serializes an order into the API shape.
 *
 * Relations (customer, items, and each item's product) may be eager-loaded by the
 * caller when serializing a page of orders — Sequelize's `get<Customer>()` accessors
 * always issue a query even when the relation is cached in `dataValues`, so read the
 * cached value first and only fall back to the accessor for single-order endpoints
 * that did not include the relation.
 *
 * @param {object} order an Order instance; `customer`/`items` may be pre-loaded
 * @param {object} [aggregates] precomputed per-page aggregates for list endpoints; when omitted,
 *   the two derived counts fall back to per-order queries (fine for a single order).
 * @param {Map<number, number>} [aggregates.itemCounts] order id → SUM(quantity); an order with
 *   no items has no entry and serializes as 0.
 * @param {Map<number, number>} [aggregates.lifetimeOrders] customer id → COUNT(orders)
 * @returns {Promise<object>} the serialized order
 */
export async function orderResource(order, aggregates = {}) {
  const customer = order.get("customer") ?? (await order.getCustomer());
  const items = order.get("items") ?? (await order.getItems());

  const itemCount = aggregates.itemCounts ? (aggregates.itemCounts.get(order.id) ?? 0) : await order.itemCount();
  const lifetimeOrders = aggregates.lifetimeOrders
    ? (aggregates.lifetimeOrders.get(customer.id) ?? 0)
    : await customer.countOrders();

  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    total_cents: order.totalCents,
    placed_at: order.placedAt?.toISOString() ?? null,
    item_count: itemCount,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      lifetime_orders: lifetimeOrders,
    },
    items: await Promise.all(items.map(orderItemResource)),
  };
}

export async function orderItemResource(item) {
  const product = item.get("product") ?? (await item.getProduct());

  return {
    id: item.id,
    sku: product.sku,
    name: product.name,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
  };
}
