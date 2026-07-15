const Task = require('../models/Task');

// Get all tasks (with filtering, sorting, pagination, and search)
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, search, sortBy, page = 1, limit = 10 } = req.query;
    let query = { user: req.user.id };

    // Search & Filters
    if (search) query.$text = { $search: search };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Sorting
    let sort = { dueDate: 1 }; // Default sort by due date ascending
    if (sortBy) {
      const parts = sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const total = await Task.countDocuments(query);

    const tasks = await Task.find(query)
      .sort(sort)
      .skip(startIndex)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new task
exports.createTask = async (req, res) => {
  try {
    req.body.user = req.user.id; // Assign logged-in user to task
    const task = await Task.create(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    
    // Ensure user owns the task
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Ensure user owns the task
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};