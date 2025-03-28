
import mongoose from "mongoose";
import { todos_status } from "../utils/data.js";

const todosSchema = new mongoose.Schema({

    title:{

        type:String,
        required:true,
    },
    description:{

        type:String,
        required:true,
    },
    isCompleted:{

        type:Boolean,
        default:false,
    }

}
,{

    timestamps:true,
})

const Todos = mongoose.model('Todos', todosSchema);

export default Todos;