import "dotenv/config";
import express from "express";
import connectDb from "./config/db.js";
import router from "./routes/chat.routes.js";

const port = process.env.PORT || 8002;

const app = express();
app.use(express.json());
app.use("/", router);

app.get('/', (req, res) => {
    res.json({ message: 'Chat server is running' });
});

app.listen(port, () => {
    console.log(`Chat server is running on port ${port}`);
    connectDb();
});
