import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assignmentsRouter from "./assignments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/assignments", assignmentsRouter);

export default router;
