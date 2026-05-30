import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
// import { DevTools } from "jotai-devtools";
import React from "react";
import ReactDOM from "react-dom/client";
import pkg from "../package.json";
import { App } from "./App";
import { theme } from "./theme";

import "./main.css";

// versioned storage: bumping the major/minor of pkg.version invalidates stale per-version state on next load.
const VERSION_KEY = "nosaray-version";
const storedVersion = localStorage.getItem(VERSION_KEY);
if (storedVersion === null) {
  // first visit on a version-aware build: clear stale color-mode so the new default (dark) applies
  localStorage.removeItem("chakra-ui-color-mode");
  // cleanup of legacy migration flag
  localStorage.removeItem("nosaray-color-mode-default-dark-v1");
}
if (storedVersion !== pkg.version) {
  localStorage.setItem(VERSION_KEY, pkg.version);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode="dark" />
    <ChakraProvider theme={theme}>
      {/* <DevTools /> */}
      <App />
    </ChakraProvider>
  </React.StrictMode>,
);
