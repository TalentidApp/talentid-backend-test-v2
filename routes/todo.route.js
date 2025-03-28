import express from "express";
import {
  createNewTodo,
  getAllTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
} from "../controllers/Todos.controller.js";

const router = express.Router();

import protectRoute from "../middlewares/protectRoute.middleware.js";

router.post("/createNewTodo",protectRoute,createNewTodo);   // Create a new todo
router.get("/getAllTodos",protectRoute,getAllTodos);      // Get all todos
router.get("/getTodoById/:id",protectRoute,getTodoById);   // Get a single todo by ID
router.put("/update-todo/:id",protectRoute,updateTodo);    // Update a todo by ID
router.delete("/getTodoById/:id",protectRoute,deleteTodo); // Delete a todo by ID

export default router;
