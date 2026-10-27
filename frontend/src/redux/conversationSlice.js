import { createSlice } from '@reduxjs/toolkit';

const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

const initialState = {
    conversations: [],
    activeConversationId: null,
    isSidebarOpen: !isMobileScreen,
};

export const conversationSlice = createSlice({
    name: 'conversation',
    initialState,
    reducers: {
        setConversations: (state, action) => {
            state.conversations = action.payload;
        },
        addConversation: (state, action) => {
            state.conversations.unshift(action.payload);
            state.activeConversationId = action.payload._id;
        },
        setActiveConversationId: (state, action) => {
            state.activeConversationId = action.payload;
        },
        updateConversationTitle: (state, action) => {
            const { conversationId, title } = action.payload;
            const conv = state.conversations.find((c) => c._id === conversationId);
            if (conv) {
                conv.title = title;
            }
        },
        moveConversationToTop: (state, action) => {
            const conversationId = action.payload;
            const index = state.conversations.findIndex((c) => c._id === conversationId);
            if (index > -1) {
                const [item] = state.conversations.splice(index, 1);
                state.conversations.unshift(item);
            }
        },
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setIsSidebarOpen: (state, action) => {
            state.isSidebarOpen = action.payload;
        },
    },
});

export const {
    setConversations,
    addConversation,
    setActiveConversationId,
    updateConversationTitle,
    moveConversationToTop,
    toggleSidebar,
    setIsSidebarOpen,
} = conversationSlice.actions;

export default conversationSlice.reducer;
