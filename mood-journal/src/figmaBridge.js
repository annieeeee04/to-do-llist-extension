export function isRunningInFigmaPlugin() {
    return typeof parent !== "undefined" && parent !== window;
  }
  
  export function sendToFigma(message) {
    if (!isRunningInFigmaPlugin()) return;
    parent.postMessage({ pluginMessage: message }, "*");
  }
  