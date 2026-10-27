import mongoose from "mongoose";

const artifactsSchema = new mongoose.Schema({
    id: Number,
    type: String,
    title: String,
    files: [{
        name: String,
        content: String,
    }, { _id: false }],
}, { _id: false });

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
    },
    role: {
        type: String,
        enum: ["user", "assistant"]
    },
    content: String,
    images: [String],
    artifacts: [artifactsSchema]
}, { timestamps: true });

const Message = mongoose.model("Message", MessageSchema);

export default Message;