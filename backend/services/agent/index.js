import "dotenv/config";
import express from "express";
import connectDb from "./config/db.js";
import router from "./routes/agent.route.js";

const port = process.env.PORT || 8003;

const app = express();
app.use(express.json());
app.use("/", router);


app.use((err, req, res, next) => {
    console.log(err)
    if (err.status) {
        return res.status(err.status).json(err.data)
    }
    return res.status(500).json({ message: `agent error ${err}` })
})

app.get('/', (req, res) => {
    res.json({ message: 'Agent server is running' });
});

app.listen(port, () => {
    console.log(`Agent server is running on port ${port}`);
    connectDb();
});
