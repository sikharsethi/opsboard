import {
  pgTable, pgEnum, uuid, text, integer, boolean, jsonb, timestamp, index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "staff", "viewer"]);
export const orderStatusEnum = pgEnum("order_status", ["new", "packed", "shipped", "cancelled"]);
export const movementReasonEnum = pgEnum("movement_reason", ["purchase", "sale", "adjustment", "return", "import"]);
export const importStatusEnum = pgEnum("import_status", ["pending", "completed", "failed"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(), // money as integer cents, never floats
  reorderLevel: integer("reorder_level").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  status: orderStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(), // price at time of sale
});

// The ledger: current stock = SUM(quantity) per product. Negative = stock out.
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id).notNull(),
    quantity: integer("quantity").notNull(),
    reason: movementReasonEnum("reason").notNull(),
    note: text("note"),
    userId: uuid("user_id").references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)]
);

export const importJobs = pgTable("import_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  filename: text("filename").notNull(),
  status: importStatusEnum("status").notNull().default("pending"),
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  rowErrors: jsonb("row_errors"), // [{row: 12, message: "..."}]
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g. "order.shipped"
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});