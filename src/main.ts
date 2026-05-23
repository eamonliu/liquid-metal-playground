import './style.css';
import { Pane } from 'tweakpane';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { generatePoissonMask } from './webgl/poisson';
import { vertexShaderSource, fragmentShaderSource } from './webgl/shaders';

const PARAMS = {
    logo: '/swift.svg',
    refraction: 0.02,
    edge: 0.3,
    patternBlur: 0.015,
    liquid: 0.15,
    speed: 0.4,
    patternScale: 1.5,
    angle: 50
};

const container = document.getElementById('tweakpane-container')!;
const pane = new Pane({ container, title: 'Liquid Metal Controls' }) as any;

// Logo Selector Folder
const logoFolder = pane.addFolder({
    title: 'Logo Selector',
    expanded: true
});

// Dynamically create the custom HTML logo options container (now includes Upload button)
const logoContainer = document.createElement('div');
logoContainer.className = 'logo-selector-wrapper';
logoContainer.innerHTML = `
  <div class="logo-options">
    <button class="logo-option active" data-logo="/swift.svg" title="Swift">
      <img src="/swift.svg" alt="Swift" />
    </button>
    <button class="logo-option" data-logo="/apple.svg" title="Apple">
      <img src="/apple.svg" alt="Apple" />
    </button>
    <button class="logo-option" data-logo="/tesla.svg" title="Tesla">
      <img src="/tesla.svg" alt="Tesla" />
    </button>
    <button class="logo-option" data-logo="/deepseek.svg" title="DeepSeek">
      <img src="/deepseek.svg" alt="DeepSeek" />
    </button>
    <button class="logo-option" id="upload-logo-btn" title="Upload Custom Shape">
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
    </button>
  </div>
`;

// Append to the children container of the folder
const childrenContainer = logoFolder.element.querySelector('.tp-fldv_c') || logoFolder.element;
childrenContainer.appendChild(logoContainer);

const uploadBtn = logoContainer.querySelector('#upload-logo-btn') as HTMLButtonElement;

const logoButtons = logoContainer.querySelectorAll('.logo-option:not(#upload-logo-btn)');
logoButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
        if (btn.classList.contains('active')) return;
        
        // Update active class
        logoButtons.forEach(b => b.classList.remove('active'));
        if (uploadBtn) uploadBtn.classList.remove('active');
        btn.classList.add('active');
        
        const logoUrl = btn.getAttribute('data-logo');
        if (logoUrl) {
            PARAMS.logo = logoUrl;
            await updateLogo(logoUrl);
        }
    });
});

// Dynamically create hidden file input
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.id = 'custom-file-input';
fileInput.accept = 'image/*,.svg';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    if (files && files.length > 0) {
        const file = files[0];
        const maxSize = 4.5 * 1024 * 1024; // 4.5MB
        if (file.size > maxSize) {
            alert('File size must be less than 4.5MB');
            return;
        }
        
        const localUrl = URL.createObjectURL(file);
        
        // Deactivate pre-selected buttons and activate custom upload button
        logoButtons.forEach(b => b.classList.remove('active'));
        if (uploadBtn) {
            uploadBtn.classList.add('active');
        }
        
        PARAMS.logo = localUrl;
        await updateLogo(localUrl);
    }
});

// Background Customization Parameters
const BG_PARAMS = {
    backgroundType: 'black',
    backgroundColor: '#0a0a0a',
};

// Helper to convert hex colors to float RGB values for WebGL
function hexToRgb(hex: string) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0.04, g: 0.04, b: 0.04 };
}

function updateBackground() {
    const previewArea = document.getElementById('preview-area');
    if (!previewArea) return;
    
    if (BG_PARAMS.backgroundType === 'metal') {
        previewArea.style.background = 'linear-gradient(to bottom, #eee, #b8b8b8)';
    } else if (BG_PARAMS.backgroundType === 'mesh') {
        previewArea.style.background = 'url("/bg.avif") center / cover no-repeat';
    } else if (BG_PARAMS.backgroundType === 'black') {
        previewArea.style.background = '#0a0a0a';
    } else if (BG_PARAMS.backgroundType === 'custom') {
        previewArea.style.background = BG_PARAMS.backgroundColor;
    }
}

// Background Color Folder
const bgFolder = pane.addFolder({
    title: 'Background Color',
    expanded: true
});

bgFolder.addBinding(BG_PARAMS, 'backgroundType', {
    label: 'Background',
    options: {
        Metal: 'metal',
        Mesh: 'mesh',
        Black: 'black',
        Custom: 'custom'
    }
}).on('change', (ev: any) => {
    customColorBinding.hidden = ev.value !== 'custom';
    updateBackground();
});

const customColorBinding = bgFolder.addBinding(BG_PARAMS, 'backgroundColor', {
    label: 'Custom Color'
});

customColorBinding.on('change', () => {
    updateBackground();
});

// Init hidden state and set background
customColorBinding.hidden = BG_PARAMS.backgroundType !== 'custom';
updateBackground();

// Effects Parameters Folder
const paramsFolder = pane.addFolder({
    title: 'Effects Parameters',
    expanded: true
});

paramsFolder.addBinding(PARAMS, 'refraction', { min: 0, max: 0.06, step: 0.001 });
paramsFolder.addBinding(PARAMS, 'edge', { min: 0, max: 1, step: 0.01 });
paramsFolder.addBinding(PARAMS, 'patternBlur', { min: 0, max: 0.05, step: 0.001 });
paramsFolder.addBinding(PARAMS, 'liquid', { min: 0, max: 1, step: 0.01 });
paramsFolder.addBinding(PARAMS, 'speed', { min: 0, max: 1, step: 0.01 });
paramsFolder.addBinding(PARAMS, 'patternScale', { min: 1, max: 10, step: 0.1 });
paramsFolder.addBinding(PARAMS, 'angle', { min: 0, max: 360, step: 1 });

const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });

if (!gl) {
    alert("WebGL not supported");
    throw new Error("WebGL not supported");
}

function compileShader(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) return null;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource)!;
const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)!;
const program = gl.createProgram()!;
gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
]);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const uMask = gl.getUniformLocation(program, "u_mask");
const uMaskNext = gl.getUniformLocation(program, "u_mask_next");
const uTransition = gl.getUniformLocation(program, "u_transition");
const uTime = gl.getUniformLocation(program, "u_time");
const uRefraction = gl.getUniformLocation(program, "u_refraction");
const uEdge = gl.getUniformLocation(program, "u_edge");
const uPatternBlur = gl.getUniformLocation(program, "u_patternBlur");
const uLiquid = gl.getUniformLocation(program, "u_liquid");
const uSpeed = gl.getUniformLocation(program, "u_speed");
const uPatternScale = gl.getUniformLocation(program, "u_patternScale");
const uResolution = gl.getUniformLocation(program, "u_resolution");
const uAngle = gl.getUniformLocation(program, "u_angle");

// We keep two textures to blend/morph in the fragment shader
const texturePrev = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texturePrev);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

const textureNext = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, textureNext);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// Transition state management
let isTransitioning = false;
let transitionStartTime = 0;
const transitionDuration = 800; // ms (0.8s for smooth fluid morphing)
let transitionProgress = 0.0;

let prevMaskAspect = 1.0;
let nextMaskAspect = 1.0;

interface MaskCache {
    width: number;
    height: number;
    data: Uint8Array;
}
let currentMask: MaskCache | null = null;

async function updateLogo(url: string) {
    pane.title = "Processing shape...";
    
    // We render mask at 600px for a good balance of detail and performance
    const maskData = await generatePoissonMask(url, 600);
    
    const nextWidth = maskData.width;
    const nextHeight = maskData.height;
    const nextAspect = nextWidth / nextHeight;

    if (!currentMask) {
        // Initial load
        prevMaskAspect = nextAspect;
        nextMaskAspect = nextAspect;
        
        gl!.bindTexture(gl!.TEXTURE_2D, texturePrev);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, nextWidth, nextHeight, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, maskData.data);
        
        gl!.bindTexture(gl!.TEXTURE_2D, textureNext);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, nextWidth, nextHeight, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, maskData.data);
        
        currentMask = { width: nextWidth, height: nextHeight, data: maskData.data };
        isTransitioning = false;
        transitionProgress = 0.0;
    } else {
        // Morphing transition to a new logo
        // 1. Upload previous mask to texturePrev
        gl!.bindTexture(gl!.TEXTURE_2D, texturePrev);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, currentMask.width, currentMask.height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, currentMask.data);
        
        // 2. Upload new mask to textureNext
        gl!.bindTexture(gl!.TEXTURE_2D, textureNext);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, nextWidth, nextHeight, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, maskData.data);
        
        // 3. Set up transition aspects and timer
        prevMaskAspect = prevMaskAspect + (nextMaskAspect - prevMaskAspect) * transitionProgress; // start from current interpolated aspect
        nextMaskAspect = nextAspect;
        
        currentMask = { width: nextWidth, height: nextHeight, data: maskData.data };
        isTransitioning = true;
        transitionStartTime = performance.now();
        transitionProgress = 0.0;
    }
    
    pane.title = "Liquid Metal Controls";
    resizeCanvas();
}

function resizeCanvas() {
    const parent = canvas.parentElement!;
    const areaWidth = parent.clientWidth;
    const areaHeight = parent.clientHeight;
    
    let renderWidth = areaWidth;
    let renderHeight = areaHeight;
    
    // Smooth aspect ratio interpolation during transition
    const currentAspect = prevMaskAspect + (nextMaskAspect - prevMaskAspect) * transitionProgress;
    const areaAspect = areaWidth / areaHeight;
    
    if (currentAspect > areaAspect) {
        renderWidth = areaWidth * 0.6; // Scale down a bit to leave padding
        renderHeight = renderWidth / currentAspect;
    } else {
        renderHeight = areaHeight * 0.6;
        renderWidth = renderHeight * currentAspect;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = renderWidth * dpr;
    canvas.height = renderHeight * dpr;
    canvas.style.width = `${renderWidth}px`;
    canvas.style.height = `${renderHeight}px`;

    gl!.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);

function render(time: number) {
    gl!.clearColor(0.0, 0.0, 0.0, 0.0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);

    gl!.useProgram(program);

    // Compute transition progress
    if (isTransitioning) {
        const elapsed = performance.now() - transitionStartTime;
        const t = Math.min(elapsed / transitionDuration, 1.0);
        // Smoothstep curve for premium ease-in-out feel
        transitionProgress = t * t * (3.0 - 2.0 * t);
        
        if (t >= 1.0) {
            isTransitioning = false;
        }
        
        // Dynamically resize canvas to morph its aspect ratio smoothly
        resizeCanvas();
    } else {
        transitionProgress = 1.0;
    }

    // Bind texture 0 (previous mask)
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, texturePrev);
    gl!.uniform1i(uMask, 0);

    // Bind texture 1 (next mask)
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, textureNext);
    gl!.uniform1i(uMaskNext, 1);

    gl!.uniform1f(uTransition, transitionProgress);

    gl!.uniform1f(uTime, time * 0.001);
    gl!.uniform1f(uRefraction, PARAMS.refraction);
    gl!.uniform1f(uEdge, PARAMS.edge);
    gl!.uniform1f(uPatternBlur, PARAMS.patternBlur);
    gl!.uniform1f(uLiquid, PARAMS.liquid);
    gl!.uniform1f(uSpeed, PARAMS.speed);
    gl!.uniform1f(uPatternScale, PARAMS.patternScale);
    gl!.uniform2f(uResolution, canvas.width, canvas.height);
    gl!.uniform1f(uAngle, PARAMS.angle * Math.PI / 180.0);

    gl!.drawArrays(gl!.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

// Headless Offscreen 640x640 30fps Video Recording Logic
async function recordLogoAnimation() {
    if (!currentMask) return;
    
    const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    if (!recordBtn) return;
    
    const originalContent = recordBtn.innerHTML;
    recordBtn.disabled = true;
    recordBtn.innerHTML = `<span class="spinner"></span> <span class="text">Encoding 0%</span>`;
    
    try {
        const width = 640;
        const height = 640;
        const fps = 30;
        const durationSec = RECORD_PARAMS.duration;
        const totalFrames = durationSec * fps;
        
        // 1. Create Offscreen Canvas and WebGL Context
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const ogl = offscreenCanvas.getContext('webgl', { alpha: false, premultipliedAlpha: false });
        if (!ogl) throw new Error("Offscreen WebGL not supported");
        
        // 2. Compile shaders in offscreen context
        function compileOffShader(type: number, source: string) {
            const shader = ogl!.createShader(type);
            if (!shader) return null;
            ogl!.shaderSource(shader, source);
            ogl!.compileShader(shader);
            if (!ogl!.getShaderParameter(shader, ogl!.COMPILE_STATUS)) {
                console.error(ogl!.getShaderInfoLog(shader));
                ogl!.deleteShader(shader);
                return null;
            }
            return shader;
        }
        
        const vert = compileOffShader(ogl.VERTEX_SHADER, vertexShaderSource)!;
        const frag = compileOffShader(ogl.FRAGMENT_SHADER, fragmentShaderSource)!;
        const prog = ogl.createProgram()!;
        ogl.attachShader(prog, vert);
        ogl.attachShader(prog, frag);
        ogl.linkProgram(prog);
        
        if (!ogl.getProgramParameter(prog, ogl.LINK_STATUS)) {
            console.error(ogl.getProgramInfoLog(prog));
        }
        ogl.useProgram(prog);
        
        // 3. Set up geometry buffers
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);
        const buf = ogl.createBuffer();
        ogl.bindBuffer(ogl.ARRAY_BUFFER, buf);
        ogl.bufferData(ogl.ARRAY_BUFFER, vertices, ogl.STATIC_DRAW);
        
        const posLoc = ogl.getAttribLocation(prog, "a_position");
        ogl.enableVertexAttribArray(posLoc);
        ogl.vertexAttribPointer(posLoc, 2, ogl.FLOAT, false, 0, 0);
        
        // 4. Retrieve uniform locations
        const uMaskLoc = ogl.getUniformLocation(prog, "u_mask");
        const uMaskNextLoc = ogl.getUniformLocation(prog, "u_mask_next");
        const uTransitionLoc = ogl.getUniformLocation(prog, "u_transition");
        const uTimeLoc = ogl.getUniformLocation(prog, "u_time");
        const uRefractionLoc = ogl.getUniformLocation(prog, "u_refraction");
        const uEdgeLoc = ogl.getUniformLocation(prog, "u_edge");
        const uPatternBlurLoc = ogl.getUniformLocation(prog, "u_patternBlur");
        const uLiquidLoc = ogl.getUniformLocation(prog, "u_liquid");
        const uSpeedLoc = ogl.getUniformLocation(prog, "u_speed");
        const uPatternScaleLoc = ogl.getUniformLocation(prog, "u_patternScale");
        const uResolutionLoc = ogl.getUniformLocation(prog, "u_resolution");
        const uAngleLoc = ogl.getUniformLocation(prog, "u_angle");
        
        // 5. Create and upload the mask texture
        const tex = ogl.createTexture();
        ogl.bindTexture(ogl.TEXTURE_2D, tex);
        ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_WRAP_S, ogl.CLAMP_TO_EDGE);
        ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_WRAP_T, ogl.CLAMP_TO_EDGE);
        ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_MIN_FILTER, ogl.LINEAR);
        ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_MAG_FILTER, ogl.LINEAR);
        ogl.texImage2D(ogl.TEXTURE_2D, 0, ogl.RGBA, currentMask.width, currentMask.height, 0, ogl.RGBA, ogl.UNSIGNED_BYTE, currentMask.data);
        
        ogl.viewport(0, 0, width, height);
        
        // 6. Initialize mp4-muxer and VideoEncoder
        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc', // standard baseline H.264 is represented as 'avc' in mp4-muxer
                width: width,
                height: height
            },
            fastStart: 'in-memory'
        });
        
        const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error(e)
        });
        
        encoder.configure({
            codec: 'avc1.42E01E',
            width: width,
            height: height,
            bitrate: 4_000_000, // 4Mbps for ultra-crisp reflections
            framerate: fps
        });
        
        const frameDurationUs = 1_000_000 / fps;
        
        // Retrieve selected background color values
        let bgR = 0.04, bgG = 0.04, bgB = 0.04; // Default to #0a0a0a
        if (BG_PARAMS.backgroundType === 'black') {
            bgR = 0.04; bgG = 0.04; bgB = 0.04;
        } else if (BG_PARAMS.backgroundType === 'custom') {
            const rgb = hexToRgb(BG_PARAMS.backgroundColor);
            bgR = rgb.r; bgG = rgb.g; bgB = rgb.b;
        } else if (BG_PARAMS.backgroundType === 'metal') {
            // Representative solid light gray for metal gradient in H.264
            bgR = 0.82; bgG = 0.82; bgB = 0.82;
        }
        
        // Shaders for repeating background texture offscreen WebGL rendering
        const bgVertexShader = `
          attribute vec2 a_position;
          varying vec2 v_uv;
          void main() {
              v_uv = a_position * 0.5 + 0.5;
              v_uv.y = 1.0 - v_uv.y;
              gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `;
        const bgFragmentShader = `
          precision highp float;
          varying vec2 v_uv;
          uniform sampler2D u_bg;
          void main() {
              gl_FragColor = texture2D(u_bg, v_uv); // covers the canvas completely
          }
        `;

        // If background is mesh, load texture and compile shader
        let bgProg: WebGLProgram | null = null;
        let bgTex: WebGLTexture | null = null;
        
        if (BG_PARAMS.backgroundType === 'mesh') {
            const img = new Image();
            img.src = '/bg.avif';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            const vs = ogl.createShader(ogl.VERTEX_SHADER)!;
            ogl.shaderSource(vs, bgVertexShader);
            ogl.compileShader(vs);
            if (!ogl.getShaderParameter(vs, ogl.COMPILE_STATUS)) {
                console.error("BG VS error:", ogl.getShaderInfoLog(vs));
            }
            
            const fs = ogl.createShader(ogl.FRAGMENT_SHADER)!;
            ogl.shaderSource(fs, bgFragmentShader);
            ogl.compileShader(fs);
            if (!ogl.getShaderParameter(fs, ogl.COMPILE_STATUS)) {
                console.error("BG FS error:", ogl.getShaderInfoLog(fs));
            }
            
            bgProg = ogl.createProgram()!;
            ogl.attachShader(bgProg, vs);
            ogl.attachShader(bgProg, fs);
            ogl.linkProgram(bgProg);
            if (!ogl.getProgramParameter(bgProg, ogl.LINK_STATUS)) {
                console.error("BG Link error:", ogl.getProgramInfoLog(bgProg));
            }
            
            bgTex = ogl.createTexture();
            ogl.bindTexture(ogl.TEXTURE_2D, bgTex);
            ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_WRAP_S, ogl.CLAMP_TO_EDGE);
            ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_WRAP_T, ogl.CLAMP_TO_EDGE);
            ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_MIN_FILTER, ogl.LINEAR);
            ogl.texParameteri(ogl.TEXTURE_2D, ogl.TEXTURE_MAG_FILTER, ogl.LINEAR);
            ogl.texImage2D(ogl.TEXTURE_2D, 0, ogl.RGBA, ogl.RGBA, ogl.UNSIGNED_BYTE, img);
        }
        
        // 7. Render & encode loop
        for (let i = 0; i < totalFrames; i++) {
            const timestampUs = i * frameDurationUs;
            const timeSec = i / fps;
            
            if (bgProg && bgTex) {
                ogl.useProgram(bgProg);
                ogl.bindBuffer(ogl.ARRAY_BUFFER, buf);
                const bgPosLoc = ogl.getAttribLocation(bgProg, "a_position");
                ogl.enableVertexAttribArray(bgPosLoc);
                ogl.vertexAttribPointer(bgPosLoc, 2, ogl.FLOAT, false, 0, 0);
                
                ogl.activeTexture(ogl.TEXTURE0);
                ogl.bindTexture(ogl.TEXTURE_2D, bgTex);
                ogl.uniform1i(ogl.getUniformLocation(bgProg, "u_bg"), 0);
                
                ogl.drawArrays(ogl.TRIANGLES, 0, 6);
            } else {
                // Clear with selected background color
                ogl.clearColor(bgR, bgG, bgB, 1.0);
                ogl.clear(ogl.COLOR_BUFFER_BIT);
            }
            
            // Bind textures (both point to current mask, with transition progress locked to 1.0)
            ogl.activeTexture(ogl.TEXTURE0);
            ogl.bindTexture(ogl.TEXTURE_2D, tex);
            ogl.uniform1i(uMaskLoc, 0);
            
            ogl.activeTexture(ogl.TEXTURE1);
            ogl.bindTexture(ogl.TEXTURE_2D, tex);
            ogl.uniform1i(uMaskNextLoc, 1);
            ogl.uniform1f(uTransitionLoc, 1.0);
            
            // Upload PARAMS uniforms
            ogl.uniform1f(uTimeLoc, timeSec);
            ogl.uniform1f(uRefractionLoc, PARAMS.refraction);
            ogl.uniform1f(uEdgeLoc, PARAMS.edge);
            ogl.uniform1f(uPatternBlurLoc, PARAMS.patternBlur);
            ogl.uniform1f(uLiquidLoc, PARAMS.liquid);
            ogl.uniform1f(uSpeedLoc, PARAMS.speed);
            ogl.uniform1f(uPatternScaleLoc, PARAMS.patternScale);
            ogl.uniform2f(uResolutionLoc, width, height);
            ogl.uniform1f(uAngleLoc, PARAMS.angle * Math.PI / 180.0);
            
            ogl.drawArrays(ogl.TRIANGLES, 0, 6);
            
            // Instantiate VideoFrame from offscreen canvas
            const frame = new VideoFrame(offscreenCanvas, { timestamp: timestampUs });
            
            // Generate KeyFrame every 2 seconds (60 frames)
            const isKeyFrame = (i % 60 === 0);
            encoder.encode(frame, { keyFrame: isKeyFrame });
            frame.close();
            
            // Update button progress percentage
            const pct = Math.round((i / totalFrames) * 100);
            recordBtn.querySelector('.text')!.textContent = `Encoding ${pct}%`;
            
            // Small break to allow UI painting
            if (i % 15 === 0) {
                await new Promise((r) => setTimeout(r, 0));
            }
        }
        
        // 8. Finalize video buffer
        await encoder.flush();
        muxer.finalize();
        
        // 9. Download the MP4 file
        const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const logoName = PARAMS.logo.split('/').pop()?.split('.')[0] || 'logo';
        a.href = url;
        a.download = `liquid-${logoName}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Clean up GL resources
        encoder.close();
        if (bgTex) ogl.deleteTexture(bgTex);
        if (bgProg) ogl.deleteProgram(bgProg);
        ogl.deleteTexture(tex);
        ogl.deleteBuffer(buf);
        ogl.deleteProgram(prog);
    } catch (err) {
        console.error("Recording error:", err);
        alert("Failed to record video. Please ensure your browser supports WebCodecs.");
    } finally {
        recordBtn.innerHTML = originalContent;
        recordBtn.disabled = false;
    }
}

// Recording Parameters
const RECORD_PARAMS = {
    duration: 6
};

// Add Duration Slider at the bottom of Tweakpane
pane.addBinding(RECORD_PARAMS, 'duration', {
    label: 'Duration (s)',
    min: 5,
    max: 15,
    step: 1
});

// Add Record Button using Tweakpane native API
const recordBinding = pane.addButton({
    title: '⏺ Record MP4',
});
const tweakpaneRecordBtn = recordBinding.element.querySelector('button') as HTMLButtonElement;
if (tweakpaneRecordBtn) {
    tweakpaneRecordBtn.id = 'record-btn';
    tweakpaneRecordBtn.classList.add('record-btn');
    tweakpaneRecordBtn.addEventListener('click', recordLogoAnimation);
}

// Make Panel Draggable
function makeDraggable(panel: HTMLElement, handle: HTMLElement) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.addEventListener('mousedown', dragMouseDown);
    handle.addEventListener('touchstart', dragTouchStart, { passive: false });
    
    function dragMouseDown(e: MouseEvent) {
        if (e.button !== 0) return; // Only allow left click
        
        // Prevent drag on folder toggle buttons or text inputs
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'INPUT' || target.closest('input')) {
            return;
        }
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        document.addEventListener('mouseup', closeDragElement);
        document.addEventListener('mousemove', elementDrag);
    }
    
    function elementDrag(e: MouseEvent) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = panel.offsetTop - pos2;
        let newLeft = panel.offsetLeft - pos1;
        
        // Screen bounding constraints
        const minMargin = 8;
        const maxLeft = window.innerWidth - panel.offsetWidth - minMargin;
        const maxTop = window.innerHeight - panel.offsetHeight - minMargin;
        
        newLeft = Math.max(minMargin, Math.min(newLeft, maxLeft));
        newTop = Math.max(minMargin, Math.min(newTop, maxTop));
        
        panel.style.top = `${newTop}px`;
        panel.style.left = `${newLeft}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }
    
    function closeDragElement() {
        document.removeEventListener('mouseup', closeDragElement);
        document.removeEventListener('mousemove', elementDrag);
    }

    // Touch events for mobile support
    function dragTouchStart(e: TouchEvent) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'INPUT' || target.closest('input')) {
            return;
        }
        
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        
        document.addEventListener('touchend', closeTouchDragElement);
        document.addEventListener('touchmove', touchElementDrag, { passive: false });
    }

    function touchElementDrag(e: TouchEvent) {
        e.preventDefault();
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        
        let newTop = panel.offsetTop - pos2;
        let newLeft = panel.offsetLeft - pos1;
        
        const minMargin = 8;
        const maxLeft = window.innerWidth - panel.offsetWidth - minMargin;
        const maxTop = window.innerHeight - panel.offsetHeight - minMargin;
        
        newLeft = Math.max(minMargin, Math.min(newLeft, maxLeft));
        newTop = Math.max(minMargin, Math.min(newTop, maxTop));
        
        panel.style.top = `${newTop}px`;
        panel.style.left = `${newLeft}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    function closeTouchDragElement() {
        document.removeEventListener('touchend', closeTouchDragElement);
        document.removeEventListener('touchmove', touchElementDrag);
    }
}

// Hook up draggability to the control panel
const panelElement = document.getElementById('control-panel');
if (panelElement) {
    const handleElement = pane.element.querySelector('.tp-rotv_h') as HTMLElement;
    if (handleElement) {
        makeDraggable(panelElement, handleElement);
    }
}

// Boot up
updateLogo(PARAMS.logo).then(() => {
    requestAnimationFrame(render);
});
