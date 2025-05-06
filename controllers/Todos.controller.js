import Todos from "../models/todos.model.js";

// Create a new Todo
export const createNewTodo = async (req, res) => {
  try {
    const { title, description, isCompleted, date } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const newTodo = new Todos({
      title,
      description,
      isCompleted: isCompleted ?? false, // Default to false if not provided
      date: date ? new Date(date) : null, // Convert to Date or null
    });

    await newTodo.save();
    return res.status(201).json(newTodo);
  } catch (error) {
    console.error("Error in createNewTodo:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Get all Todos
export const getAllTodos = async (req, res) => {
  try {
    const todos = await Todos.find();
    return res.status(200).json(todos || []);
  } catch (error) {
    console.error("Error in getAllTodos:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Get a single Todo by ID
export const getTodoById = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todos.findById(id);

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    return res.status(200).json(todo);
  } catch (error) {
    console.error("Error in getTodoById:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Update a Todo by ID
export const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isCompleted, date } = req.body;

    const updatedTodo = await Todos.findByIdAndUpdate(
      id,
      {
        title,
        description,
        isCompleted: isCompleted ?? undefined, // Preserve existing if not provided
        date: date ? new Date(date) : undefined, // Convert to Date or preserve existing
      },
      { new: true, runValidators: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    return res.status(200).json(updatedTodo);
  } catch (error) {
    console.error("Error in updateTodo:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Delete a Todo by ID
export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTodo = await Todos.findByIdAndDelete(id);

    if (!deletedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    return res.status(200).json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTodo:", error);
    return res.status(500).json({ message: error.message });
  }
};