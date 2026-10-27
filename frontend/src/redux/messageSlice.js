import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    messages: [],
    artifacts: [],
    isLoading: false,
    selectedAgent: 'auto', // auto, coding, search, vision, pdf, ppt, chat
    activeArtifact: null, // { title, language, content, type, files }
    isArtifactOpen: false,
};

export const messageSlice = createSlice({
    name: 'message',
    initialState,
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        setIsLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setSelectedAgent: (state, action) => {
            state.selectedAgent = action.payload;
        },
        setArtifacts: (state, action) => {
            state.artifacts = action.payload || [];
        },
        addArtifact: (state, action) => {
            if (action.payload) {
                state.artifacts.push(action.payload);
            }
        },
        setActiveArtifact: (state, action) => {
            state.activeArtifact = action.payload;
            state.isArtifactOpen = !!action.payload;
        },
        toggleArtifactOpen: (state) => {
            state.isArtifactOpen = !state.isArtifactOpen;
        },
        appendStreamChunk: (state, action) => {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = (lastMsg.content || '') + action.payload;
            }
        },
        updateLastAssistantMessage: (state, action) => {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                Object.assign(lastMsg, action.payload);
            }
        },
        setStreamingStatus: (state, action) => {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.status = action.payload;
                if (action.payload) {
                    const currentSteps = lastMsg.steps || [];
                    if (!currentSteps.includes(action.payload)) {
                        lastMsg.steps = [...currentSteps, action.payload];
                    }
                }
            }
        },
        setIsArtifactOpen: (state, action) => {
            state.isArtifactOpen = action.payload;
        },
    },
});

export const {
    setMessages,
    addMessage,
    appendStreamChunk,
    updateLastAssistantMessage,
    setStreamingStatus,
    setIsLoading,
    setSelectedAgent,
    setArtifacts,
    addArtifact,
    setActiveArtifact,
    toggleArtifactOpen,
    setIsArtifactOpen,
} = messageSlice.actions;

export default messageSlice.reducer;
