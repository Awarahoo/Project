import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        `\n server is running at port : ${process.env.PORT}`
    })
})
.catch((err)=>{"DB connection error", err}) ;
