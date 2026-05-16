const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("solice", {
  getConfig: () => ipcRenderer.invoke("solice:get-config"),
  saveProviderConfig: (payload) =>
    ipcRenderer.invoke("solice:save-provider-config", payload),
  saveApiKey: (apiKey) => ipcRenderer.invoke("solice:save-api-key", apiKey),
  deleteApiKey: () => ipcRenderer.invoke("solice:delete-api-key"),
  sendMessage: (payload) => ipcRenderer.invoke("solice:chat", payload),
  getHistory: () => ipcRenderer.invoke("solice:get-history"),
  saveHistory: (messages) => ipcRenderer.invoke("solice:save-history", messages),
  clearHistory: () => ipcRenderer.invoke("solice:clear-history"),
  getBrainstormRooms: () => ipcRenderer.invoke("solice:get-brainstorm-rooms"),
  saveBrainstormRooms: (rooms) => ipcRenderer.invoke("solice:save-brainstorm-rooms", rooms),
  setOverlayMode: (isOverlay) => ipcRenderer.invoke("solice:set-overlay-mode", isOverlay),
  setIgnoreMouseEvents: (ignore) => ipcRenderer.invoke("solice:set-ignore-mouse-events", ignore),
});
