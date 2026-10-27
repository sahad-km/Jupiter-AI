import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Editor from '@monaco-editor/react';
import {
    FiX,
    FiCopy,
    FiCheck,
    FiDownload,
    FiCode,
    FiEye,
    FiRefreshCw,
    FiMaximize2,
    FiMinimize2,
    FiMonitor,
    FiSmartphone,
    FiFolder,
    FiPlay
} from 'react-icons/fi';
import { setIsArtifactOpen } from '../redux/messageSlice';
import { motion, AnimatePresence } from 'motion/react';
import { getLanguageFromFilename } from '../utils/getLanguage';

// File icon and accent color styling
const getFileIconInfo = (path = '') => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'html':
            return { label: 'HTML', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
        case 'css':
            return { label: 'CSS', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
        case 'js':
        case 'jsx':
            return { label: 'JS', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
        case 'json':
            return { label: 'JSON', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        case 'py':
            return { label: 'PY', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
        default:
            return { label: 'FILE', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    }
};

function Artifact() {
    const dispatch = useDispatch();
    const { activeArtifact, isArtifactOpen } = useSelector((state) => state.message);

    // View modes: 'code' | 'preview'
    const [viewMode, setViewMode] = useState('code');
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'mobile'
    const [previewKey, setPreviewKey] = useState(0);

    const [width, setWidth] = useState(560);
    const [isDragging, setIsDragging] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const prevWidthRef = useRef(560);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    // Track viewport width for responsive mobile canvas
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Local mutable state for files
    const [projectFiles, setProjectFiles] = useState([]);

    // Sync activeArtifact to local projectFiles
    useEffect(() => {
        if (!activeArtifact) return;

        if (Array.isArray(activeArtifact.files) && activeArtifact.files.length > 0) {
            setProjectFiles(activeArtifact.files.map((f) => ({ ...f })));
            setActiveFileIndex(0);
            const hasHtml = activeArtifact.files.some((f) => (f.path || f.name || '').endsWith('.html'));
            setViewMode(hasHtml ? 'preview' : 'code');
        } else if (activeArtifact.content) {
            const lang = activeArtifact.language || 'javascript';
            const ext = lang === 'html' ? 'html' : lang === 'css' ? 'css' : lang === 'python' ? 'py' : 'js';
            const singleFile = {
                path: `main.${ext}`,
                name: `main.${ext}`,
                content: activeArtifact.content,
                language: lang,
            };
            setProjectFiles([singleFile]);
            setActiveFileIndex(0);
            setViewMode(lang === 'html' ? 'preview' : 'code');
        }
    }, [activeArtifact]);

    // Handle mouse drag for dynamic width resizing
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            // Artifact canvas is on the right side of the viewport
            const newWidth = window.innerWidth - e.clientX;
            const minWidth = 360;
            const maxWidth = Math.max(minWidth, window.innerWidth - 80);

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                setWidth(newWidth);
                setIsMaximized(false);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    const activeFile = projectFiles[activeFileIndex] || projectFiles[0] || {
        path: 'index.html',
        content: '',
        language: 'html',
    };

    const activeLanguage = useMemo(() => {
        return getLanguageFromFilename(activeFile.path || activeFile.name || activeFile.language || 'javascript');
    }, [activeFile]);

    const handleEditorChange = (newVal) => {
        setProjectFiles((prev) => {
            const next = [...prev];
            if (next[activeFileIndex]) {
                next[activeFileIndex] = {
                    ...next[activeFileIndex],
                    content: newVal ?? '',
                };
            }
            return next;
        });
    };

    // Bundle HTML + CSS + JS into an interactive live preview document
    const srcDoc = useMemo(() => {
        let htmlContent = '';
        let cssContent = '';
        let jsContent = '';

        projectFiles.forEach((file) => {
            const fileName = (file.path || file.name || '').toLowerCase();
            const lang = (file.language || '').toLowerCase();

            if (fileName.endsWith('.html') || lang === 'html') {
                htmlContent = file.content || '';
            } else if (fileName.endsWith('.css') || lang === 'css') {
                cssContent += `\n${file.content || ''}`;
            } else if (fileName.endsWith('.js') || fileName.endsWith('.javascript') || lang === 'javascript' || lang === 'js') {
                jsContent += `\n${file.content || ''}`;
            }
        });

        if (!htmlContent && projectFiles.length > 0 && activeLanguage === 'html') {
            htmlContent = activeFile.content || '';
        }

        if (htmlContent.includes('<html') || htmlContent.includes('<!DOCTYPE html>')) {
            let combined = htmlContent;
            if (cssContent.trim()) {
                if (combined.includes('</head>')) {
                    combined = combined.replace('</head>', `<style>\n${cssContent}\n</style></head>`);
                } else {
                    combined = `<style>\n${cssContent}\n</style>` + combined;
                }
            }
            if (jsContent.trim()) {
                const scriptTag = `<script>\ntry {\n${jsContent}\n} catch(err) { console.error('Preview Error:', err); }\n</script>`;
                if (combined.includes('</body>')) {
                    combined = combined.replace('</body>', `${scriptTag}</body>`);
                } else {
                    combined = combined + scriptTag;
                }
            }
            return combined;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #ffffff;
      color: #1a1a1a;
      min-height: 100vh;
    }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    try {
      ${jsContent}
    } catch (err) {
      console.error("Preview script runtime error:", err);
    }
  </script>
</body>
</html>`;
    }, [projectFiles, activeFile, activeLanguage]);

    const handleCopyActive = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(activeFile.content || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadCurrent = () => {
        const fileName = activeFile.path || activeFile.name || `code.${activeLanguage}`;
        const blob = new Blob([activeFile.content || ''], { type: 'text/plain' });
        const element = document.createElement('a');
        element.href = URL.createObjectURL(blob);
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleToggleMaximize = () => {
        if (isMaximized) {
            setWidth(prevWidthRef.current || 560);
            setIsMaximized(false);
        } else {
            prevWidthRef.current = width;
            setWidth(window.innerWidth - 80);
            setIsMaximized(true);
        }
    };

    const title = activeArtifact?.title || 'Interactive Project Canvas';

    return (
        <AnimatePresence>
            {isArtifactOpen && activeArtifact && (
                <motion.aside
                    key="monaco-artifact-canvas"
                    initial={isMobile ? { y: '100%' } : { width: 0, opacity: 0 }}
                    animate={isMobile ? { y: 0 } : { width: `${width}px`, opacity: 1 }}
                    exit={isMobile ? { y: '100%' } : { width: 0, opacity: 0 }}
                    transition={isDragging ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
                    className={`h-screen bg-[#121318] border-l border-white/[0.08] flex flex-col select-none overflow-hidden shadow-2xl ${
                        isMobile ? 'fixed inset-0 z-50 w-full' : 'relative z-30 shrink-0'
                    }`}
                    style={isMobile ? { width: '100vw' } : { width: `${width}px` }}
                >
                    {/* Left Resizer Drag Handle (desktop only) */}
                    {!isMobile && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 cursor-col-resize z-50 group flex items-center justify-center transition-all bg-transparent hover:bg-indigo-500/20 active:bg-indigo-500/30"
                            title="Hold and drag to resize canvas"
                        >
                            <div className="w-[3px] h-10 rounded-full bg-white/10 group-hover:bg-indigo-400 group-active:bg-indigo-400 transition-colors" />
                        </div>
                    )}

                    {/* Dragging Overlay to prevent Monaco / iframe pointer trapping */}
                    {isDragging && (
                        <div className="absolute inset-0 z-40 bg-transparent cursor-col-resize" />
                    )}

                    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                        {/* Top Header Bar */}
                        <div className="h-14 border-b border-white/[0.08] pl-5 pr-4 flex items-center justify-between bg-[#16171e]/90 backdrop-blur-md shrink-0">
                            {/* Title & File Count */}
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                    <FiFolder size={16} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-zinc-100 truncate">{title}</span>
                                    <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                                        {projectFiles.length} {projectFiles.length === 1 ? 'File' : 'Files'}
                                    </span>
                                </div>
                            </div>

                            {/* View Switchers & Actions */}
                            <div className="flex items-center gap-1.5">
                                {/* Mode Selector Pill: Code | Preview */}
                                <div className="flex bg-black/50 p-1 rounded-xl border border-white/[0.08] shadow-inner mr-1">
                                    <button
                                        onClick={() => setViewMode('code')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${viewMode === 'code'
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                                            }`}
                                        title="View Code Editor"
                                    >
                                        <FiCode size={13} />
                                    </button>

                                    <button
                                        onClick={() => setViewMode('preview')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${viewMode === 'preview'
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                                            }`}
                                        title="View Live Web Preview"
                                    >
                                        <FiEye size={13} />
                                    </button>
                                </div>

                                {/* Copy Current File */}
                                <button
                                    onClick={handleCopyActive}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                                    title={`Copy ${activeFile.path || activeFile.name || 'code'}`}
                                >
                                    {copied ? <FiCheck size={15} className="text-emerald-400" /> : <FiCopy size={15} />}
                                </button>

                                {/* Download File */}
                                <button
                                    onClick={handleDownloadCurrent}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                                    title="Download file"
                                >
                                    <FiDownload size={15} />
                                </button>

                                {/* Maximize / Restore Toggle */}
                                <button
                                    onClick={handleToggleMaximize}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer hidden sm:block"
                                    title={isMaximized ? 'Restore Canvas' : 'Maximize Canvas'}
                                >
                                    {isMaximized ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
                                </button>

                                {/* Close Button */}
                                <button
                                    onClick={() => dispatch(setIsArtifactOpen(false))}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
                                    title="Close Canvas"
                                >
                                    <FiX size={17} />
                                </button>
                            </div>
                        </div>

                        {/* File Tabs Bar - ONLY visible in Code mode */}
                        {viewMode === 'code' && projectFiles.length > 0 && (
                            <div className="h-10 border-b border-white/[0.06] bg-[#0e0f14] px-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                                {projectFiles.map((file, idx) => {
                                    const fileName = file.path || file.name || `file_${idx + 1}`;
                                    const iconInfo = getFileIconInfo(fileName);
                                    const isActive = idx === activeFileIndex;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveFileIndex(idx)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer shrink-0 border ${isActive
                                                    ? 'bg-[#1e1f29] text-white border-white/[0.12] shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border-transparent'
                                                }`}
                                        >
                                            <span
                                                className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border font-mono ${iconInfo.color}`}
                                            >
                                                {iconInfo.label}
                                            </span>
                                            <span className="truncate max-w-[140px]">{fileName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Main Content Area: Code OR Preview */}
                        <div className="flex-1 flex overflow-hidden bg-[#0d0e12] relative">
                            {/* Code Mode: Monaco Editor */}
                            {viewMode === 'code' && (
                                <div className="w-full h-full flex flex-col relative">
                                    <div className="h-7 px-4 bg-[#13141a] border-b border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                                        <span>{activeFile.path || activeFile.name || 'main.js'}</span>
                                        <span className="uppercase text-indigo-400">{activeLanguage}</span>
                                    </div>

                                    <div className="flex-1 w-full overflow-hidden">
                                        <Editor
                                            height="100%"
                                            language={activeLanguage}
                                            value={activeFile.content || ''}
                                            theme="vs-dark"
                                            onChange={handleEditorChange}
                                            options={{
                                                fontSize: 13.5,
                                                fontFamily:
                                                    "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, Menlo, monospace",
                                                fontLigatures: true,
                                                minimap: { enabled: false },
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                tabSize: 2,
                                                wordWrap: 'on',
                                                lineNumbersMinChars: 3,
                                                smoothScrolling: true,
                                                cursorBlinking: 'smooth',
                                                renderLineHighlight: 'line',
                                                padding: { top: 12, bottom: 12 },
                                            }}
                                            loading={
                                                <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                                                    Loading Monaco Editor...
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Preview Mode: Live Interactive Iframe */}
                            {viewMode === 'preview' && (
                                <div className="w-full h-full flex flex-col bg-[#16171f]">
                                    {/* Preview Sub-toolbar: Desktop / Mobile and Refresh */}
                                    <div className="h-9 px-4 bg-[#111217] border-b border-white/[0.06] flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-zinc-400 font-mono flex items-center gap-1.5">
                                                <FiPlay size={11} className="text-emerald-400 fill-emerald-400/20" />
                                                Live Output
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Preview Modes: Desktop & Mobile Only */}
                                            <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
                                                <button
                                                    onClick={() => setDeviceMode('desktop')}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition cursor-pointer ${deviceMode === 'desktop'
                                                            ? 'bg-white/[0.12] text-white font-medium'
                                                            : 'text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                    title="Desktop View"
                                                >
                                                    <FiMonitor size={13} />
                                                    <span className="text-[11px]">Desktop</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeviceMode('mobile')}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition cursor-pointer ${deviceMode === 'mobile'
                                                            ? 'bg-white/[0.12] text-white font-medium'
                                                            : 'text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                    title="Mobile View (375px)"
                                                >
                                                    <FiSmartphone size={13} />
                                                    <span className="text-[11px]">Mobile</span>
                                                </button>
                                            </div>

                                            {/* Refresh Preview */}
                                            <button
                                                onClick={() => setPreviewKey((k) => k + 1)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer flex items-center gap-1 text-[11px]"
                                                title="Reload Live Preview"
                                            >
                                                <FiRefreshCw size={12} />
                                                <span className="hidden sm:inline">Refresh</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Iframe Container */}
                                    <div className="flex-1 p-3 bg-[#0a0a0f] overflow-auto flex items-center justify-center">
                                        <div
                                            className={`h-full bg-white transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-white/[0.1] ${deviceMode === 'mobile'
                                                    ? 'w-[375px] max-h-[667px]'
                                                    : 'w-full'
                                                }`}
                                        >
                                            <iframe
                                                key={previewKey}
                                                title="Project Live Preview"
                                                srcDoc={srcDoc}
                                                className="w-full h-full border-0 bg-white"
                                                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Artifact Footer */}
                        <div className="h-9 border-t border-white/[0.08] px-4 flex items-center justify-between text-[11px] text-zinc-500 bg-[#121318] shrink-0 font-mono">
                            <div className="flex items-center gap-3">
                                <span>{(activeFile.content || '').split('\n').length} lines</span>
                                <span>{(activeFile.content || '').length} characters</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-400">
                                    {activeFile.path || activeFile.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

export default Artifact;
