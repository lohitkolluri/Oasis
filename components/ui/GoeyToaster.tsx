"use client";

import { GooeyToaster as Toaster } from "goey-toast";
import "goey-toast/styles.css";

export function GoeyToaster() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      richColors
      closeButton
      duration={4000}
    />
  );
}
