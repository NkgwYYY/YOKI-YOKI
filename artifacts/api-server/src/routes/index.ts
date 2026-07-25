import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import authRouter from "./auth";
import syncRouter from "./sync";
import insightRouter from "./insight";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(authRouter);
router.use(syncRouter);
router.use(insightRouter);

export default router;
