import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import connectDb from "./config/db.js";
import router from "./routes/auth.route.js";

const port = process.env.PORT || 8001;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/", router);

app.get('/', (req, res) => {
    res.json({ message: 'Auth server is running' });
});

app.listen(port, () => {
    console.log(`Auth server is running on port ${port}`);
    connectDb();
});