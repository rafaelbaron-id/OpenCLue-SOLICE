# SOLICE Desktop Assistant

<p align="center">
  <img src="PUBLIC\Hello there.png" alt="SOLICE backlit disk assistant" width="760" />
</p>

<p align="center">
  <strong>A soft-spoken desktop AI companion built with Electron, Next.js, React, and bring-your-own-model AI providers.</strong>
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-42-7dd3fc?style=for-the-badge&labelColor=0b1020" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-f8fafc?style=for-the-badge&labelColor=0b1020" />
  <img alt="React" src="https://img.shields.io/badge/React-19-93c5fd?style=for-the-badge&labelColor=0b1020" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-60a5fa?style=for-the-badge&labelColor=0b1020" />
</p>

---

## What Is SOLICE?

SOLICE is an AI assitant, that comes with a platform to assists you for task and brainstorming. It's a window based, brain storming platform that will help you in your daily tasks, and comes with a screen overlay feature to help you analyze your screen. Just like Cluely. its currently in V1 and in an ongoing development. SOLICE aimed to be your loyal AI companion, and is apart of a bigger OpenCLue ecosystem.

The goal is simple: **help people think, create, study, troubleshoot, and get unstuck without feeling like they are talking to a cold command box.**

SOLICE should feel:

- Kind, helpful, and friendly.
- Smart, concise, and practical.
- Funny in small doses.
- Cool and soft-spoken.
- Slightly sarcastic when it fits.
- Like a tiny companion living inside the monitor.

---

## Current Features

| Feature | Status | Notes |
| --- | --- | --- |
| Desktop app shell | Available | Runs through Electron with a native desktop window. |
| Window Controls | Available | Custom drag regions and an opaque in-app exit button. |
| Configuration Menu | Available | Sleek opening screen to auto-detect local models and manage API keys. |
| Global summon shortcut | Available | `CommandOrControl+Shift+Space` toggles the SOLICE window. |
| Text chat | Available | Users can type messages and receive AI responses. |
| Local LLM (Ollama) | Available | Integrated support for local execution using Ollama (no API key needed). |
| Multi-provider support | Available | Gemini, OpenAI, Claude, DeepSeek, and custom OpenAI-compatible providers. |
| Chat history | Available | Conversation history is saved locally with `electron-store`. |
| Brainstorm Mode | Available | A sandbox canvas for multiple chat rooms and image attachments. Drag chats or images to open. |
| Screen Overlay Mode | Available | A transparent HUD mode floating above desktop apps. Toggle via dynamic island or `Ctrl + S`. |
| Voice output | Available | Uses browser `speechSynthesis` to read SOLICE replies aloud. |
| Animated SOLICE visual | Available | The assistant visual pulses differently while idle, thinking, or speaking. |

<p align="center">
  <img src="PUBLIC\Screenshot (74).png"SOLICE backlit disk assistant" width="400" />
   <img src="PUBLIC\Screenshot (77).png"SOLICE backlit disk assistant" width="400" />
</p>
<p align="center">
 <img src="PUBLIC\Screenshot (80).png"SOLICE backlit disk assistant" width="400" />
</p>
---

## Planned Features

| Feature | Priority | Direction |
| --- | --- | --- |
| True 3D cursor-facing SOLICE model | High | Turn the disk into a more responsive 3D/tilt object that follows the user's mouse cursor. |
| Voice chat input | High | Add microphone recording and speech-to-text so users can talk to SOLICE naturally. |
| Notes | Medium | Let SOLICE save quick notes locally. |
| Timers and reminders | Medium | Add lightweight productivity tools that can be triggered through chat. |
| Screen context analysis | Future | In Overlay mode, capture screenshots/regions and pass to vision models. |
| Audio/device listening | Future | In Overlay mode, listen to real-time system audio for reactive analysis. |

---

## Brainstorm Mode

Brainstorm mode is a sandbox canvas where users can organize multiple "chat rooms" simultaneously.

**How to use:**
1. **Enter the mode:** Click and drag the main chat input upwards, or drop an image file directly onto the SOLICE window.
2. **Add rooms:** Right-click anywhere on the canvas to spawn a new text room, or drag and drop an image.
3. **Move/Pan:** Click the middle mouse button (scroll wheel) to pan around the canvas. Drag the headers to move individual rooms.
4. **Exit/Continue:** Click the `→` arrow in any room to collapse Brainstorm Mode and pull that specific room's history into the main view.

---

## Screen Overlay Mode

Solice features a borderless, transparent desktop overlay mode that mimics an augmented HUD, floating permanently on top of other system applications.

**How to use:**
1. **Enter/Exit:** Click the "Overlay" button in the top Settings island, or press `Ctrl + S`.
2. **Interact:** You can click through transparent areas directly into your underlying OS applications.
3. **Add panels:** Right-click to add a live chat panel, or drop an image. Drag the bottom right corner to resize the panels.

### Overlay Screen Analysis Vision

The overlay mode is planned as a translucent, borderless assistant layer that floats above the user's desktop. SOLICE would sit near the top of the overlay, accept typed or spoken questions, and analyze a user-approved screenshot or selected screen region.

Privacy should be central to this feature:

- Screen analysis must be opt-in.
- SOLICE should clearly show when screen context is being captured.
- Users should be able to stop sharing instantly.
- Captured context should only be sent to the selected AI provider when the user asks for analysis.

---

## Tech Stack

- **Electron** - native desktop shell, global shortcut, local storage, IPC bridge.
- **Next.js** - renderer application and static export target.
- **React** - UI state, chat interface, setup screen, voice state.
- **TypeScript** - app and bridge types.
- **Tailwind CSS** - styling system.
- **electron-store** - local config and chat history persistence.
- **Web Speech API** - spoken SOLICE replies.

---

## Architecture

```mermaid
flowchart TD
  User[User] --> Renderer[Next.js / React Renderer]
  Renderer --> Preload[Electron Preload Bridge]
  Preload --> Main[Electron Main Process]
  Main --> Store[electron-store Local Config]
  Main --> Provider[AI Provider API]
  Provider --> Main
  Main --> Preload
  Preload --> Renderer
  Renderer --> Voice[Speech Synthesis]
  Renderer --> Visual[SOLICE Visual Layer]
```

The renderer never talks directly to Node APIs. It calls `window.solice`, which is exposed by `electron/preload.js`. The main process handles provider requests, shortcut registration, local storage, and chat history.

---

## Project Structure

```text
.
|-- electron/
|   |-- main.js              # Electron lifecycle, shortcut, local store, AI provider requests
|   `-- preload.js           # Secure IPC bridge exposed as window.solice
|-- scripts/
|   `-- run-electron.js      # Electron launcher helper
|-- src/
|   |-- app/
|   |   |-- layout.tsx       # App metadata and shell layout
|   |   `-- page.tsx         # Main SOLICE app state and setup/chat routing
|   |-- components/
|   |   |-- ChatInterface.tsx
|   |   |-- SetupScreen.tsx
|   |   |-- SoliceFace.tsx
|   |   `-- VoiceEngine.tsx
|   |-- styles/
|   |   `-- globals.css
|   `-- types/
|       `-- solice.d.ts      # Shared SOLICE app and bridge types
|-- PUBLIC/
|   `-- ASSETS/              # SOLICE visual assets and references
|-- package.json
`-- PLANS.MD                 # Extra planning notes and visual direction
```

---

## Getting Started

### Prerequisites

- Node.js
- npm
- An API key from your preferred AI provider, OR [Ollama](https://ollama.com) installed for local models

### Install

```bash
npm install
```

### Run In Development

```bash
npm run dev
```

This starts the Next.js renderer on `http://127.0.0.1:3000` and opens the Electron app after the renderer is ready.

### Build

```bash
npm run build
```

### Start Built App

```bash
npm run start
```

### Quality Checks

```bash
npm run lint
npm run typecheck
```

---

## Initial Configuration & Model Setup

SOLICE is designed around a **bring your own key / model** workflow. On your first launch, you will be greeted by the **Solice Configuration Menu**—a sleek, blurred setup screen that helps you configure your AI companion.

1. **Select Provider**: Choose between local models (Ollama) or cloud APIs (Gemini, OpenAI, Claude, DeepSeek).
2. **Select Model**: 
   - **For Local (Ollama)**: Solice will automatically detect and list the models currently installed on your system. Select one from the list!
   - **For Cloud**: Select the desired cloud model from the dropdown.
3. **API Key (Cloud Only)**: Securely input your API key (stored locally).
4. **Begin**: Click the button to start chatting.

Supported provider options:

| Provider | Default Model | Notes |
| --- | --- | --- |
| Ollama (Local) | *Auto-detected* | Uses your local Ollama instance (`127.0.0.1:11434`). Solice scans and lists available models. **No API Key required**. |
| Gemini | `gemini-2.5-flash` | Uses the Gemini `generateContent` endpoint. |
| OpenAI | `gpt-4o` | Uses the OpenAI-compatible chat completions format. |
| Claude | `claude-3-opus-20240229` | Uses Anthropic Messages API. |
| DeepSeek | `deepseek-chat` | Uses chat completions with DeepSeek-specific options. |
| Custom | Custom | For OpenAI-compatible APIs such as OpenRouter, Groq, local gateways, or self-hosted model routers. |

Provider keys and settings are stored securely and locally with `electron-store`.

### Running Local LLMs (Ollama)
1. Install [Ollama](https://ollama.com).
2. Download a model by running `ollama run llama3.2:3b` in your terminal.
3. In SOLICE, select `Ollama (Local)` as the provider. The API Key field will be disabled. Hit Begin!

---

## Using A Custom AI Model

If your provider supports an OpenAI-compatible `/chat/completions` API, you can use the **Custom** option from the setup screen.

Example custom configuration:

```text
Provider: Custom
Base URL: https://openrouter.ai/api/v1
Model: google/gemma-4-31b-it:free
API Key: your-provider-key
```

Another example:

```text
Provider: Custom
Base URL: https://api.groq.com/openai/v1
Model: llama3-8b-8192
API Key: your-provider-key
```

SOLICE automatically appends `/chat/completions` when the base URL does not already end with that path.

---

## Adding A New Provider In Code

Use the Custom provider first when possible. If the provider needs special headers or a different request body, add first-class support in these files.

### 1. Add the provider type

Update `src/types/solice.d.ts`:

```ts
export type SoliceProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "custom"
  | "yourProvider";
```

### 2. Register provider metadata

Update `PROVIDERS` in `electron/main.js`:

```js
yourProvider: {
  id: "yourProvider",
  label: "Your Provider",
  defaultModel: "your-model-id",
  baseUrl: "https://api.your-provider.com/v1",
  apiKeyUrl: "https://your-provider.com/keys",
},
```

### 3. Show it in setup

Add the provider to `providerOptions` in `src/components/SetupScreen.tsx`:

```ts
{
  id: "yourProvider",
  label: "Your Provider",
  defaultModel: "your-model-id",
  apiKeyUrl: "https://your-provider.com/keys",
  baseUrl: "",
  keyPlaceholder: "your-key-prefix...",
}
```

### 4. Add a request function if needed

If the provider is not OpenAI-compatible, add a function in `electron/main.js`:

```js
async function requestYourProvider(config, messages) {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/your-endpoint`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: toChatMessages(messages),
    }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(formatApiError(config, response.status, data));
  }

  return {
    text: data.output_text || data.choices?.[0]?.message?.content || "",
  };
}
```

Then route it in `requestLlm`:

```js
if (config.provider === "yourProvider") {
  return requestYourProvider(config, messages);
}
```

---

## SOLICE Personality Prompt

The main personality is defined in `electron/main.js` as `SOLICE_SYSTEM_PROMPT`.

Core behavior:

- Speak as SOLICE, a small sentient assistant inside the monitor.
- Be warm, loyal, cheerful, smart, and lightly sarcastic.
- Keep responses short unless detail is requested.
- Use occasional mechanical sounds like `[Beep]`, `[Whir]`, or `[Processing...]`.
- Help with tasks, questions, notes, reminders, and creative thinking.
- Never claim screen vision unless the app has provided screen context.

---

## Local Data

SOLICE stores provider configuration and chat history through `electron-store`.

Typical storage locations:

| OS | Location |
| --- | --- |
| Windows | `%APPDATA%/SOLICE-desktop-assistant/config.json` |
| macOS | `~/Library/Application Support/SOLICE-desktop-assistant/config.json` |
| Linux | `~/.config/SOLICE-desktop-assistant/config.json` |

---

## Design Direction

SOLICE should feel minimal, cinematic, and calm:

- Pitch black desktop surface.
- Soft blue edge lighting.
- Glass-like controls where useful.
- Centered SOLICE disk visual.
- Subtle pulsing while idle.
- Stronger pulse while thinking or speaking.
- Chat that stays quiet and does not overpower the character.

The long-term visual goal is a donut-like 3D disk that subtly turns toward the user's cursor and feels alive without becoming distracting.

---

## Development Notes

- `electron/main.js` owns AI provider requests, history persistence, config, and shortcut behavior.
- `electron/preload.js` exposes the safe `window.solice` API to the renderer.
- `src/app/page.tsx` decides whether to show setup or the main assistant.
- `src/components/ChatInterface.tsx` handles typing, message rendering, and settings actions.
- `src/components/VoiceEngine.tsx` speaks assistant replies through `speechSynthesis`.
- `src/components/SoliceFace.tsx` displays and animates the SOLICE visual layer.

---


