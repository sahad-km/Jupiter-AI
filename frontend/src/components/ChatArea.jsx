import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    FiSend,
    FiPaperclip,
    FiGlobe,
    FiCode,
    FiFileText,
    FiSliders,
    FiSidebar,
    FiCopy,
    FiCheck,
    FiMaximize2,
    FiChevronDown,
    FiZap,
    FiEye,
    FiImage,
    FiDownload,
    FiExternalLink,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiAlertTriangle,
    FiClock,
    FiMic,
    FiMicOff
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import {
    addConversation,
    setActiveConversationId,
    updateConversationTitle,
    moveConversationToTop,
    toggleSidebar
} from '../redux/conversationSlice';
import {
    addMessage,
    appendStreamChunk,
    updateLastAssistantMessage,
    setStreamingStatus,
    setMessages,
    setArtifacts,
    setActiveArtifact,
    setIsLoading,
    setSelectedAgent,
    setIsArtifactOpen
} from '../redux/messageSlice';
import api from '../../utils/axios';

const AGENT_MODELS = [
    { id: 'auto', name: 'Auto Router', desc: 'Auto-detects intent', icon: HiSparkles, color: 'text-indigo-400' },
    { id: 'coding', name: 'Coding Agent', desc: 'Code generation & debugging', icon: FiCode, color: 'text-emerald-400' },

    { id: 'search', name: 'Web Search', desc: 'Real-time information', icon: FiGlobe, color: 'text-blue-400' },
    { id: 'vision', name: 'Vision Agent', desc: 'Image analysis & OCR', icon: FiEye, color: 'text-purple-400' },
    { id: 'pdf', name: 'PDF Agent', desc: 'Document analysis', icon: FiFileText, color: 'text-amber-400' },
    { id: 'ppt', name: 'PPT Agent', desc: 'Presentation generator', icon: FiSliders, color: 'text-rose-400' },
    { id: 'chat', name: 'General Chat', desc: 'Fast conversational AI', icon: FiZap, color: 'text-cyan-400' },
];

const SUGGESTIONS = [
    { title: 'Build a REST API', subtitle: 'in Node.js with JWT auth and MongoDB', icon: FiCode, agent: 'coding' },
    { title: 'Search latest AI trends', subtitle: 'and summarize top LLM breakthroughs', icon: FiGlobe, agent: 'search' },
    { title: 'Generate PPT Outline', subtitle: 'for a 10-slide startup investor pitch', icon: FiSliders, agent: 'ppt' },
    { title: 'Explain System Design', subtitle: 'patterns for high-scale microservices', icon: FiZap, agent: 'chat' },
];

function CodeBlock({ language, code }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const displayLang = language ? language.toLowerCase() : 'code';

    return (
        <div className="my-3.5 rounded-2xl bg-[#1e1e1e] border border-white/[0.08] overflow-hidden shadow-xl text-left">
            {/* Header bar: Language + Copy Button */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/[0.06] select-none">
                <div className="flex items-center gap-2 text-zinc-300">
                    <FiCode size={13} className="text-zinc-400" />
                    <span className="font-mono text-xs font-medium lowercase tracking-wide text-zinc-300">
                        {displayLang}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition py-1 px-2 rounded-lg hover:bg-white/[0.08] cursor-pointer active:scale-95"
                    title="Copy code"
                >
                    {copied ? (
                        <>
                            <FiCheck size={13} className="text-emerald-400" />
                            <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
                        </>
                    ) : (
                        <>
                            <FiCopy size={13} />
                            <span className="text-[11px]">Copy code</span>
                        </>
                    )}
                </button>
            </div>

            {/* Syntax Highlighted Code */}
            <div className="overflow-x-auto text-[13.5px] leading-relaxed">
                <SyntaxHighlighter
                    language={displayLang === 'code' ? 'text' : displayLang}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '13.5px',
                        lineHeight: '1.6',
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
                        },
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}

function ChatImage({ src, alt, onOpenLightbox }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const handleDownload = (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = src;
        a.download = alt ? `${alt.replace(/\s+/g, '_')}.png` : 'generated_image.png';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (error) {
        return (
            <div className="my-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-400 flex items-center gap-2">
                <FiImage className="text-zinc-500" size={16} />
                <span>Image unavailable or expired</span>
            </div>
        );
    }

    return (
        <div className="my-4 max-w-md sm:max-w-lg rounded-2xl overflow-hidden bg-[#181920] border border-white/[0.1] shadow-2xl group/img relative">
            <div
                className="relative min-h-[220px] max-h-[500px] overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer select-none"
                onClick={() => onOpenLightbox && onOpenLightbox(src)}
            >
                {!loaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#181920] animate-pulse">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <FiImage size={18} />
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">Loading image...</span>
                    </div>
                )}

                <img
                    src={src}
                    alt={alt || 'Generated image'}
                    onLoad={() => setLoaded(true)}
                    onError={() => {
                        setLoaded(true);
                        setError(true);
                    }}
                    className={`w-full max-h-[500px] object-cover transition-all duration-300 group-hover/img:scale-[1.02] ${loaded ? 'opacity-100' : 'opacity-0'
                        }`}
                />

                {loaded && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-all duration-200 flex flex-col justify-between p-3.5">
                        <div className="flex justify-end gap-1.5">
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition shadow-lg cursor-pointer hover:scale-105 active:scale-95"
                                title="Download Image"
                            >
                                <FiDownload size={14} />
                            </button>
                            <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition shadow-lg cursor-pointer hover:scale-105 active:scale-95"
                                title="Open Original"
                            >
                                <FiExternalLink size={14} />
                            </a>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white truncate max-w-[70%] drop-shadow">
                                {alt || 'Generated Image'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-indigo-600/85 hover:bg-indigo-600 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-400/30 shadow-md">
                                <FiMaximize2 size={12} />
                                <span>Preview</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom info bar */}
            <div className="px-3.5 py-2 bg-[#121318] border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <span className="truncate max-w-[80%] text-[11.5px]">{alt || 'Generated Image'}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                    AI Visual
                </span>
            </div>
        </div>
    );
}

function PdfCard({ url, title, onPreview }) {
    const rawTitle = title || '';
    const cleanTitle = rawTitle.replace(/[⬇️✨\[\]()]/g, '').trim() || (url ? url.split('?')[0].split('/').pop() : 'Document.pdf');

    const handleDownload = (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanTitle.endsWith('.pdf') ? cleanTitle : `${cleanTitle}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="my-3 max-w-lg rounded-2xl bg-gradient-to-br from-rose-950/40 via-zinc-900/80 to-zinc-950/90 border border-rose-500/25 hover:border-rose-500/50 transition-all p-3.5 sm:p-4 shadow-xl shadow-black/30 group/pdf">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Icon & Meta */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover/pdf:scale-105 transition-transform">
                        <FiFileText className="text-rose-400" size={22} />
                        <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded bg-rose-600 text-[8.5px] font-bold text-white tracking-wider uppercase shadow-sm">
                            PDF
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-100 truncate group-hover/pdf:text-rose-200 transition-colors">
                            {cleanTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-rose-400/90 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                                Generated Document
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-500 text-[11px]">24h Access</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
                    {onPreview && (
                        <button
                            type="button"
                            onClick={() => onPreview(url, cleanTitle)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.08] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            title="Preview PDF"
                        >
                            <FiEye size={13} className="text-rose-400" />
                            <span>Preview</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-md shadow-rose-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        title="Download PDF"
                    >
                        <FiDownload size={13} />
                        <span>Download</span>
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition cursor-pointer"
                        title="Open in new tab"
                    >
                        <FiExternalLink size={13} />
                    </a>
                </div>
            </div>
        </div>
    );
}

function PptCard({ url, title, onPreview }) {
    const rawTitle = title || '';
    const cleanTitle = rawTitle.replace(/[⬇️✨\[\]()]/g, '').trim() || (url ? url.split('?')[0].split('/').pop() : 'Presentation.pptx');

    const handleDownload = (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanTitle.endsWith('.pptx') || cleanTitle.endsWith('.ppt') ? cleanTitle : `${cleanTitle}.pptx`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="my-3 max-w-lg rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-zinc-950/90 border border-amber-500/30 hover:border-amber-500/55 transition-all p-3.5 sm:p-4 shadow-xl shadow-black/30 group/ppt">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Icon & Meta */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover/ppt:scale-105 transition-transform">
                        <FiSliders className="text-amber-400" size={22} />
                        <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded bg-amber-600 text-[8.5px] font-bold text-white tracking-wider uppercase shadow-sm">
                            PPTX
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-100 truncate group-hover/ppt:text-amber-200 transition-colors">
                            {cleanTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-amber-400/90 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                Slide Deck Presentation
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-500 text-[11px]">24h Access</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
                    {onPreview && (
                        <button
                            type="button"
                            onClick={() => onPreview(url, cleanTitle, 'ppt')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.08] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            title="Preview Presentation"
                        >
                            <FiEye size={13} className="text-amber-400" />
                            <span>Preview</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow-md shadow-amber-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        title="Download Presentation"
                    >
                        <FiDownload size={13} />
                        <span>Download</span>
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition cursor-pointer"
                        title="Open in new tab"
                    >
                        <FiExternalLink size={13} />
                    </a>
                </div>
            </div>
        </div>
    );
}

function ProcessTrace({ steps, activeStatus, isStreaming }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const uniqueSteps = Array.isArray(steps)
        ? Array.from(new Set(steps.filter(Boolean)))
        : [];

    if (uniqueSteps.length === 0 && !activeStatus) return null;

    const getStepIcon = (text = '') => {
        const lower = text.toLowerCase();
        if (lower.includes('web') || lower.includes('search')) {
            return <FiGlobe className="text-blue-400 shrink-0" size={13} />;
        }
        if (lower.includes('pdf') || lower.includes('document')) {
            return <FiFileText className="text-rose-400 shrink-0" size={13} />;
        }
        if (lower.includes('code')) {
            return <FiCode className="text-emerald-400 shrink-0" size={13} />;
        }
        if (lower.includes('slide') || lower.includes('presentation')) {
            return <FiSliders className="text-amber-400 shrink-0" size={13} />;
        }
        if (lower.includes('image') || lower.includes('visual')) {
            return <FiEye className="text-purple-400 shrink-0" size={13} />;
        }
        return <HiSparkles className="text-indigo-400 shrink-0" size={13} />;
    };

    const summaryText = isStreaming
        ? activeStatus || 'Thinking...'
        : uniqueSteps.length === 1
            ? uniqueSteps[0]
            : `${uniqueSteps.length} steps & sources used`;

    return (
        <div className="mb-2">
            <button
                type="button"
                onClick={() => !isStreaming && uniqueSteps.length > 1 && setIsExpanded(!isExpanded)}
                className={`group inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-left transition-all ${
                    !isStreaming && uniqueSteps.length > 1
                        ? 'hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer'
                        : 'cursor-default'
                }`}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    {isStreaming ? (
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                    ) : (
                        <FiCheck className="text-emerald-400 shrink-0" size={12} />
                    )}
                    <span className="text-[11.5px] font-medium text-zinc-400 group-hover:text-zinc-300 truncate">
                        {summaryText}
                    </span>
                </div>
                {!isStreaming && uniqueSteps.length > 1 && (
                    <FiChevronDown
                        size={12}
                        className={`text-zinc-500 transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                    />
                )}
            </button>

            {isExpanded && !isStreaming && uniqueSteps.length > 0 && (
                <div className="mt-2 pl-3 border-l border-white/[0.08] space-y-1.5">
                    {uniqueSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-400">
                            {getStepIcon(step)}
                            <span>{step}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function RateLimitCard({ rateLimitData }) {
    const { agent, retryAfter, remainingTime } = rateLimitData || {};
    const time = retryAfter || (remainingTime ? `${remainingTime}s` : 'a few seconds');

    return (
        <div className="my-1.5 inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 shadow-sm max-w-full">
            <FiClock className="text-amber-400 shrink-0" size={15} />
            <span>
                Rate limit reached{agent && agent !== 'agent' ? ` for ${agent}` : ''}. Please try again in <strong className="text-amber-300 font-semibold">{time}</strong>.
            </span>
        </div>
    );
}

function ChatArea() {
    const dispatch = useDispatch();
    const { userData } = useSelector((state) => state.user);
    const {
        conversations,
        activeConversationId,
        isSidebarOpen,
    } = useSelector((state) => state.conversation);
    const {
        messages,
        isLoading,
        selectedAgent,
        isArtifactOpen,
        activeArtifact,
    } = useSelector((state) => state.message);

    const [input, setInput] = useState('');
    const [attachedFile, setAttachedFile] = useState(null); // { file: File, preview?: string, name: string, type: 'image' | 'pdf', size: string } | null
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [lightbox, setLightbox] = useState(null); // { images: string[], index: number } | null
    const [docModal, setDocModal] = useState(null); // { url: string, title?: string, type: 'pdf' | 'ppt' } | null
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const isUserScrolledUpRef = useRef(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const recognitionRef = useRef(null);

    const stopSpeechRecognition = () => {
        isListeningRef.current = false;
        setIsListening(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.abort();
            } catch (e) {
                // Ignore already stopped errors
            }
            recognitionRef.current = null;
        }
    };

    // Stop recognition on unmount
    useEffect(() => {
        return () => {
            stopSpeechRecognition();
        };
    }, []);

    // Speech recognition using window.SpeedRecognition || window.webkitSpeechrecognition
    const toggleListening = () => {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition ||
            window.SpeedRecognition ||
            window.webkitSpeechrecognition;

        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (isListeningRef.current) {
            stopSpeechRecognition();
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let baseInput = input.trim();

            recognition.onstart = () => {
                isListeningRef.current = true;
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                if (!isListeningRef.current) return;
                let sessionTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    sessionTranscript += event.results[i][0].transcript;
                }
                const fullText = baseInput ? `${baseInput} ${sessionTranscript}` : sessionTranscript;
                setInput(fullText);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                stopSpeechRecognition();
            };

            recognition.onend = () => {
                isListeningRef.current = false;
                setIsListening(false);
                recognitionRef.current = null;
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            stopSpeechRecognition();
        }
    };

    // File selection handler (images and PDFs)
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (!isImage && !isPdf) {
            alert('Please attach an image or a PDF document.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            alert('File size exceeds the 20MB limit.');
            return;
        }

        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeStr = sizeInMb === '0.0' ? `${(file.size / 1024).toFixed(0)} KB` : `${sizeInMb} MB`;
        const preview = isImage ? URL.createObjectURL(file) : null;

        setAttachedFile({
            file,
            preview,
            name: file.name,
            type: isImage ? 'image' : 'pdf',
            size: sizeStr,
        });
    };

    const handleRemoveAttachment = () => {
        if (attachedFile?.preview) {
            URL.revokeObjectURL(attachedFile.preview);
        }
        setAttachedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Lightbox & Doc Modal keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setLightbox(null);
                setDocModal(null);
            } else if (lightbox && e.key === 'ArrowRight') {
                setLightbox((prev) =>
                    prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null
                );
            } else if (lightbox && e.key === 'ArrowLeft') {
                setLightbox((prev) =>
                    prev
                        ? {
                            ...prev,
                            index: (prev.index - 1 + prev.images.length) % prev.images.length,
                        }
                        : null
                );
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightbox, docModal]);

    // Track user scroll position
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        isUserScrolledUpRef.current = distanceFromBottom > 100;
    };

    const scrollToBottom = (behavior = 'auto') => {
        isUserScrolledUpRef.current = false;
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior,
            });
        }
    };

    // Auto-scroll to bottom smoothly on streaming without jumping
    useEffect(() => {
        if (!isUserScrolledUpRef.current && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle auto-resizing of textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
    }, [input]);

    const handleCopy = (text, index) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }
    };

    // Helper: Detect code block or artifact in AI response
    const parseArtifact = (content) => {
        const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/;
        const match = content?.match(codeBlockRegex);
        if (match) {
            return {
                language: match[1] || 'javascript',
                code: match[2].trim(),
            };
        }
        return null;
    };

    const handleSendMessage = async (textToSend) => {
        const prompt = (textToSend || input).trim();
        if ((!prompt && !attachedFile) || isLoading) return;

        const currentAttached = attachedFile;
        const effectivePrompt =
            prompt || (currentAttached?.type === 'image' ? 'Analyze this image' : 'Analyze this document');

        stopSpeechRecognition();

        setInput('');
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (textareaRef.current) {
            textareaRef.current.value = '';
            textareaRef.current.style.height = 'auto';
        }

        // Add User message to local state immediately
        const userMsg = {
            role: 'user',
            content: effectivePrompt,
            attachment: currentAttached
                ? {
                    name: currentAttached.name,
                    type: currentAttached.type,
                    preview: currentAttached.preview,
                    size: currentAttached.size,
                }
                : null,
            createdAt: new Date().toISOString(),
        };
        dispatch(addMessage(userMsg));
        dispatch(setIsLoading(true));
        setTimeout(() => scrollToBottom('smooth'), 50);

        let currentConvId = activeConversationId;
        const promptTitle =
            effectivePrompt.length > 35 ? effectivePrompt.slice(0, 35) + '...' : effectivePrompt;

        try {
            // 1. Ensure a conversation exists in DB
            if (!currentConvId) {
                const convRes = await api.get('/chat/create-conversation');
                if (convRes.data?.success && convRes.data.conversation) {
                    const newConv = convRes.data.conversation;
                    currentConvId = newConv._id;
                    newConv.title = promptTitle;

                    // Update conversation title in DB
                    api.post('/chat/update-conversation', {
                        conversationId: currentConvId,
                        title: promptTitle,
                    }).catch((e) => console.error(e));

                    // Add to Redux and set active
                    dispatch(addConversation(newConv));
                    dispatch(setActiveConversationId(currentConvId));
                    window.history.pushState(null, '', `/c/${currentConvId}`);
                }
            } else {
                // If it exists, check if title was still "New Chat" and update it to the question
                const existingConv = conversations.find((c) => c._id === currentConvId);
                if (!existingConv || existingConv.title === 'New Chat' || messages.length === 0) {
                    api.post('/chat/update-conversation', {
                        conversationId: currentConvId,
                        title: promptTitle,
                    }).catch((e) => console.error(e));

                    dispatch(updateConversationTitle({ conversationId: currentConvId, title: promptTitle }));
                }
                dispatch(moveConversationToTop(currentConvId));
                window.history.pushState(null, '', `/c/${currentConvId}`);
            }

            // 2. Call Agent Service via Gateway with SSE Stream
            const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

            // Add placeholder assistant message immediately for real-time streaming
            dispatch(
                addMessage({
                    role: 'assistant',
                    content: '',
                    images: [],
                    artifacts: [],
                    createdAt: new Date().toISOString(),
                })
            );

            const sessionToken = localStorage.getItem('jupiter_session_token');
            let fetchOptions;
            if (currentAttached?.file) {
                const formData = new FormData();
                formData.append('prompt', effectivePrompt);
                formData.append('conversationId', currentConvId);
                formData.append('agent', selectedAgent || 'auto');
                formData.append('file', currentAttached.file);

                const headers = {};
                if (sessionToken) {
                    headers['Authorization'] = `Bearer ${sessionToken}`;
                }

                fetchOptions = {
                    method: 'POST',
                    headers,
                    body: formData,
                    credentials: 'include',
                };
            } else {
                const headers = {
                    'Content-Type': 'application/json',
                };
                if (sessionToken) {
                    headers['Authorization'] = `Bearer ${sessionToken}`;
                }

                fetchOptions = {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        prompt: effectivePrompt,
                        conversationId: currentConvId,
                        agent: selectedAgent || 'auto',
                    }),
                    credentials: 'include',
                };
            }

            const response = await fetch(`${baseUrl}/agent/chat`, fetchOptions);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 429) {
                    const limitMsg = errorData.message || `Rate limit reached for the ${errorData.agent || selectedAgent || 'selected'} agent.`;
                    const retryTime = errorData.retryAfter || (errorData.remainingTime ? `${errorData.remainingTime}s` : 'a moment');

                    dispatch(
                        updateLastAssistantMessage({
                            isRateLimit: true,
                            rateLimitData: {
                                agent: errorData.agent || selectedAgent || 'agent',
                                limit: errorData.limit,
                                retryAfter: retryTime,
                                message: limitMsg,
                            },
                            content: `⚠️ Rate limit reached for ${errorData.agent || selectedAgent}. Try again in ${retryTime}.`,
                        })
                    );
                    return;
                }
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let finalAiResponse = '';
            let finalImages = [];
            let finalArtifacts = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep partial line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const jsonStr = trimmed.slice(6);
                        try {
                            const data = JSON.parse(jsonStr);

                            if (data.type === 'token' && typeof data.content === 'string') {
                                finalAiResponse += data.content;
                                dispatch(appendStreamChunk(data.content));
                            } else if (data.type === 'status' && data.status) {
                                dispatch(setStreamingStatus(data.status));
                            } else if (data.type === 'done') {
                                if (data.response) finalAiResponse = data.response;
                                if (Array.isArray(data.images)) finalImages = data.images;
                                if (Array.isArray(data.artifacts)) finalArtifacts = data.artifacts;
                            } else if (data.type === 'error') {
                                if (data.status === 429 || data.data?.status === 429) {
                                    const rateData = data.data || {};
                                    const retryTime = rateData.retryAfter || (rateData.remainingTime ? `${rateData.remainingTime}s` : 'a moment');
                                    dispatch(
                                        updateLastAssistantMessage({
                                            isRateLimit: true,
                                            rateLimitData: {
                                                agent: rateData.agent || selectedAgent || 'agent',
                                                limit: rateData.limit,
                                                retryAfter: retryTime,
                                                message: data.message,
                                            },
                                            content: `⚠️ Rate limit reached for ${rateData.agent || selectedAgent}. Try again in ${retryTime}.`,
                                        })
                                    );
                                    return;
                                }
                                throw new Error(data.message || 'Stream error');
                            }
                        } catch (e) {
                            console.error('SSE parse error:', e, line);
                        }
                    }
                }
            }

            // Sync final response state (attachments, artifacts, full markdown)
            dispatch(
                updateLastAssistantMessage({
                    content: finalAiResponse,
                    images: finalImages,
                    artifacts: finalArtifacts,
                })
            );

            // Save artifacts to Redux state
            if (finalArtifacts.length > 0) {
                dispatch(setArtifacts(finalArtifacts));
                const firstArtifact = finalArtifacts[0];
                if (firstArtifact.files && firstArtifact.files.length > 0) {
                    dispatch(
                        setActiveArtifact({
                            id: firstArtifact.id,
                            title: firstArtifact.title || 'Generated Project',
                            type: firstArtifact.type || 'Project',
                            files: firstArtifact.files,
                            language: 'html',
                            content: firstArtifact.files[0]?.content || '',
                        })
                    );
                }
            } else {
                // Fallback: If markdown contains fenced code, offer artifact canvas
                const detectedCode = parseArtifact(finalAiResponse);
                if (detectedCode) {
                    dispatch(
                        setActiveArtifact({
                            title: `${selectedAgent === 'coding' ? 'Solution' : 'Generated'} Code`,
                            language: detectedCode.language,
                            content: detectedCode.code,
                            type: 'code',
                        })
                    );
                }
            }
        } catch (err) {
            console.error('Send message error:', err);
            if (err.response?.status === 429) {
                const rateData = err.response?.data || {};
                const limitMsg = rateData.message || `You have reached the rate limit for the ${rateData.agent || selectedAgent || 'selected'} agent.`;
                const retryTime = rateData.retryAfter || (rateData.remainingTime ? `${rateData.remainingTime}s` : 'a moment');

                dispatch(
                    addMessage({
                        role: 'assistant',
                        isRateLimit: true,
                        rateLimitData: {
                            agent: rateData.agent || selectedAgent || 'agent',
                            limit: rateData.limit,
                            retryAfter: retryTime,
                            message: limitMsg
                        },
                        content: `⚠️ **Rate Limit Exceeded**\n\n${limitMsg}\n\n*Please wait **${retryTime}** before sending another request.*`,
                        createdAt: new Date().toISOString(),
                    })
                );
            } else {
                const errorMsg = err.response?.data?.message || err.message || 'Sorry, there was an issue processing your request. Please try again.';
                dispatch(
                    addMessage({
                        role: 'assistant',
                        content: `⚠️ ${errorMsg}`,
                        createdAt: new Date().toISOString(),
                    })
                );
            }
        } finally {
            dispatch(setIsLoading(false));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const currentAgent = AGENT_MODELS.find((a) => a.id === selectedAgent) || AGENT_MODELS[0];

    return (
        <main className="flex-1 h-screen flex flex-col bg-[#212121] text-zinc-100 relative overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="h-14 border-b border-white/[0.08] px-4 flex items-center justify-between bg-[#212121]/90 backdrop-blur-md z-20 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => dispatch(toggleSidebar())}
                        className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer shrink-0 ${isSidebarOpen ? 'md:hidden' : ''}`}
                        title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                    >
                        <FiSidebar size={18} />
                    </button>

                    {/* Agent / Model Selector Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-zinc-200 border border-white/[0.08] transition cursor-pointer"
                        >
                            <currentAgent.icon className={`text-sm ${currentAgent.color}`} />
                            <span>{currentAgent.name}</span>
                            <FiChevronDown size={14} className="text-zinc-400" />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-11 left-0 w-60 sm:w-64 max-w-[calc(100vw-32px)] bg-[#181920] border border-white/[0.1] rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1">
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    Select Agent Mode
                                </div>
                                {AGENT_MODELS.map((agent) => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            dispatch(setSelectedAgent(agent.id));
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition cursor-pointer ${selectedAgent === agent.id
                                            ? 'bg-white/[0.08] text-white'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        <agent.icon className={`text-base mt-0.5 ${agent.color}`} />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-zinc-200">{agent.name}</span>
                                            <span className="text-[11px] text-zinc-500">{agent.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Top Actions */}
                <div className="flex items-center gap-2">
                    {activeArtifact && (
                        <button
                            onClick={() => dispatch(setIsArtifactOpen(!isArtifactOpen))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${isArtifactOpen
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : 'bg-white/[0.05] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]'
                                }`}
                        >
                            <FiCode size={14} />
                            <span>Canvas</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        </button>
                    )}
                </div>
            </header>

            {/* Chat Thread Messages Area */}
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 scrollbar-thin scrollbar-thumb-white/10"
            >
                {messages.length === 0 ? (
                    /* ChatGPT Empty Hero View */
                    <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 sm:space-y-8 py-6 sm:py-10 px-2 sm:px-4">
                        {/* Logo Aura */}
                        <div className="relative">
                            <img src="/jupiter-logo.png" alt="Jupiter Logo" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-xl shadow-indigo-500/25" />
                            <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl blur-xl opacity-30 -z-10 animate-pulse"></div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                                What's on your mind today?
                            </h1>
                            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto px-2">
                                Powered by Multi-Agent Router, Groq LLMs, and Gemini 2.5 Flash.
                            </p>
                        </div>

                        {/* Quick Prompts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-xl">
                            {SUGGESTIONS.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        dispatch(setSelectedAgent(item.agent));
                                        handleSendMessage(`${item.title} ${item.subtitle}`);
                                    }}
                                    className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] text-left transition duration-200 flex items-start gap-3 group cursor-pointer"
                                >
                                    <div className="p-2 rounded-xl bg-white/[0.05] text-zinc-300 group-hover:text-indigo-400 transition shrink-0">
                                        <item.icon size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                                            {item.title}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 leading-snug line-clamp-2">
                                            {item.subtitle}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Messages List */
                    <div className="max-w-4xl mx-auto space-y-6">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === 'user';
                            const artifact = !isUser ? parseArtifact(msg.content) : null;

                            return (
                                <div
                                    key={index}
                                    className={`group flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    {/* AI Avatar */}
                                    {!isUser && (
                                        <img src="/jupiter-logo.png" alt="Jupiter AI" className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-md shadow-indigo-500/20 mt-1" />
                                    )}

                                    {/* Message Column */}
                                    <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                                        {/* Message Bubble */}
                                        <div
                                            className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
                                                ? 'bg-[#303030] text-white rounded-tr-none'
                                                : 'bg-white/[0.04] border border-white/[0.06] text-zinc-100 rounded-tl-none shadow-sm'
                                                }`}
                                        >
                                            {/* User Message Attachment Preview */}
                                            {isUser && msg.attachment && (
                                                <div className="mb-2.5 p-2 rounded-xl bg-black/35 border border-white/[0.08] flex items-center gap-2.5 max-w-full text-left">
                                                    {msg.attachment.type === 'image' && msg.attachment.preview ? (
                                                        <img
                                                            src={msg.attachment.preview}
                                                            alt={msg.attachment.name}
                                                            className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                                                            <FiFileText className="text-rose-400" size={17} />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0 pr-1">
                                                        <span className="text-xs font-semibold text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
                                                            {msg.attachment.name}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            {msg.attachment.type === 'image' ? 'Image File' : 'PDF Document'}{' '}
                                                            {msg.attachment.size ? `• ${msg.attachment.size}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Search / Attached Media Gallery (Images, PDFs, & Presentations) */}
                                            {!isUser &&
                                                Array.isArray(msg.images) &&
                                                msg.images.length > 0 &&
                                                (() => {
                                                    const rawList = msg.images
                                                        .map((img) => (typeof img === 'string' ? img : img?.url))
                                                        .filter(Boolean);
                                                    const isPdfUrl = (url) =>
                                                        typeof url === 'string' &&
                                                        (url.toLowerCase().includes('.pdf') || url.includes('application/pdf'));
                                                    const isPptUrl = (url) =>
                                                        typeof url === 'string' &&
                                                        (url.toLowerCase().includes('.pptx') ||
                                                            url.toLowerCase().includes('.ppt') ||
                                                            url.includes('presentationml'));
                                                    const validImages = rawList.filter((u) => !isPdfUrl(u) && !isPptUrl(u));
                                                    const validPdfs = rawList.filter((u) => isPdfUrl(u));
                                                    const validPpts = rawList.filter((u) => isPptUrl(u));

                                                    const isPdfAlreadyInMarkdown =
                                                        msg.content && validPdfs.some((p) => msg.content.includes(p));
                                                    const isPptAlreadyInMarkdown =
                                                        msg.content && validPpts.some((p) => msg.content.includes(p));
                                                    const isImgAlreadyInMarkdown =
                                                        msg.content &&
                                                        validImages.length > 0 &&
                                                        msg.content.includes(validImages[0]);

                                                    return (
                                                        <>
                                                            {/* Image Gallery */}
                                                            {validImages.length > 0 && !isImgAlreadyInMarkdown && (
                                                                <div className="mb-3 space-y-1.5">
                                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                                                                        <FiImage className="text-indigo-400" size={13} />
                                                                        <span>Images</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                        {validImages.map((imgUrl, imgIdx) => (
                                                                            <button
                                                                                key={imgIdx}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setLightbox({
                                                                                        images: validImages,
                                                                                        index: imgIdx,
                                                                                    });
                                                                                }}
                                                                                className="group/img relative aspect-video rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 transition-all block shadow-sm cursor-pointer text-left w-full focus:outline-none"
                                                                            >
                                                                                <img
                                                                                    src={imgUrl}
                                                                                    alt={`Search result ${imgIdx + 1}`}
                                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                                                                    loading="lazy"
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.parentElement.style.display =
                                                                                            'none';
                                                                                    }}
                                                                                />
                                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-end p-1.5">
                                                                                    <div className="p-1 rounded bg-black/50 text-white backdrop-blur-sm">
                                                                                        <FiMaximize2 size={12} />
                                                                                    </div>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Standalone PDF attachments */}
                                                            {validPdfs.length > 0 && !isPdfAlreadyInMarkdown && (
                                                                <div className="mb-3 space-y-2">
                                                                    {validPdfs.map((pdfUrl, pIdx) => (
                                                                        <PdfCard
                                                                            key={pIdx}
                                                                            url={pdfUrl}
                                                                            title="Generated Document.pdf"
                                                                            onPreview={(u, t) =>
                                                                                setDocModal({ url: u, title: t, type: 'pdf' })
                                                                            }
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Standalone PPT attachments */}
                                                            {validPpts.length > 0 && !isPptAlreadyInMarkdown && (
                                                                <div className="mb-3 space-y-2">
                                                                    {validPpts.map((pptUrl, pIdx) => (
                                                                        <PptCard
                                                                            key={pIdx}
                                                                            url={pptUrl}
                                                                            title="Presentation.pptx"
                                                                            onPreview={(u, t) =>
                                                                                setDocModal({ url: u, title: t, type: 'ppt' })
                                                                            }
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}

                                            {msg.isRateLimit && msg.rateLimitData ? (
                                                <RateLimitCard rateLimitData={msg.rateLimitData} />
                                            ) : !isUser && !msg.content && isLoading && index === messages.length - 1 ? (
                                                <ProcessTrace activeStatus={msg.status || 'Jupiter is thinking...'} isStreaming={true} />
                                            ) : (
                                                <div className="font-sans select-text leading-relaxed text-sm text-zinc-200 space-y-1">
                                                    {/* Sleek Tool & Source Trace */}
                                                    {!isUser && Array.isArray(msg.steps) && msg.steps.length > 0 && (
                                                        <ProcessTrace steps={msg.steps} isStreaming={false} />
                                                    )}
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            img: ({ src, alt }) => (
                                                                <ChatImage
                                                                    src={src}
                                                                    alt={alt}
                                                                    onOpenLightbox={(imgSrc) => {
                                                                        setLightbox({
                                                                            images: [imgSrc],
                                                                            index: 0,
                                                                        });
                                                                    }}
                                                                />
                                                            ),
                                                            h1: ({ children }) => (
                                                                <h1 className="text-lg font-semibold text-zinc-100 mt-4 mb-2 first:mt-0 tracking-tight">
                                                                    {children}
                                                                </h1>
                                                            ),
                                                            h2: ({ children }) => (
                                                                <h2 className="text-base font-semibold text-zinc-100 mt-3.5 mb-1.5 first:mt-0 tracking-tight">
                                                                    {children}
                                                                </h2>
                                                            ),
                                                            h3: ({ children }) => (
                                                                <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1 first:mt-0">
                                                                    {children}
                                                                </h3>
                                                            ),
                                                            p: ({ children }) => (
                                                                <p className="text-[14px] leading-relaxed text-zinc-200 mb-2 last:mb-0">
                                                                    {children}
                                                                </p>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong className="font-semibold text-zinc-100">
                                                                    {children}
                                                                </strong>
                                                            ),
                                                            em: ({ children }) => (
                                                                <em className="italic text-zinc-300">
                                                                    {children}
                                                                </em>
                                                            ),
                                                            ul: ({ children }) => (
                                                                <ul className="list-disc pl-5 my-2 space-y-1 text-[14px] text-zinc-200 marker:text-zinc-500">
                                                                    {children}
                                                                </ul>
                                                            ),
                                                            ol: ({ children }) => (
                                                                <ol className="list-decimal pl-5 my-2 space-y-1 text-[14px] text-zinc-200 marker:text-zinc-500">
                                                                    {children}
                                                                </ol>
                                                            ),
                                                            li: ({ children }) => (
                                                                <li className="leading-relaxed pl-0.5">
                                                                    {children}
                                                                </li>
                                                            ),
                                                            blockquote: ({ children }) => (
                                                                <blockquote className="border-l-2 border-indigo-500/60 pl-3.5 py-0.5 my-2.5 text-zinc-400 italic text-[13.5px] bg-white/[0.02] rounded-r-lg">
                                                                    {children}
                                                                </blockquote>
                                                            ),
                                                            hr: () => (
                                                                <hr className="border-white/[0.08] my-3.5" />
                                                            ),
                                                            a: ({ children, href }) => {
                                                                const text =
                                                                    typeof children === 'string'
                                                                        ? children
                                                                        : Array.isArray(children)
                                                                            ? children.join('')
                                                                            : '';
                                                                const isPpt =
                                                                    (typeof href === 'string' &&
                                                                        (href.toLowerCase().includes('.pptx') ||
                                                                            href.toLowerCase().includes('.ppt') ||
                                                                            href.includes('presentationml'))) ||
                                                                    text.toLowerCase().includes('presentation') ||
                                                                    text.toLowerCase().includes('pptx') ||
                                                                    text.toLowerCase().includes('ppt');
                                                                const isPdf =
                                                                    (typeof href === 'string' &&
                                                                        (href.toLowerCase().includes('.pdf') ||
                                                                            href.includes('application/pdf'))) ||
                                                                    text.toLowerCase().includes('pdf');
                                                                const isDownloadLink =
                                                                    text.includes('Download') || text.includes('⬇️');

                                                                if (isPpt) {
                                                                    return (
                                                                        <PptCard
                                                                            url={href}
                                                                            title={
                                                                                text.replace(/[⬇️✨\[\]()]/g, '').trim() ||
                                                                                'Presentation.pptx'
                                                                            }
                                                                            onPreview={(u, t) =>
                                                                                setDocModal({ url: u, title: t, type: 'ppt' })
                                                                            }
                                                                        />
                                                                    );
                                                                }

                                                                if (isPdf) {
                                                                    return (
                                                                        <PdfCard
                                                                            url={href}
                                                                            title={
                                                                                text.replace(/[⬇️✨\[\]()]/g, '').trim() ||
                                                                                'Generated Document.pdf'
                                                                            }
                                                                            onPreview={(u, t) =>
                                                                                setDocModal({ url: u, title: t, type: 'pdf' })
                                                                            }
                                                                        />
                                                                    );
                                                                }

                                                                if (isDownloadLink) {
                                                                    return (
                                                                        <a
                                                                            href={href}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            download
                                                                            className="inline-flex items-center gap-2 px-4 py-2 my-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                                                        >
                                                                            <FiDownload size={14} />
                                                                            <span>{children}</span>
                                                                        </a>
                                                                    );
                                                                }

                                                                return (
                                                                    <a
                                                                        href={href}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition font-medium"
                                                                    >
                                                                        {children}
                                                                    </a>
                                                                );
                                                            },
                                                            pre: ({ children }) => <>{children}</>,
                                                            code: ({ inline, className, children, ...props }) => {
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                const isInline = inline || (!match && !String(children).includes('\n'));

                                                                if (isInline) {
                                                                    return (
                                                                        <code
                                                                            className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 font-mono text-[12.5px] border border-white/[0.06]"
                                                                            {...props}
                                                                        >
                                                                            {children}
                                                                        </code>
                                                                    );
                                                                }

                                                                const language = match ? match[1] : '';
                                                                const codeString = String(children).replace(/\n$/, '');

                                                                // If an accidental indented block contains a presentation link
                                                                if (!language && (codeString.includes('.pptx') || codeString.includes('.ppt') || codeString.includes('Download Presentation'))) {
                                                                    const pptUrlMatch = codeString.match(/https?:\/\/[^\s\)]+ppt[^\s\)]*/i) || codeString.match(/https?:\/\/[^\s\)]+/i);
                                                                    const pptUrl = pptUrlMatch ? pptUrlMatch[0] : '';
                                                                    const titleMatch = codeString.match(/\*\*([^*]+)\*\*/);
                                                                    const extractedTitle = titleMatch ? titleMatch[1] : 'Presentation.pptx';

                                                                    if (pptUrl) {
                                                                        return (
                                                                            <div className="space-y-2">
                                                                                {titleMatch && (
                                                                                    <div className="text-sm font-semibold text-zinc-100">
                                                                                        {extractedTitle}
                                                                                    </div>
                                                                                )}
                                                                                <PptCard
                                                                                    url={pptUrl}
                                                                                    title={extractedTitle}
                                                                                    onPreview={(u, t) =>
                                                                                        setDocModal({ url: u, title: t, type: 'ppt' })
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                }

                                                                // If an accidental indented block contains a PDF link
                                                                if (!language && (codeString.includes('.pdf') || codeString.includes('Download PDF') || codeString.includes('⬇️'))) {
                                                                    const pdfUrlMatch = codeString.match(/https?:\/\/[^\s\)]+pdf[^\s\)]*/i) || codeString.match(/https?:\/\/[^\s\)]+/i);
                                                                    const pdfUrl = pdfUrlMatch ? pdfUrlMatch[0] : '';
                                                                    const titleMatch = codeString.match(/\*\*([^*]+)\*\*/);
                                                                    const extractedTitle = titleMatch ? titleMatch[1] : 'Generated Document.pdf';

                                                                    if (pdfUrl) {
                                                                        return (
                                                                            <div className="space-y-2">
                                                                                {titleMatch && (
                                                                                    <div className="text-sm font-semibold text-zinc-100">
                                                                                        {extractedTitle}
                                                                                    </div>
                                                                                )}
                                                                                <PdfCard
                                                                                    url={pdfUrl}
                                                                                    title={extractedTitle}
                                                                                    onPreview={(u, t) =>
                                                                                        setDocModal({ url: u, title: t, type: 'pdf' })
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                }

                                                                return <CodeBlock language={language} code={codeString} />;
                                                            },
                                                            table: ({ children }) => (
                                                                <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.08] shadow-sm">
                                                                    <table className="w-full border-collapse text-left text-xs text-zinc-200">
                                                                        {children}
                                                                    </table>
                                                                </div>
                                                            ),
                                                            thead: ({ children }) => (
                                                                <thead className="bg-white/[0.06] border-b border-white/[0.08] text-zinc-100 font-medium">
                                                                    {children}
                                                                </thead>
                                                            ),
                                                            tbody: ({ children }) => (
                                                                <tbody className="divide-y divide-white/[0.05] bg-white/[0.02]">
                                                                    {children}
                                                                </tbody>
                                                            ),
                                                            tr: ({ children }) => (
                                                                <tr className="hover:bg-white/[0.04] transition">
                                                                    {children}
                                                                </tr>
                                                            ),
                                                            th: ({ children }) => (
                                                                <th className="px-3.5 py-2.5 font-semibold text-zinc-100 border-r border-white/[0.06] last:border-r-0">
                                                                    {children}
                                                                </th>
                                                            ),
                                                            td: ({ children }) => (
                                                                <td className="px-3.5 py-2 text-zinc-300 border-r border-white/[0.05] last:border-r-0">
                                                                    {children}
                                                                </td>
                                                            ),
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                    {isLoading && index === messages.length - 1 && !isUser && msg.content && (
                                                        <span className="inline-block w-1.5 h-4 bg-indigo-400 rounded-sm animate-pulse ml-1 align-middle" />
                                                    )}
                                                </div>
                                            )}

                                            {/* Multi-file Project Artifact Cards */}
                                            {!isUser && Array.isArray(msg.artifacts) && msg.artifacts.length > 0 && (
                                                <div className="mt-3.5 space-y-2.5">
                                                    {msg.artifacts.map((art, artIdx) => {
                                                        const files = Array.isArray(art.files) ? art.files : [];
                                                        const artTitle = art.title || 'Interactive Project';
                                                        return (
                                                            <div
                                                                key={art.id || artIdx}
                                                                onClick={() => {
                                                                    dispatch(
                                                                        setActiveArtifact({
                                                                            id: art.id,
                                                                            title: artTitle,
                                                                            type: art.type || 'Project',
                                                                            files: files,
                                                                            language: 'html',
                                                                            content: files[0]?.content || '',
                                                                        })
                                                                    );
                                                                }}
                                                                className="p-3.5 rounded-2xl bg-[#15161e] border border-white/[0.08] hover:border-indigo-500/50 flex flex-col gap-2.5 cursor-pointer transition-all duration-200 shadow-lg group/art hover:bg-[#181a24]"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover/art:scale-105 transition-transform">
                                                                            <FiCode size={17} />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-semibold text-zinc-100 group-hover/art:text-white transition">
                                                                                {artTitle}
                                                                            </span>
                                                                            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                                                Interactive Web App
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover/art:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                                                                        <span>Open</span>
                                                                        <FiMaximize2 size={12} />
                                                                    </div>
                                                                </div>

                                                                {/* File Pills */}
                                                                {files.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                                                                        {files.map((f, fIdx) => (
                                                                            <span
                                                                                key={fIdx}
                                                                                className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                                                                            >
                                                                                {f.path || f.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Single Code Block Artifact Card Fallback */}
                                            {(!msg.artifacts || msg.artifacts.length === 0) && artifact && (
                                                <div
                                                    onClick={() => {
                                                        dispatch(
                                                            setActiveArtifact({
                                                                title: 'Generated Code',
                                                                language: artifact.language,
                                                                content: artifact.code,
                                                                type: 'code',
                                                            })
                                                        );
                                                    }}
                                                    className="mt-3.5 p-3 rounded-xl bg-[#14151a] border border-white/[0.08] hover:border-indigo-500/40 flex items-center justify-between gap-3 cursor-pointer transition shadow-md group/art"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                            <FiCode size={16} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-zinc-200 group-hover/art:text-white">
                                                                View in Canvas
                                                            </span>
                                                            <span className="text-[11px] text-zinc-500 font-mono uppercase">
                                                                {artifact.language} · Interactive
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-indigo-400 flex items-center gap-1 font-medium">
                                                        Open <FiMaximize2 size={12} />
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Action (Copy) - Outside Bubble */}
                                        {!isUser && (
                                            <div className="mt-1 flex items-center gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button
                                                    onClick={() => handleCopy(msg.content, index)}
                                                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition flex items-center gap-1 cursor-pointer"
                                                    title="Copy message"
                                                >
                                                    {copiedIndex === index ? (
                                                        <>
                                                            <FiCheck size={14} className="text-emerald-400" />
                                                            <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
                                                        </>
                                                    ) : (
                                                        <FiCopy size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* User Avatar */}
                                    {isUser && (
                                        <div className="w-8 h-8 rounded-xl bg-zinc-700 flex items-center justify-center text-xs font-semibold text-white shrink-0 mt-1">
                                            {userData?.avatar ? (
                                                <img
                                                    src={userData.avatar}
                                                    alt="User"
                                                    className="w-full h-full rounded-xl object-cover"
                                                />
                                            ) : (
                                                userData?.name?.charAt(0) || 'U'
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Bottom Floating ChatGPT-Style Input Container */}
            <div className="p-2.5 sm:p-4 md:pb-6 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col gap-2">
                    {/* Input Card */}
                    <div className="bg-[#303030] border border-white/[0.08] focus-within:border-white/[0.18] rounded-2xl sm:rounded-3xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xl transition-all duration-200">
                        {/* Attachment Preview Badge */}
                        {attachedFile && (
                            <div className="mb-2 p-1.5 px-2.5 rounded-2xl bg-black/40 border border-white/[0.1] inline-flex items-center gap-2 max-w-full group">
                                {attachedFile.type === 'image' ? (
                                    <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/50">
                                        <img
                                            src={attachedFile.preview}
                                            alt="Upload preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                                        <FiFileText className="text-rose-400" size={15} />
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0 pr-1">
                                    <span className="text-xs font-medium text-zinc-100 truncate max-w-[180px] sm:max-w-xs">
                                        {attachedFile.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                        <span
                                            className={`uppercase font-bold text-[9px] px-1 py-0.2 rounded ${attachedFile.type === 'image'
                                                ? 'bg-purple-500/20 text-purple-300'
                                                : 'bg-rose-500/20 text-rose-300'
                                                }`}
                                        >
                                            {attachedFile.type === 'image' ? 'Image' : 'PDF'}
                                        </span>
                                        <span>•</span>
                                        <span>{attachedFile.size}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveAttachment}
                                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
                                    title="Remove attachment"
                                >
                                    <FiX size={12} />
                                </button>
                            </div>
                        )}

                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                attachedFile
                                    ? `Ask something about ${attachedFile.name}...`
                                    : 'Message JupiterAI...'
                            }
                            rows={1}
                            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none max-h-44 py-1 leading-relaxed"
                        />

                        {/* Actions Row inside Input Box */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                            <div className="flex items-center gap-1">
                                {/* Hidden File Input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${attachedFile
                                        ? 'text-indigo-400 bg-indigo-500/20'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                                        }`}
                                    title="Attach files (PDF, Images)"
                                >
                                    <FiPaperclip size={16} />
                                </button>
                                <button
                                    onClick={() => dispatch(setSelectedAgent('search'))}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${selectedAgent === 'search'
                                        ? 'text-blue-400 bg-blue-500/10'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                                        }`}
                                    title="Toggle Web Search"
                                >
                                    <FiGlobe size={16} />
                                </button>
                                <button
                                    onClick={() => dispatch(setSelectedAgent('coding'))}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${selectedAgent === 'coding'
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                                        }`}
                                    title="Toggle Coding Mode"
                                >
                                    <FiCode size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`p-1.5 rounded-lg transition cursor-pointer relative ${isListening
                                        ? 'text-red-400 bg-red-500/20 animate-pulse'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                                        }`}
                                    title={isListening ? 'Stop voice recording' : 'Voice input (Speech to text)'}
                                >
                                    {isListening ? <FiMicOff size={16} /> : <FiMic size={16} />}
                                    {isListening && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                    )}
                                </button>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={(!input.trim() && !attachedFile) || isLoading}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition duration-150 cursor-pointer ${(input.trim() || attachedFile) && !isLoading
                                    ? 'bg-white text-black hover:bg-zinc-200 shadow-md'
                                    : 'bg-white/[0.1] text-zinc-500 cursor-not-allowed'
                                    }`}
                            >
                                <FiSend size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Disclaimer Subtext */}
                    <p className="text-center text-[11px] text-zinc-500">
                        JupiterAI can make mistakes. Verify important information.
                    </p>
                </div>
            </div>

            {/* Image Lightbox Modal */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-fadeIn"
                    onClick={() => setLightbox(null)}
                >
                    {/* Top Bar Controls */}
                    <div
                        className="absolute top-4 inset-x-4 max-w-5xl mx-auto flex items-center justify-between z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-zinc-200">
                            <FiImage size={13} className="text-indigo-400" />
                            <span>
                                {lightbox.index + 1} / {lightbox.images.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href={lightbox.images[lightbox.index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition backdrop-blur-md cursor-pointer"
                                title="Open original image in new tab"
                            >
                                <FiExternalLink size={16} />
                            </a>
                            <button
                                onClick={() => setLightbox(null)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition backdrop-blur-md cursor-pointer"
                                title="Close (Esc)"
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Left Navigation Arrow */}
                    {lightbox.images.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightbox((prev) => ({
                                    ...prev,
                                    index: (prev.index - 1 + prev.images.length) % prev.images.length,
                                }));
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md z-10 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                            title="Previous image (←)"
                        >
                            <FiChevronLeft size={22} />
                        </button>
                    )}

                    {/* Main Image in Lightbox */}
                    <div
                        className="relative max-w-4xl max-h-[80vh] flex items-center justify-center p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={lightbox.images[lightbox.index]}
                            alt="Lightbox preview"
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                        />
                    </div>

                    {/* Right Navigation Arrow */}
                    {lightbox.images.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightbox((prev) => ({
                                    ...prev,
                                    index: (prev.index + 1) % prev.images.length,
                                }));
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md z-10 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                            title="Next image (→)"
                        >
                            <FiChevronRight size={22} />
                        </button>
                    )}
                </div>
            )}
            {/* Document Preview Modal (PDF / PPTX) */}
            {docModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fadeIn"
                    onClick={() => setDocModal(null)}
                >
                    <div
                        className="relative w-full max-w-5xl h-[85vh] bg-[#1a1a1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-4 py-3 bg-zinc-900/95 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg ${docModal.type === 'ppt' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-rose-500/20 border-rose-500/30'
                                    } border flex items-center justify-center shrink-0`}>
                                    {docModal.type === 'ppt' ? (
                                        <FiSliders className="text-amber-400" size={15} />
                                    ) : (
                                        <FiFileText className="text-rose-400" size={15} />
                                    )}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-xs sm:max-w-md">
                                    {docModal.title || (docModal.type === 'ppt' ? 'Presentation Preview' : 'PDF Preview')}
                                </span>
                                <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${docModal.type === 'ppt'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                    {docModal.type === 'ppt' ? 'PPTX' : 'PDF'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={docModal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition cursor-pointer shadow-sm ${docModal.type === 'ppt' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                                        }`}
                                >
                                    <FiDownload size={13} />
                                    <span className="hidden sm:inline">Download</span>
                                </a>
                                <a
                                    href={docModal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
                                    title="Open in new tab"
                                >
                                    <FiExternalLink size={15} />
                                </a>
                                <button
                                    onClick={() => setDocModal(null)}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
                                    title="Close (Esc)"
                                >
                                    <FiX size={17} />
                                </button>
                            </div>
                        </div>

                        {/* Document Frame */}
                        <div className="flex-1 w-full h-full bg-zinc-950">
                            <iframe
                                src={
                                    docModal.type === 'ppt'
                                        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docModal.url)}`
                                        : `${docModal.url}#toolbar=1&navpanes=0`
                                }
                                title="Document Preview"
                                className="w-full h-full border-0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default ChatArea;
