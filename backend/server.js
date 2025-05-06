import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import connectDB from './config/db.js'; // Make sure the file exports using `export default`
import authRoutes from './routes/authRoutes.js'; // Import your auth routes

dotenv.config();


const app = express();

// Middleware to handle CORS
app.use(cors(
    {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }
));

// Miiddleware
app.use(express.json());


// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth",authRoutes);
//app.use("/api/users", userRoutes);
//app.use("/api/tasks", taskRoutes);
//app.use("/api/reports", retportRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});