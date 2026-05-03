# Gemini Slingshot: AI Co-Pilot

Gemini Slingshot is an interactive, webcam-powered bubble shooter that leverages MediaPipe hand-tracking to let players aim and shoot with intuitive physical gestures. It integrates Gemini 3.1 Pro as a strategic AI co-pilot, visually analyzing the live board state to deliver personalized, proactive shot recommendations, high-scoring synergies, and survival strategies.

## Architecture

This project is built using a modern, client-side web stack focused on performance, real-time interaction, and multimodal AI capabilities.

### Tech Stack

- **Frontend Framework**: React (v19) + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS for rapid, utility-first UI design
- **Icons**: Lucide React
- **AI Integration**: `@google/genai` (Gemini API)
- **Computer Vision**: MediaPipe (`@mediapipe/hands`, `@mediapipe/camera_utils`)

### System Components

1. **Game Engine (Canvas)**
   - The core game loop runs within a React component using HTML5 Canvas (`CanvasRenderingContext2D`).
   - It handles rendering the bubble grid, managing the physics of the slingshot projectile, detecting collisions, finding matching clusters, and animating clearing/falling bubbles.
   - The grid uses a staggered, hexagonal layout typical of classic bubble shooters, calculating precise X/Y positions based on dynamically sized columns.

2. **Computer Vision (MediaPipe)**
   - The webcam feed is processed locally in the browser using MediaPipe Hand Tracking (via Emscripten/WASM).
   - The user's index finger coordinates (`INDEX_FINGER_TIP`) are mapped to canvas coordinates to control the aiming reticle.
   - A pinching gesture (measuring the distance between `THUMB_TIP` and `INDEX_FINGER_TIP`) determines when you click or switch active bubble colors.
   - Hand positions are updated at the high frame rate of the video feed directly to the Canvas drawing routines.

3. **AI Co-Pilot (Gemini 3.1 Pro)**
   - To assist the player, the game periodically captures the canvas state as a base64 JPEG image.
   - It evaluates all valid topological paths and reachable bubbles to generate a structured text prompt including the game rules and a list of valid moves.
   - This multimodal payload (Image + Prompt) is sent to `gemini-3.1-pro` using the `@google/genai` SDK (`services/geminiService.ts`).
   - Gemini analyzes the board state visually and strategically, providing a strict JSON response with a recommended bubble color, target row/col, and a strategic rationale (e.g., "Clear this structural anchor to trigger a massive avalanche").
   - The recommendation is rendered overlaid on the UI as a glowing target reticle and actionable text.

### Key Game Workflows

- **Aiming**: Moving the hand naturally aims the slingshot. The engine projects a virtual trajectory line, calculating accurate wall bounces to preview where the bubble will land.
- **Clustering (BFS)**: Upon collision, a Breadth-First Search (BFS) is executed to find contiguous bubbles of the matching color. If the cluster size $\ge$ 3, the bubbles are flagged to pop.
- **Avalanche Detection (BFS)**: Following a successful matching clear, a secondary BFS verifies which remaining bubbles are still topologically anchored to the ceiling (Row 0). Unconnected bubbles are detached and visually plummet, earning bonus points.
- **AI Feedback Loop**: After the board state settles following a shot, a new snapshot is taken. Valid paths to outer-layer bubbles are pre-calculated to constrain the AI's hallucination potential, ensuring Gemini only recommends physically possible shots.

## Layout & Aesthetic

The interface is designed with a futuristic "Heads Up Display" (HUD) aesthetic, emphasizing the "Co-Pilot" AI theme.
- **Dark Mode Context**: Features deep grays and blacks `#121212` / `#1e1e1e` to reduce eye strain and allow the vibrant bubble colors (and webcam rendering) to stand out.
- **Tactical Feedback**: The AI suggestions glow with an aura matching the recommended color, alongside animated typing text providing the rationale. This ensures intuitive visual clarity without obscuring the real-time gameplay field.
