import mongoose from "mongoose"


const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("DB Connected")
    } catch (error) {
        console.error('Error connecting to database:', error)
        process.exit(1)
    }
}

export default connectDb;