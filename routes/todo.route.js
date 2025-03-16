import express from "express";
import {
  createNewTodo,
  getAllTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
} from "../controllers/Todos.controller.js";

const router = express.Router();

router.post("/", createNewTodo);   // Create a new todo
router.get("/", getAllTodos);      // Get all todos
router.get("/:id", getTodoById);   // Get a single todo by ID
router.put("/:id", updateTodo);    // Update a todo by ID
router.delete("/:id", deleteTodo); // Delete a todo by ID

export default router;
