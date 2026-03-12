"use client";

import { GooeyToaster as Toaster } from "goey-toast";
import "goey-toast/styles.css";

export function GoeyToaster() {
  return (
    <Toaster
      position="top-center"
      theme="dark"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        className: "!rounded-2xl !shadow-xl !shadow-black/40 !border-white/10",
      }}
    />
  );
}
