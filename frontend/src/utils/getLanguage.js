/**
 * Detects the Monaco Editor language identifier based on a file name or file path.
 * 
 * @param {string} fileNameOrPath - The file name or path (e.g., 'index.html', 'style.css', 'app.js', 'Dockerfile')
 * @returns {string} - Monaco language identifier (e.g., 'html', 'css', 'javascript', 'typescript', 'python', etc.)
 */
export const getLanguageFromFilename = (fileNameOrPath = '') => {
    if (!fileNameOrPath || typeof fileNameOrPath !== 'string') {
        return 'plaintext';
    }

    // Extract file basename and extension
    const cleanPath = fileNameOrPath.trim().split('?')[0].split('#')[0];
    const baseName = cleanPath.split('/').pop().split('\\').pop().toLowerCase();

    // Exact filename matches
    const exactMatches = {
        'dockerfile': 'dockerfile',
        'makefile': 'makefile',
        '.env': 'ini',
        '.gitignore': 'ini',
        '.npmrc': 'ini',
        '.editorconfig': 'ini',
        'package.json': 'json',
        'tsconfig.json': 'json',
        'jsconfig.json': 'json',
        'composer.json': 'json',
    };

    if (exactMatches[baseName]) {
        return exactMatches[baseName];
    }

    const ext = baseName.includes('.') ? baseName.split('.').pop() : '';

    // File extension mapping for Monaco Editor
    const extensionMap = {
        // Web
        html: 'html',
        htm: 'html',
        xhtml: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'scss',
        less: 'less',
        js: 'javascript',
        jsx: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        mts: 'typescript',
        cts: 'typescript',
        json: 'json',
        json5: 'json',

        // Backend & Scripting
        py: 'python',
        pyw: 'python',
        java: 'java',
        class: 'java',
        c: 'c',
        h: 'c',
        cpp: 'cpp',
        cc: 'cpp',
        cxx: 'cpp',
        hpp: 'cpp',
        cs: 'csharp',
        go: 'go',
        rs: 'rust',
        php: 'php',
        rb: 'ruby',
        rbw: 'ruby',
        swift: 'swift',
        kt: 'kotlin',
        kts: 'kotlin',
        dart: 'dart',
        r: 'r',
        lua: 'lua',
        pl: 'perl',
        pm: 'perl',
        scala: 'scala',

        // Shell & Scripts
        sh: 'shell',
        bash: 'shell',
        zsh: 'shell',
        fish: 'shell',
        bat: 'bat',
        cmd: 'bat',
        ps1: 'powershell',
        psm1: 'powershell',

        // Data, Config & Markup
        sql: 'sql',
        pgsql: 'sql',
        mysql: 'sql',
        md: 'markdown',
        markdown: 'markdown',
        xml: 'xml',
        svg: 'xml',
        yaml: 'yaml',
        yml: 'yaml',
        ini: 'ini',
        conf: 'ini',
        toml: 'ini',
        graphql: 'graphql',
        gql: 'graphql',
        dockerfile: 'dockerfile',
    };

    return extensionMap[ext] || 'plaintext';
};

export default getLanguageFromFilename;
