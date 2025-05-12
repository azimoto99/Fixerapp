import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(App, null),
    React.createElement(Toaster, null)
  )
);
