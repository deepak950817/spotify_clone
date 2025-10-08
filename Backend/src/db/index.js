import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${process.env.DB_NAME}`
        );
        console.log(`MongoDB Connected: ${connectionInstance.connection.host}`);
        console.log(`Database Name: ${connectionInstance.connection.name}`);
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

export default connectDB;