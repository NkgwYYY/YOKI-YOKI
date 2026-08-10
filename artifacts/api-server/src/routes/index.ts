import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import syncRouter from "./sync";
import insightRouter from "./insight";
import storageRouter from "./storage";
import homeCommentRouter from "./homeComment";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(syncRouter);
router.use(insightRouter);
router.use(storageRouter);
router.use(homeCommentRouter);

export default router;
