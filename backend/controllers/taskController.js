import Task from '../models/Task.js';

// @desc    Get all tasks (admin:all, user:assigned)
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
    try {
        const {status} = req.query;
        let filter = {};
        if(status) {
            filter.status = status;
        }
        let tasks;
        if (req.user.role === 'admin') {
            tasks = await Task.find(filter).populate(
                'assignedTo', 'name email profileImageUrl'
            );
        } else {
            tasks = await Task.find({...filter, assignedTo:req.user._id}).populate(
                'assignedTo', 'name email profileImageUrl'
            );
        }

        // Add completed todo checklist count to each task
        tasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoChecklist.filter(
                    (item) => item.completed
                ).length;
                return {
                    ...task._doc,
                    completedTodoCount:completedCount,
                };
            })
        );

        // Status summary counts
        const allTasks = await Task.countDocuments(
            req.user.role === 'admin' ? {} : { assignedTo: req.user._id }
        );

        const pendingTasks = await Task.countDocuments({
            ...filter,
            status: 'Pending',
            ...(req.user.role !== 'admin' && { assignedTo: req.user._id }),
        });

        const inProgressTasks = await Task.countDocuments({
            ...filter,
            status: 'In Progress',
            ...(req.user.role !== 'admin' && { assignedTo: req.user._id }),
        });

        const completedTasks = await Task.countDocuments({
            ...filter,
            status: 'Completed',
            ...(req.user.role !== 'admin' && { assignedTo: req.user._id }),
        });

        res.json({
            tasks,
            statusSummary: {
                all: allTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks,
            },
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedTo', 'name email profileImageUrl');
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
        const task = await Task.findByIdAndUpdate(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return res.status(400).json({ message: 'assignedTo must be an array of user IDs' });
            }
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();
        res.status(200).json({ message: "Task updated successfully", updatedTask });
        
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