import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { probarDinero } from "./lib/dinero";
import { probarBarras } from "./lib/barras";

// En desarrollo, verifica los helpers de plata con casos fijos (ver la consola).
if (import.meta.env.DEV) { probarDinero(); probarBarras(); }

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
