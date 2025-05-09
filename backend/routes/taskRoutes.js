import express from 'express';
import {protect, adminOnly} from '../middlewares/authMiddleware.js';
import { getTasks, getTaskById, createTask, updateTask, deleteTask, updateTaskStatus, updateTaskChecklist, getDashboardData, getUserDashboardData } from '../controllers/taskController.js';

const router = express.Router();

// Task management routes
router.get('/dashboard-data', protect, getDashboardData);
router.get('/user-dashboard-data', protect, getUserDashboardData);
router.get('/', protect, getTasks); // Get all tasks(admin only)
router.get('/:id', protect, getTaskById); // Get task by ID
router.post('/', protect, adminOnly, createTask); // Create a new task(admin only)
router.put('/:id', protect, updateTask); // Update task by ID
router.delete('/:id', protect, adminOnly, deleteTask); // Delete task by ID
router.put('/:id/status', protect, updateTaskStatus); // Update task status by ID
router.put('/:id/todo', protect, updateTaskChecklist); // Update task checklist by ID

export default router;