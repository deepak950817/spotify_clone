//  import dotenv from 'dotenv'
//  dotenv.config({
//     path: './.env'
// }) // ese bhi kar sakte hai lekin bahut new feature hai


//  //or 
//  // require('dotenv').config({path:"./env"}) // path me dala hai ki home directory ke ander hi env hai

// import app from './app.js'
// import connectDB from './db/index.js'

// connectDB()
// .then(()=>{
//     app.on("error",(err)=>{
//         console.log("Err: ",err);
//         throw err;
//     })
//     app.listen(process.env.PORT || 7000, ()=>{
//         console.log(`Server is running at port : ${process.env.PORT}`);
//     }) //hum chahte hai connect hote hi server bhi on ho jaye
// })
// .catch((err)=>{
//     console.log("MongoDb connection failed: ",err);
// })

// // as async await tha to promise return karta to acche se handle kar liya

import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './db/index.js';

dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 7000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`);
    });

    server.on("error", (err) => {
      console.error("Server Error:", err);
      throw err;
    });
  })
  .catch((err) => {
    console.error("MongoDb connection failed:", err);
  });
