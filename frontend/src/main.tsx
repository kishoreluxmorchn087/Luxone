import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import docLogo from "./assets/2.jpg";
import "./index.css";

const favicon = document.querySelector("link[rel='icon']") ?? document.createElement("link");
favicon.setAttribute("rel", "icon");
favicon.setAttribute("type", "image/jpeg");
favicon.setAttribute("href", docLogo);

if (!favicon.parentNode) {
  document.head.appendChild(favicon);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
