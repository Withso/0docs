import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import pagesRouter from "./pages";
import sectionsRouter from "./sections";
import blocksRouter from "./blocks";
import navGroupsRouter from "./navgroups";
import tabsRouter from "./tabs";
import designRouter from "./design";
import versionsRouter from "./versions";
import profilesRouter from "./profiles";
import feedbackRouter from "./feedback";
import askDocsRouter from "./ask-docs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(pagesRouter);
router.use(sectionsRouter);
router.use(blocksRouter);
router.use(navGroupsRouter);
router.use(tabsRouter);
router.use(designRouter);
router.use(versionsRouter);
router.use(profilesRouter);
router.use(feedbackRouter);
router.use(askDocsRouter);

export default router;
