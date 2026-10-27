import mongoose from "mongoose";

const connectDb = async () => {
    try {
        if (!process.env.MONGODB_URI) return;
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB Connected");
    } catch (error) {
        console.error("Error connecting to database:", error.message || error);
    }
};

export default connectDb;