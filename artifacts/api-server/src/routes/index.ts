import { Router } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import plansRouter from "./plans";
import workoutsRouter from "./workouts";
import profileRouter from "./profile";

const router = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/plans", plansRouter);
router.use("/workouts", workoutsRouter);
router.use("/profile", profileRouter);

export default router;
