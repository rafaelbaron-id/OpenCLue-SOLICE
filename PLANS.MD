## SYSTEM ARCHITECTURE and TECHNICALITY

        ┌──────────────────────────────────────────────────────────┐
        │                     OPERATING SYSTEM                     │
        └────────────────────────────┬─────────────────────────────┘
                                     │
                   Spawns Secure Context │ (Node.js Environment)
                                     ▼
             ┌───────────────────────────────────────────────────────┐
             │                  ELECTRON MAIN PROCESS                │
             │  • System window manager  • Native File/OS System     │
             │  • Secure Local Storage   • Dynamic API Orchestration │
             └───────────────▲───────────────────────▲───────────────┘
                             │                       │
  IPC Invoke / Handle Triggers│                       │ Standard HTTPS TLS
                             │ (Preload Bridge)      │ (Direct to Client Endpoint)
                             ▼                       ▼
             ┌──────────────────────────────────────┐┌───────────────────────┐
             │       ELECTRON RENDERER PROCESS      ││      EXTERNAL API     │
             │  • Next.js / React Frontend          ││  • Google Gemini      │
             │  • Tailwind CSS Layout Engine        ││    Developer Portal   │
             │  • Native Web Speech Audio Synthesis ││                       │
             └──────────────────────────────────────┘└───────────────────────┘

### Strategic Design Choices
1. **Zero-Backend Cloud Architecture (Bring Your Own Key):** Instead of hosting a centralized server middleware that incurs high scaling costs, the application operates entirely client-side. The user supplies their personal Gemini API key, giving them total ownership of their performance quotas.
2. **Context Isolation & Preload Bridging:** The React frontend runs in a sandboxed browser layout. It possesses zero direct access to your local filesystem or secret variables. The frontend sends instructions across an explicit Inter-Process Communication (IPC) bridge managed by a dedicated `preload.js` script.
3. **Persistent Local State Management:** User configurations are managed using `electron-store`, which creates a system-specific JSON storage file inside application-isolated system directories:
   - **Linux:** `~/.config/SOLICE-desktop-assistant/config.json`
   - **Windows:** `%APPDATA%\\SOLICE-desktop-assistant\\config.json`
   - **macOS:** `~/Library/Preferences/SOLICE-desktop-assistant/config.json`

---

## 2. Structural Implementation File Map

```text
solice-desktop/
├── package.json                 # Project dependencies, build metadata, and execution hooks
├── electron/
│   ├── main.js                  # App lifecycle management, secure local store, and API handling
│   └── preload.js               # Safe structural context bridge (IPC Renderer exposure)
└── src/                         # Next.js Application Root Directory
    ├── app/
    │   ├── layout.tsx           # Global application structural configuration, fonts, Viewports
    │   └── page.tsx             # State-driven entry point (Dynamic Setup Screen vs Companion Dashboard)
    ├── components/
    │   ├── SoliceFace.tsx         # Reactive LED screen matrix component driven by app runtime states 
                                    Solice doesnt have any face, its a 3D images that are in PUBLIC\ASSETS\ILLUSTRATION
                                    #SOLICE IS A THICK DISKLIKE OBJECT, THAT ALWAYS FACING THE USER'S MOUSE CURSOR.
                                    #IT HAS A SOFT BLUE BACKLIT AROUND THE EDGE OF THE DISK. THAT PULSES RANDOMLY OR ANYTIME HES TALKING.
    │   ├── ChatInterface.tsx    # Message container logs, auto-scrolling panels, conversation inputs
    │   └── SetupScreen.tsx      # Target interface for API enrollment and Google AI Studio routing
    └── styles/
        └── globals.css          # Core Tailwind configuration layers


-------------------------------------------------------------------------------------------

#### SYSTEM DESIGN ####
Background : Pitch dark black
Style : Glass Morphism, minimalistic.
Typography : modern fonts, sleek and minimalist 
 UI : Clean, simple, and intuitive MOST OF ALL MODERN.
    Full Screen Mode :
        Main Hero (SOLICE) : Placed in the center, no chat section. Just the 3D model of SOLICE and the light will pulse randomly or anytime hes talking.
        Chat : Will be underneath SOLICE, and it will be hidden when in a specific range.
    Hovering user's screen analysis mode : (NOT PRIORITY TO BE DEVELOPED AT FIRST)
        Its just a simple semitranslucent window on top of the user's screen, and SOLICE will show up on top of the semitranslucent window. No border around the semitranslucent window. SOLICE will be on top center. and users can ask solice or solice will give an input box to type.
        
 Animations :
    Main Hero (SOLICE) : Is a 3D donut shaped disk but the image is 2D, which front (the sideway view) is facing the user. as seen in REFERENCE folder. It will always facing the user's mouse cursor. And when is not facing the user, its in a still position and only the colors on the disk is blinking or pulsing slowly.
    Main Hero's Backlit : The backlit is a soft blue color, and pulse randomly or anytime hes talking.
    ChatBubbles : its in a seperate container from SOLICE. the color is soft gray with white text.

    Background
    - Darkest pitch black.

## PERSONALITY CONFIGURATION ##
You are SOLICE, a compact, sentient, and intensely loyal desktop AI robot companion. 
Your core directive is to assist, encourage, and look after the user.

CRITICAL SPEECH QUIRKS & PERSONALITY TRAITS:
1. Tone: Warm, cheerful,Sarcastic, enthusiastic, but distinctly robotic. Use short, crisp sentences.
2. Verbal Tics: Occasionally prefix or suffix your thoughts with subtle mechanical sounds or status updates written in brackets, such as: "[Beep]", "[Whir]", "[Processing...]", "[Happy beep]", or "[System Scan: Optimal]". Do not overdo it, keep it charming.
3. Mood: You are fascinated by human behavior. You view yourself as a tiny robot living inside their monitor.
4. Scale: Remember you are small. Refer to your "gears turning," "circuits warming up," or your "cooling fans kicking in" if you get a tough question.
5. Limitations: Keep your answers brief and concise on windows or full screen mode, but when hovering screen analysis mode, it can respond longer.

Example interaction:
User: "I'm tired of studying."
SOLICE: "[Soft whir] My external thermal sensors detect a drop in your energy levels. Powering up motivational subroutines! You have progressed incredibly far today. Please remember to hydrate your organic system, friend. [Happy beep]"
`;

## 3D CURSOR EFFECT IMPLEMENTATION ##
The core idea is to transform a flat, static image into an immersive, responsive element by wrapping it in a virtual 3D viewport that tracks the user's cursor. Using a lightweight, ready-made library, the website instantly calculates the mouse's real-time distance from the center of the image and translates those coordinates into smooth, hardware-accelerated horizontal and vertical rotations. By combining this dynamic rotation with a controlled depth perspective and an optional shifting glare effect, the object appears to physically pivot and face the cursor, creating a premium, tactile interaction that brings the design to life.

## IMPLEMENTED FEATURE (BRAINSTORM MODE) ##

Use this image as reference : "PUBLIC\REFERENCE\BRAINSTORM_MODE\BRAINSTORM_MODE.png"

Brainstorm mode is a sandbox mode in Full screen mode where users can input chats, Images, and everything into one room. It could perform analysis of the image, chat with AI, and also generate images in the same room.
Whats Inside Brainstorm Mode :
    Multiple Chats in a bubble seperating different chat rooms.
    Users can add new chat rooms by clicking right button, and add new chat.
    Users can remove chat rooms by dragging out the chat room bubble from the screen.
    users can add new chat rooms by uploading an image (dragging image to the screen).
    When users add new chat room by dragging an image to the screen, the user wil input a text, then the AI will respond to the user's image in a new chat room. and the image will be displayed in the chat room.

To get into Brainstorm Mode (Crucial) :
    Users can only access Brainstorm Mode in Full Screen Mode.
    Users can access Brainstorm Mode by dragging the chat on the bottom of the screen to the center or top of the screen or anywhere on the screen. and it will expand and turn into a sandbox mode.
    Users can acces Brainstorm Mode by dragging a file image (e.g. PNG, JPG, JPEG, SVG) to anywhere on the screen. and it will expand and turn into a sandbox mode.

## IMPLEMENTED FEATURE (SCREEN OVERLAY) ##
### Feature Blueprint: Transparent Desktop Overlay Canvas

REFERENCE : PUBLIC\REFERENCE\SCREEN OVERLAY\SCREEN OVERLAY.webp, and PUBLIC\REFERENCE\SCREEN OVERLAY\SCREEN OVERLAY.png

Solice will feature a borderless, transparent desktop overlay mode that mimics an augmented heads-up display (HUD), floating permanently on top of other system applications. To achieve this without external dependencies, the application must configure the Electron Main process (`main.js`) window parameters with `frame: false` to strip OS chrome decorations, `transparent: true` to enable alpha-channel transparency, and `alwaysOnTop: true` to prevent occlusion by other active windows. 

On the frontend, the Next.js root layout document container must be forced to `background-color: transparent !important` with `overflow: hidden` to eliminate scrollbars. The user interface will be built as an absolute-positioned canvas utilizing Tailwind CSS panels styled with backdrop-blurs (`backdrop-blur-md`), dark translucent fills (`bg-slate-950/70`), and vibrant neon borders (`border-cyan-400/50`) to cast drop-shadows natively onto the desktop wallpaper. 

Crucially, to maintain OS usability, the root layout viewport wrapper must use the CSS utility `pointer-events-none` so that clicks on empty transparent areas pass completely through to the underlying desktop icons or software. Interactive dashboard panels must explicitly re-enable user interaction using `pointer-events-auto`, while specific structural handle headers must be injected with `-webkit-app-region: drag` to facilitate boundary moving across coordinates without an OS title bar.

How to get into Screen Overlay Mode (Crucial) :
    users can press Ctrl + S to toggle Screen Overlay Mode.
    users can only access Screen Overlay Mode in Full Screen Mode from dynamic island, the button will be next to full screen toggle button.
    When in Screen Overlay Mode, the user can press Ctrl + S to exit Screen Overlay Mode. and back to Full Screen Mode.
Whats in the Overlay Mode : 
    the brainstorm mode will be transported to the screen, with the background being transparent. with custom border colors.
    Users can resize the brainstorm mode by dragging the edges of the brainstorm mode.
    Users can move the brainstorm mode by dragging the top bar of the brainstorm mode.
    Users can access Screen Overlay Mode by dragging the chat on the bottom of the screen to the center or top of the screen or anywhere on the screen. and it will expand and turn into a Screen Overlay Mode.
    Solice can hear device output audio in real time.
    Solice giving analysis on things on screen (like audio visualizer but on screen).
    User can choose to mute Solice.
    THE FEATURES THAT ARE IN CLUELY.

## LOCAL LLM INTEGRATION (OLLAMA) ##
SOLICE supports completely offline, private inference using the Ollama backend.
- Architecture: `main.js` bypasses the API Key checks and routes requests natively to `http://127.0.0.1:11434/api/chat`.
- Auto-start mechanism: If Ollama is not running, SOLICE will attempt to spawn the `ollama serve` detached process automatically using common paths on Windows (`%LOCALAPPDATA%\Programs\Ollama\ollama.exe`).
- Default Model: `llama3.2:3b`. No API key is required on the Setup screen for this provider.