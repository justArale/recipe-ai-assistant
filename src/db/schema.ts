import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, json } from "drizzle-orm/sqlite-core";

// export type NewUser = typeof users.$inferInsert;

// export const users = sqliteTable("users", {
//   id: integer("id", { mode: "number" }).primaryKey(),
//   name: text("name").notNull(),
//   email: text("email").notNull(),
//   createdAt: text("created_at")
//     .notNull()
//     .default(sql`(CURRENT_TIMESTAMP)`),
//   updatedAt: text("updated_at")
//     .notNull()
//     .default(sql`(CURRENT_TIMESTAMP)`),
// });

export type NewRecipe = typeof recipes.$inferInsert;

export const recipes = sqliteTable("recipes", {
  id: integer("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  ingredience: text("ingredience").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
