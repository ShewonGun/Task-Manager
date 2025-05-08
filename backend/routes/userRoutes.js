import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware.js'; // Import your auth middleware
import { getUsers, getUserById, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// User management routes
router.get("/", protect, adminOnly, getUsers) // Get all users (admin only)
router.get("/:id", protect, getUserById) // Get user by ID (admin only)
router.delete("/:id", protect, adminOnly, deleteUser) // Delete user by ID (admin only)

export default router;