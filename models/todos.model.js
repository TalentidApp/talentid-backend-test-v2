
import mongoose from "mongoose";
import { todos_status } from "../utils/data";

const todosSchema = new mongoose.Schema({

    title:{

        type:String,
        required:true,
    },
    description:{

        type:String,
        required:true,
    },
    status:{

        type:String,
        enum:Object.values(todos_status),
        default:'pending',
    }

}
,{

    timestamps:true,
})

const Todos = mongoose.model('Todos', todosSchema);

export default Todos;