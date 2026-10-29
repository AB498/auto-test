import { Router } from "express";
import { col, fn, Op } from "sequelize";
import { isPositiveInt, validator } from "../http/validate.js";
import { Customer, Order, ORDER_STATUSES, OrderItem, Product } from "../models/index.js";
import { orderResource } from "../serializers/orderResource.js";
import { placeOrder } from "../services/placeOrder.js";
import { paginated } from "./paginate.js";

export const ordersRouter = Router();

ordersRouter.get("/", async (req, res) => {
  const { status, search } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Number(req.query.per_page) || 15;

  const v = validator();
  v.check("status", !status || ORDER_STATUSES.includes(status), "The selected status is invalid.");
  v.check("search", !search || String(search).length <= 100, "The search field must not be greater than 100 characters.");
  v.passOrThrow();

  // Status and search must compose (AND), not overwrite each other.
  const conditions = [];
  if (status) conditions.push({ status });

  if (search) {
    const customers = await Customer.findAll({ attributes: ["id"], where: { name: { [Op.like]: `%${search}%` } } });

    conditions.push({
      [Op.or]: [{ reference: { [Op.like]: `%${search}%` } }, { customerId: customers.map((c) => c.id) }],
    });
  }

  const where = conditions.length > 0 ? { [Op.and]: conditions } : {};

  const { rows, count } = await Order.findAndCountAll({
    where,
    order: [["placedAt", "DESC"]],
    limit: perPage,
    offset: (page - 1) * perPage,
    distinct: true,
    include: [{ association: "customer" }, { association: "items", include: [{ association: "product" }] }],
  });

  // Per-page aggregates for the two derived counts the serializer reports.
  // Grouped queries keyed by parent id: one per aggregate, regardless of page size.
  const itemCounts = new Map();
  const lifetimeOrders = new Map();
  if (rows.length > 0) {
    const itemSums = await OrderItem.findAll({
      attributes: ["orderId", [fn("SUM", col("quantity")), "quantitySum"]],
      where: { orderId: rows.map((row) => row.id) },
      group: ["orderId"],
      raw: true,
    });
    for (const { orderId, quantitySum } of itemSums) itemCounts.set(orderId, Number(quantitySum));

    const orderCounts = await Order.findAll({
      attributes: ["customerId", [fn("COUNT", col("id")), "orderCount"]],
      where: { customerId: [...new Set(rows.map((row) => row.customerId))] },
      group: ["customerId"],
      raw: true,
    });
    for (const { customerId, orderCount } of orderCounts) lifetimeOrders.set(customerId, Number(orderCount));
  }

  const data = await Promise.all(rows.map((order) => orderResource(order, { itemCounts, lifetimeOrders })));

  res.json(paginated(req, data, { page, perPage, total: count }));
});

ordersRouter.get("/:id", async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });

  res.json({ data: await orderResource(order) });
});

ordersRouter.post("/", async (req, res) => {
  const { customer_id: customerId, items } = req.body ?? {};

  const v = validator();
  v.check("customer_id", isPositiveInt(customerId), "The customer id field is required.");
  if (v.check("items", Array.isArray(items) && items.length > 0, "The items field is required.")) {
    const seen = new Set();
    items.forEach((item, i) => {
      v.check(`items.${i}.product_id`, isPositiveInt(item?.product_id), `The items.${i}.product_id field is required.`);
      v.check(`items.${i}.product_id`, !seen.has(item?.product_id), `The items.${i}.product_id field has a duplicate value.`);
      v.check(
        `items.${i}.quantity`,
        isPositiveInt(item?.quantity) && item.quantity <= 100,
        `The items.${i}.quantity field must be between 1 and 100.`,
      );
      seen.add(item?.product_id);
    });
  }
  v.passOrThrow();

  const customer = await Customer.findByPk(customerId);
  v.check("customer_id", customer !== null, "The selected customer id is invalid.");
  const productIds = items.map((item) => item.product_id);
  const found = await Product.count({ where: { id: productIds } });
  v.check("items", found === productIds.length, "One or more selected products are invalid.");
  v.passOrThrow();

  const order = await placeOrder(customer, items);

  res.status(201).json({ data: await orderResource(order) });
});
