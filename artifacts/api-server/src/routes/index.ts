import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import syncRouter from "./sync";
import insightRouter from "./insight";
import storageRouter from "./storage";
import homeCommentRouter from "./homeComment";
import itemRouter from "./items";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(syncRouter);
router.use(insightRouter);
router.use(storageRouter);
router.use(homeCommentRouter);
router.use(itemRouter);
router.use(communityRouter);

export default router;
