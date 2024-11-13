// Define a schema and model

import mongoose from "mongoose";
const countSchema = new mongoose.Schema({
    endpoint: String,
    count: { type: Number, default: 0 },
  });

const Counter = mongoose.model('Counter', countSchema);

export default Counter;



