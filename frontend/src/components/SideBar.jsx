import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    FiPlus,
    FiMessageSquare,
    FiTrash2,
    FiLogOut,
    FiSidebar,
    FiSearch,
    FiMoreHorizontal,
    FiCheck,
    FiEdit2,
    FiShare2
} from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import { motion, AnimatePresence } from 'motion/react';
import {
    setConversations,
    setActiveConversationId,
    toggleSidebar,
    setIsSidebarOpen
} from '../redux/conversationSlice';
import { setMessages, setIsLoading } from '../redux/messageSlice';
import { clearUser } from '../redux/userSlice';
import api from '../../utils/axios';

function SideBar() {
    const dispatch = useDispatch();
    const { userData } = useSelector((state) => state.user);
    const { conversations, activeConversationId, isSidebarOpen } = useSelector((state) => state.conversation);
    const { messages } = useSelector((state) => state.message);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [pinnedIds, setPinnedIds] = useState([]); // UI state for pinned conversations
    const [toastMessage, setToastMessage] = useState('');
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    const menuRef = useRef(null);

    // Track viewport width for responsive mobile drawer
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show temporary toast notification
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 2500);
    };

    // Fetch conversations on load
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await api.get('/chat/get-conversations');
                if (res.data?.success && res.data.conversations) {
                    const convList = res.data.conversations;
                    dispatch(setConversations(convList));

                    // Check if URL explicitly has /c/:id or /chat/:id
                    const match = window.location.pathname.match(/\/(?:c|chat)\/([a-zA-Z0-9_-]+)/);
                    const urlConvId = match ? match[1] : null;

                    if (urlConvId && convList.some((c) => c._id === urlConvId)) {
                        selectConversation(urlConvId);
                    }
                }
            } catch (err) {
                console.error('Failed to load conversations:', err);
            }
        };
        fetchConversations();
    }, [dispatch]);

    // Create / Switch to New Chat
    const handleNewChat = () => {
        dispatch(setActiveConversationId(null));
        dispatch(setMessages([]));
        window.history.pushState(null, '', '/');
        window.history.replaceState(null, '', '/');
        if (isMobile) {
            dispatch(setIsSidebarOpen(false));
        }
    };

    // Select Conversation and load messages
    const selectConversation = async (convId) => {
        if (isMobile) {
            dispatch(setIsSidebarOpen(false));
        }
        if (convId === activeConversationId) return;
        dispatch(setActiveConversationId(convId));
        window.history.pushState(null, '', `/c/${convId}`);
        try {
            const res = await api.get(`/chat/get-messages/${convId}`);
            if (res.data?.success) {
                dispatch(setMessages(res.data.messages || []));
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    // Update conversation title
    const handleUpdateTitle = async (convId) => {
        if (!editTitle.trim()) {
            setEditingId(null);
            return;
        }
        try {
            const res = await api.post('/chat/update-conversation', {
                conversationId: convId,
                title: editTitle.trim(),
            });
            if (res.data?.success) {
                dispatch(
                    setConversations(
                        conversations.map((c) =>
                            c._id === convId ? { ...c, title: editTitle.trim() } : c
                        )
                    )
                );
                showToast('Chat renamed');
            }
        } catch (err) {
            console.error('Update title error:', err);
        } finally {
            setEditingId(null);
        }
    };

    // Delete Conversation
    const handleDeleteConversation = async (convId) => {
        setOpenMenuId(null);
        try {
            const res = await api.get(`/chat/delete-conversation/${convId}`);
            if (res.data?.success) {
                const updated = conversations.filter((c) => c._id !== convId);
                dispatch(setConversations(updated));

                if (activeConversationId === convId) {
                    if (updated.length > 0) {
                        selectConversation(updated[0]._id);
                    } else {
                        dispatch(setActiveConversationId(null));
                        dispatch(setMessages([]));
                    }
                }
                showToast('Chat deleted');
            }
        } catch (err) {
            console.error('Delete conversation error:', err);
        }
    };

    // Pin / Unpin Conversation (UI State)
    const handleTogglePin = (convId) => {
        setOpenMenuId(null);
        if (pinnedIds.includes(convId)) {
            setPinnedIds(pinnedIds.filter((id) => id !== convId));
            showToast('Chat unpinned');
        } else {
            setPinnedIds([...pinnedIds, convId]);
            showToast('Chat pinned to top');
        }
    };

    // Share Conversation
    const handleShare = (convId) => {
        setOpenMenuId(null);
        const url = `${window.location.origin}/chat/${convId}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            showToast('Share link copied to clipboard');
        }
    };

    // Handle user logout
    const handleLogout = async () => {
        try {
            await api.get('/auth/logout');
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            dispatch(clearUser());
            dispatch(setConversations([]));
            dispatch(setActiveConversationId(null));
            dispatch(setMessages([]));
            if (isMobile) {
                dispatch(setIsSidebarOpen(false));
            }
        }
    };

    // Sort: Pinned chats first, then remaining
    const filteredConversations = conversations
        .filter((c) =>
            (c.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const aPinned = pinnedIds.includes(a._id);
            const bPinned = pinnedIds.includes(b._id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
        });

    return (
        <AnimatePresence>
            {isSidebarOpen && (
                <>
                    {/* Mobile Dark Blurred Backdrop */}
                    {isMobile && (
                        <motion.div
                            key="sidebar-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => dispatch(setIsSidebarOpen(false))}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden cursor-pointer"
                        />
                    )}

                    <motion.aside
                        key="sidebar-panel"
                        initial={isMobile ? { x: -280, opacity: 0 } : { width: 0, opacity: 0 }}
                        animate={isMobile ? { x: 0, opacity: 1 } : { width: 280, opacity: 1 }}
                        exit={isMobile ? { x: -280, opacity: 0 } : { width: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
                        className={`h-screen bg-[#171717] border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none overflow-hidden ${
                            isMobile
                                ? 'fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl'
                                : 'relative z-30'
                        }`}
                        style={!isMobile ? { width: 280 } : undefined}
                    >
                    <div className="w-[280px] h-full flex flex-col justify-between">
                        {/* Top Area: Logo & New Chat */}
                        <div className="p-3.5 flex flex-col gap-3">
                            {/* Header & Collapse */}
                            <div className="flex items-center justify-between px-1">
                                <a href='/' className="flex items-center gap-2.5">
                                    <img src="/jupiter-logo.png" alt="logo" className="h-9 w-9 rounded-lg object-cover" />
                                    <span className="font-semibold text-sm tracking-tight text-white">JupiterAI</span>
                                </a>
                                <button
                                    onClick={() => dispatch(toggleSidebar())}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                                    title="Close sidebar"
                                >
                                    <FiSidebar size={17} />
                                </button>
                            </div>

                            {/* New Chat Button */}
                            <button
                                onClick={handleNewChat}
                                // disabled={!messages || messages.length === 0}
                                // className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition duration-150 shadow-sm group ${!messages || messages.length === 0
                                //     ? 'bg-white/[0.02] text-zinc-500 border-white/[0.04] cursor-not-allowed opacity-60'
                                //     : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border-white/[0.08] cursor-pointer'
                                //     }`}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition duration-150 shadow-sm group bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border-white/[0.08] cursor-pointer
                        }`}
                                title={!messages || messages.length === 0 ? 'Current chat is already empty' : 'New chat'}
                            >
                                <div className="flex items-center gap-2.5 text-sm font-medium">
                                    <FiPlus size={18} className={!messages || messages.length === 0 ? 'text-zinc-600' : 'text-zinc-400 group-hover:text-white transition'} />
                                    <span>New chat</span>
                                </div>
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-500 border border-white/[0.05]">
                                    ⌘K
                                </span>
                            </button>

                            {/* Search Conversations */}
                            {conversations.length > 5 && (
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search chats..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.03] text-zinc-200 placeholder-zinc-500 rounded-lg border border-white/[0.05] focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Conversation History List */}
                        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                            <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                                <span>Recent Chats</span>
                                {pinnedIds.length > 0 && (
                                    <span className="text-[10px] text-zinc-500 lowercase">
                                        {pinnedIds.length} pinned
                                    </span>
                                )}
                            </div>

                            {filteredConversations.length === 0 ? (
                                <div className="text-center py-8 px-4 text-xs text-zinc-500">
                                    No conversations found
                                </div>
                            ) : (
                                filteredConversations.map((conv) => {
                                    const isActive = conv._id === activeConversationId;
                                    const isPinned = pinnedIds.includes(conv._id);
                                    const isMenuOpen = openMenuId === conv._id;

                                    return (
                                        <div
                                            key={conv._id}
                                            onClick={() => selectConversation(conv._id)}
                                            className={`group relative flex items-center justify-between px-3 h-9 rounded-xl text-xs font-medium transition-colors duration-150 cursor-pointer ${isActive
                                                ? 'bg-white/[0.1] text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                {isPinned ? (
                                                    <BsPinAngle
                                                        size={14}
                                                        className="text-amber-400 shrink-0"
                                                        title="Pinned"
                                                    />
                                                ) : (
                                                    <FiMessageSquare
                                                        size={14}
                                                        className={isActive ? 'text-indigo-400 shrink-0' : 'text-zinc-500 shrink-0'}
                                                    />
                                                )}

                                                {editingId === conv._id ? (
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onBlur={() => handleUpdateTitle(conv._id)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle(conv._id)}
                                                        autoFocus
                                                        className="bg-zinc-800 text-white px-1.5 py-0.5 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className="truncate">{conv.title || 'New Chat'}</span>
                                                )}
                                            </div>

                                            {/* Three Dots Action Button */}
                                            <div className="relative shrink-0 flex items-center">
                                                {editingId === conv._id ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateTitle(conv._id);
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:text-white text-zinc-400 hover:bg-white/10"
                                                    >
                                                        <FiCheck size={13} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(isMenuOpen ? null : conv._id);
                                                        }}
                                                        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${isMenuOpen
                                                            ? 'opacity-100 text-white bg-white/10'
                                                            : 'opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        title="Options"
                                                    >
                                                        <FiMoreHorizontal size={14} />
                                                    </button>
                                                )}

                                                {/* Popover Menu */}
                                                {isMenuOpen && (
                                                    <div
                                                        ref={menuRef}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-0 top-7 w-44 bg-[#212121] border border-white/[0.12] rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-100"
                                                    >
                                                        {/* Pin Option */}
                                                        <button
                                                            onClick={() => handleTogglePin(conv._id)}
                                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition text-left cursor-pointer"
                                                        >
                                                            <BsPinAngle size={13} className={isPinned ? 'text-amber-400' : 'text-zinc-400'} />
                                                            <span>{isPinned ? 'Unpin chat' : 'Pin chat'}</span>
                                                        </button>

                                                        {/* Rename Option */}
                                                        <button
                                                            onClick={() => {
                                                                setOpenMenuId(null);
                                                                setEditingId(conv._id);
                                                                setEditTitle(conv.title || 'New Chat');
                                                            }}
                                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition text-left cursor-pointer"
                                                        >
                                                            <FiEdit2 size={13} className="text-zinc-400" />
                                                            <span>Rename</span>
                                                        </button>

                                                        {/* Share Option */}
                                                        <button
                                                            onClick={() => handleShare(conv._id)}
                                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition text-left cursor-pointer"
                                                        >
                                                            <FiShare2 size={13} className="text-zinc-400" />
                                                            <span>Share</span>
                                                        </button>

                                                        <div className="my-1 border-t border-white/[0.08]" />

                                                        {/* Delete Option */}
                                                        <button
                                                            onClick={() => handleDeleteConversation(conv._id)}
                                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition text-left cursor-pointer"
                                                        >
                                                            <FiTrash2 size={13} />
                                                            <span>Delete chat</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Bottom User Area */}
                        <div className="p-3 border-t border-white/[0.08] bg-[#171717]/80">
                            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.05] transition">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {userData?.avatar ? (
                                        <img
                                            src={userData.avatar}
                                            alt={userData.name}
                                            className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                                            {userData?.name?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0 text-left">
                                        <span className="text-xs font-medium text-zinc-200 truncate">
                                            {userData?.name || 'User'}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 truncate">
                                            {userData?.email || 'Free Plan'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                    title="Log out"
                                >
                                    <FiLogOut size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Toast Feedback Notification */}
                        {toastMessage && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-[11px] font-medium shadow-xl border border-white/10 z-50 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150">
                                {toastMessage}
                            </div>
                        )}
                    </div>
                </motion.aside>
            </>
        )}
    </AnimatePresence>
    );
}

export default SideBar;
