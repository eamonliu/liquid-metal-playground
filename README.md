# Liquid Metal Playground

An experimental interactive WebGL playground recreating the premium, glossy, and organic fluid-morphing **"Liquid Metal" Swift logo animation** inspired by **WWDC 26**. 

This repository was fully **vibe coded** by the agentic AI coding assistant **Antigravity** powered by the **Gemini 3.5 Flash** model. It serves as an experimental case study demonstrating the capabilities of advanced agentic AI tools in building complex, high-performance WebGL graphics pipelines and offscreen browser video encoders from scratch.

---

## 🌟 Features

- **Immersive Full-Screen WebGL Canvas**: Premium 60fps rendering of organic liquid metal reflections with dynamic screen auto-scaling matching any viewport aspect ratio.
- **Organic Fluid-Morphing Transitions**: Advanced coordinate warp distortion using Simplex Noise and Signed Distance Field (SDF) blending, causing shapes to physically melt, flow, and divide into one another like liquid mercury instead of performing generic cross-fades.
- **macOS-Style Draggable Control Card**: A glassmorphic, absolutely positioned floating GUI panel (powered by Tweakpane v4) that can be folded or dragged freely anywhere on the screen with touch and mouse dragging physics.
- **Custom SVG & Image Uploads**: Upload any custom bitmap image or vector SVG (under 4.5MB). The project runs a high-performance **2D Poisson boundary distance solver** inside an offscreen canvas to generate a high-fidelity image mask on the fly and morphs into your shape instantly.
- **Interactive Shader Parameters**: Real-time sliders adjusting refraction/dispersion, edge sharpness, pattern blur, liquid speed, pattern scale, and light reflection angles.
- **Expanded Background Customization**:
  - **Metal**: A beautiful vertical gradient (`linear-gradient(to bottom, #eee, #b8b8b8)`).
  - **Mesh**: An auto-scaling, repeating dark metal mesh texture (`bg.avif`) serving as a sleek background.
  - **Black**: Solid opaque dark background.
  - **Custom**: Dynamic Tweakpane-native color picker that reveals itself on selection to set any custom color in real time.
- **Headless Offscreen H.264 Video Recorder**: A premium export button that creates a 100% offscreen canvas WebGL context, runs a synchronous GPU render pass, and encodes the exact animation (5s to 15s, adjustable duration) at 30fps and 640x640 resolution to a seekable, highly-compatible H.264 `.mp4` file using the **WebCodecs API** and `mp4-muxer` in under 500ms. The background texture, custom shapes, and duration scale perfectly in the recorded file.

---

## 🛠️ Technology Stack

- **Core Graphics**: HTML5 Canvas, WebGL, WebGL Shaders (GLSL), TypeScript.
- **UI Controls**: Tweakpane v4 (customized with high-specificity glassmorphic styles).
- **Physics/Solvers**: 2D Poisson boundary distance solver (iterative Jacobi method for mask generation).
- **Video Export**: WebCodecs API (`VideoEncoder`, `VideoFrame`) + `mp4-muxer` (lightweight browser-based H.264 MP4 container encoding).
- **Bundler & Tooling**: Vite, TypeScript 5.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18 or higher) installed on your system.

### Installation

1. Clone the repository (or copy the project directory).
2. Navigate to the project root and install the dependencies:
   ```bash
   npm install
   ```

### Development

To start the local Vite development server with hot-module reloading (HMR):
```bash
npm run dev
```
Open your browser and navigate to the address shown in your terminal (typically `http://localhost:5173`).

### Production Build

To compile TypeScript and bundle the assets into a highly optimized production package:
```bash
npm run build
```
The compiled output will be generated in the `dist/` directory.

To preview your production build locally:
```bash
npm run preview
```

---

## 📂 Project Structure

```text
├── public/                 # Static assets copied to dist root on build
│   ├── bg.avif             # Seamless dark metal mesh background image
│   ├── swift.svg           # Swift logo SVG mask
│   ├── apple.svg           # Apple logo SVG mask
│   ├── tesla.svg           # Tesla logo SVG mask
│   └── deepseek.svg        # DeepSeek logo SVG mask
├── src/
│   ├── webgl/
│   │   ├── poisson.ts      # Custom Jacobi solver for boundary distance masks
│   │   └── shaders.ts      # Vertex and Fragment GLSL WebGL shaders
│   ├── main.ts             # Application bootstrapper, Tweakpane GUI & MP4 recorder
│   └── style.css           # Premium glassmorphic styling and transition rules
├── index.html              # Main application template page
├── tsconfig.json           # TypeScript configuration
├── package.json            # NPM dependencies and build script commands
└── README.md               # Project documentation
```

---

## 📄 License

This project is licensed under the MIT License. Feel free to copy, modify, and integrate these premium animations and offscreen recorders into your own web applications!
