import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const recipes = sqliteTable("recipes", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  machine:     text("machine").notNull(),
  duration:    real("duration").notNull(),   // seconds per craft cycle
  isAlternate: integer("is_alternate", { mode: "boolean" }).notNull().default(false),
  inputs:      text("inputs").notNull(),     // JSON array
  outputs:     text("outputs").notNull(),    // JSON array
  unlockedBy:  text("unlocked_by").notNull().default("Unknown"),
});
