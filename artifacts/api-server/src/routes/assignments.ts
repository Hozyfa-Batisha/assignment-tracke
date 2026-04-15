import { Router } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, assignmentsTable } from "@workspace/db";
import {
  CreateAssignmentBody,
  UpdateAssignmentBody,
  UpdateAssignmentParams,
  DeleteAssignmentParams,
  GetAssignmentParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res): Promise<void> => {
  req.log.info("Fetching all assignments");
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .orderBy(assignmentsTable.dueDate);

  res.json(
    assignments.map((a) => ({
      ...a,
      dueDate: a.dueDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

router.get("/summary", async (req, res): Promise<void> => {
  req.log.info("Fetching assignments summary");
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const assignments = await db.select().from(assignmentsTable);

  const total = assignments.length;
  const pending = assignments.filter((a) => a.status === "pending").length;
  const done = assignments.filter((a) => a.status === "done").length;
  const overdue = assignments.filter(
    (a) => a.status === "pending" && new Date(a.dueDate) < now
  ).length;
  const dueSoon = assignments.filter(
    (a) =>
      a.status === "pending" &&
      new Date(a.dueDate) >= now &&
      new Date(a.dueDate) <= in3days
  ).length;

  res.json({ total, pending, done, overdue, dueSoon });
});

router.get("/:id", async (req, res): Promise<void> => {
  const parsed = GetAssignmentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, parsed.data.id));

  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json({
    ...assignment,
    dueDate: assignment.dueDate.toISOString(),
    createdAt: assignment.createdAt.toISOString(),
  });
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid assignment body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, course, description, dueDate, priority } = parsed.data;

  const [created] = await db
    .insert(assignmentsTable)
    .values({
      title,
      course,
      description: description ?? null,
      dueDate: new Date(dueDate),
      priority,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    ...created,
    dueDate: created.dueDate.toISOString(),
    createdAt: created.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res): Promise<void> => {
  const paramsParsed = UpdateAssignmentParams.safeParse({
    id: Number(req.params.id),
  });
  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error.message });
    return;
  }

  const bodyParsed = UpdateAssignmentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    req.log.warn({ errors: bodyParsed.error.message }, "Invalid update body");
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const updateData: Partial<typeof assignmentsTable.$inferInsert> = {};
  const body = bodyParsed.data;

  if (body.title !== undefined) updateData.title = body.title;
  if (body.course !== undefined) updateData.course = body.course;
  if (body.description !== undefined) updateData.description = body.description ?? null;
  if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
  if (body.status !== undefined) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;

  const [updated] = await db
    .update(assignmentsTable)
    .set(updateData)
    .where(eq(assignmentsTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json({
    ...updated,
    dueDate: updated.dueDate.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res): Promise<void> => {
  const parsed = DeleteAssignmentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .delete(assignmentsTable)
    .where(eq(assignmentsTable.id, parsed.data.id));

  res.status(204).send();
});

export default router;
