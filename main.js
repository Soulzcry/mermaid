import mermaid from 'mermaid';

// Initialize Mermaid with dark theme
// Initialize Mermaid with high contrast base theme
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        darkMode: true,
        primaryColor: '#1e293b',
        lineColor: '#f8fafc',
        textColor: '#f8fafc',
        mainBkg: '#1e293b',
        nodeBorder: '#818cf8',
        clusterBkg: '#0f172a',
        clusterBorder: '#6366f1',
        edgeLabelBackground: '#0f172a',
    },
    securityLevel: 'loose', // Needed for some click interactions if we add them later
    fontFamily: 'Outfit, system-ui, sans-serif'
});

const input = document.getElementById('input');
const output = document.getElementById('output');
const errorDiv = document.getElementById('error');
const status = document.getElementById('status');

// Zoom state
let zoomLevel = 1;
const zoomStep = 0.1;

// Debounce function to limit render calls
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Render function
const renderChart = async () => {
    const code = input.value.trim();

    if (!code) {
        output.innerHTML = '';
        return;
    }

    status.textContent = 'Rendering...';
    status.style.color = 'var(--text-secondary)';

    try {
        // Generate a unique ID for the SVG
        const id = `mermaid-${Date.now()}`;

        // Check for syntax validity before rendering (optional but safer)
        await mermaid.parse(code);

        // Render the chart
        const { svg } = await mermaid.render(id, code);

        output.innerHTML = svg;
        errorDiv.classList.add('hidden');
        status.textContent = 'Ready';
        status.style.color = 'var(--success-color)';

        // Apply current zoom
        updateZoom();

        // Save to local storage
        localStorage.setItem('mermaid-code', code);

    } catch (err) {
        console.error(err);
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
        status.textContent = 'Syntax Error';
        status.style.color = 'var(--error-color)';

        // Keep the old graph on error or clear? 
        // Usually better to keep old graph but show error, but mermaid.render might perform partial cleanup.
        // We'll leave the old graph if possible, but mermaid render outputs to a specific ID.
    }
};

// Zoom logic
const updateZoom = () => {
    const svg = output.querySelector('svg');
    if (svg) {
        svg.style.transition = 'transform 0.2s ease';
        svg.style.transform = `scale(${zoomLevel})`;
        // Ensure it doesn't overflow weirdly
        svg.style.transformOrigin = 'center center';
    }
};

document.getElementById('zoomIn').addEventListener('click', () => {
    zoomLevel += zoomStep;
    updateZoom();
});

document.getElementById('zoomOut').addEventListener('click', () => {
    if (zoomLevel > 0.2) {
        zoomLevel -= zoomStep;
        updateZoom();
    }
});

document.getElementById('zoomReset').addEventListener('click', () => {
    zoomLevel = 1;
    updateZoom();
});

// Example Loader
document.getElementById('exampleBtn').addEventListener('click', () => {
    const example = `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!`;

    input.value = example;
    renderChart();
});

// Download SVG
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const svg = output.querySelector('svg');
    if (!svg) return;

    // Clone the SVG to modify it without affecting the display
    const clonedSvg = svg.cloneNode(true);

    // Get current theme background color
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();

    // Create a background rectangle
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', bgColor);

    // Insert background as the first child
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

    // Serialize
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    // Try File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: `mermaid-chart-${Date.now()}.svg`,
                types: [{
                    description: 'SVG Image',
                    accept: { 'image/svg+xml': ['.svg'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return; // Success
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File Picker Error:', err);
            }
            // Fallback to default download if user cancels or error occurs
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback: Default Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-chart-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Notify user (simple alert for now)
    setTimeout(() => alert('Chart downloaded to your default Downloads folder.'), 100);
});

// Load saved code
const saved = localStorage.getItem('mermaid-code');
if (saved) {
    input.value = saved;
}

// Initial Render
renderChart();

// Full View Toggle
const fullViewBtn = document.getElementById('fullViewBtn');
const previewPane = document.querySelector('.preview-pane');

const toggleFullView = () => {
    previewPane.classList.toggle('full-screen');
    const isFullScreen = previewPane.classList.contains('full-screen');
    fullViewBtn.textContent = isFullScreen ? '✕' : '⛶';
    fullViewBtn.title = isFullScreen ? 'Exit Full View' : 'Full View';
};

fullViewBtn.addEventListener('click', toggleFullView);

// Escape key to exit full view
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewPane.classList.contains('full-screen')) {
        toggleFullView();
    }
});

// Input listener
input.addEventListener('input', debounce(renderChart, 500));
