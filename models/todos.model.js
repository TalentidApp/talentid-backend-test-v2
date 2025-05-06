import mongoose from "mongoose";

const todosSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Todos = mongoose.model("Todos", todosSchema);

export default Todos;