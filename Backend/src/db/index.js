import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'
import express from 'express'

const connectDB= async ()=>{
    try{
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected! DB Host: ${connectionInstance.connection.host} `)

    }
    catch(error){
        console.log("MongoDB connectionr failed: ",error);
        process.exit(1); // hum throw error se bhi exit kara sakte the isse bhi 
    }
}

export default connectDB