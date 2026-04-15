import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  course: text("course").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
