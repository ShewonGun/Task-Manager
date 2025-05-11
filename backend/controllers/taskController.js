import Task from '../models/Task.js';

// @desc    Get all tasks (admin:all, user:assigned)
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status) {
            filter.status = status;
        }
        let tasks;
        if (req.user.role === 'admin') {
            tasks = await Task.find(filter).populate(
                'assignedTo', 'name email profileImageUrl'
            );
        } else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate(
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
                    completedTodoCount: completedCount,
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

        await task.deleteOne()
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
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const isAssigned = task.assignedTo.some(
            (userId) => userId.toString() === req.user._id.toString()
        );

        if (!isAssigned && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        const newStatus = req.body.status;
        if (!newStatus) {
            return res.status(400).json({ message: 'Status is required' });
        }

        task.status = newStatus;

        if (newStatus === "Completed") {
            task.todoChecklist.forEach(item => item.completed = true);
            task.progress = 100;
        }

        await task.save();

        res.status(200).json({ message: 'Task status updated successfully', task });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};



// @desc    Update task checklist by ID
// @route   PUT /api/tasks/:id/todo
// @access  Private
export const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (!task.assignedTo.includes(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        task.todoChecklist = todoChecklist

        // Auto update progress based on completed checklist items
        const completedCount = task.todoChecklist.filter(item => item.completed).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        // Auto mark task as completed if all checklist items are done
        if (task.progress === 100) {
            task.status = 'Completed';
        } else if (task.progress > 0) {
            task.status = 'In Progress';
        } else {
            task.status = 'Pending';
        }
        await task.save();
        const updatedTask = await Task.findById(req.params.id).populate('assignedTo', 'name email profileImageUrl');
        res.status(200).json({ message: 'Task checklist updated successfully', task: updatedTask });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dashboard data (admin only)
// @route   GET /api/tasks/dashboard-data
// @access  Private
export const getDashboardData = async (req, res) => {
    try {
        // Fetch statistics
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: 'Pending' });
        const completedTasks = await Task.countDocuments({ status: 'Completed' });
        const overdueTasks = await Task.countDocuments({
            dueDate: { $lt: new Date() },
            status: { $ne: 'Completed' },
        });

        // Ensure all possible statuses are included
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);
        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for key
            acc[formattedKey] =
                taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }
            , {});

        taskDistribution["All"] = totalTasks; // Add total tasks to distribution

        // Ensure all possible priorities are included
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 },
                },
            },
        ]);
        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            const formattedKey = priority.replace(/\s+/g, ""); // Remove spaces for key
            acc[formattedKey] =
                taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        //Fetch recent 10 tasks
        const recentTasks = await Task.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt")

        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
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
       const userId = req.user._id; //Only fetch data for the logged-in user

       // Fetch statistics
         const totalTasks = await Task.countDocuments({ assignedTo: userId });
            const pendingTasks = await Task.countDocuments({
                assignedTo: userId,
                status: 'Pending',
            });
            const completedTasks = await Task.countDocuments({
                assignedTo: userId,
                status: 'Completed',
            });
            const overdueTasks = await Task.countDocuments({
                assignedTo: userId,
                dueDate: { $lt: new Date() },
                status: { $ne: 'Completed' },
            });

            // Task distribution by status
            const taskStatuses = ["Pending", "In Progress", "Completed"];
            const taskDistributionRaw = await Task.aggregate([
                {
                    $match: { assignedTo: userId },
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]);
            const taskDistribution = taskStatuses.reduce((acc, status) => {
                const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for key
                acc[formattedKey] =
                    taskDistributionRaw.find((item) => item._id === status)?.count || 0;
                return acc;
            }, {});
            taskDistribution["All"] = totalTasks; // Add total tasks to distribution

            // Task distribution by priority
            const taskPriorities = ["Low", "Medium", "High"];
            const taskPriorityLevelsRaw = await Task.aggregate([
                {
                    $match: { assignedTo: userId },
                },
                {
                    $group: {
                        _id: "$priority",
                        count: { $sum: 1 },
                    },
                },
            ]);
            const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
                const formattedKey = priority.replace(/\s+/g, ""); // Remove spaces for key
                acc[formattedKey] =
                    taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
                return acc;
            }, {});

            // Fetch recent 10 tasks for the logged-in user
            const recentTasks = await Task.find({ assignedTo: userId })
                .sort({ createdAt: -1 })
                .limit(10)
                .select("title status priority dueDate createdAt");
            
        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};