import Task from '../models/Task.js';

// @desc    Get all tasks (admin:all, user:assigned)
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({}).populate('assignedTo', 'name email');
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedTo', 'name email');
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new task(admin only)
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate, priority, attachments, todoChecklist } = req.body;

        if (!Array.isArray(assignedTo)) {
            return res.status(400).json({ message: 'assignedTo must be an array of user IDs' });
        }

        const task = await Task.create({
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            createdBy: req.user._id, // Assuming req.user is populated with the authenticated user's data
            attachments,
            todoChecklist,
        });

        const createdTask = await task.save();
        res.status(201).json({ message: "Task created successfully", createdTask });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update task by ID
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { title, description, assignedTo, dueDate },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete task by ID
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update task status by ID
// @route   PUT /api/tasks/:id/status
// @access  Private
export const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update task checklist by ID
// @route   PUT /api/tasks/:id/todo
// @access  Private
export const updateTaskChecklist = async (req, res) => {
    try {
        const { checklist } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { checklist },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dashboard data (admin only)
// @route   GET /api/tasks/dashboard-data
// @access  Private
export const getDashboardData = async (req, res) => {
    try {
        const totalTasks = await Task.countDocuments();
        const completedTasks = await Task.countDocuments({ status: 'completed' });
        const pendingTasks = await Task.countDocuments({ status: 'pending' });
        const overdueTasks = await Task.countDocuments({ dueDate: { $lt: new Date() } });

        res.status(200).json({
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user dashboard data (user only)
// @route   GET /api/tasks/user-dashboard-data
// @access  Private
export const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming req.user is populated with the authenticated user's data
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const completedTasks = await Task.countDocuments({
            assignedTo: userId,
            status: 'completed',
        });
        const pendingTasks = await Task.countDocuments({
            assignedTo: userId,
            status: 'pending',
        });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            dueDate: { $lt: new Date() },
        });

        res.status(200).json({
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};