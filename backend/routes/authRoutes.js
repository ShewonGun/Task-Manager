import express from 'express';
import { registerUser, loginUser, getUserProfile, updateUserProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js'; // Import the protect middleware
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Auth Routes
router.post('/register', registerUser); // Register a new user
router.post('/login', loginUser); // Login a user
router.get('/profile', protect, getUserProfile); // Get user profile
router.put('/update-profile', protect, updateUserProfile); // Update user profile

router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
}) // Upload image

export default router;