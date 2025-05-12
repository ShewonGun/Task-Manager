import express from 'express';
import { adminOnly, protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/export/tasks',protect,adminOnly,exportTasksReport); // Export tasks report as excel file/pdf
router.get('/export/users',protect,adminOnly,exportUsersReport); // Export users report as excel file/pdf

export default router;