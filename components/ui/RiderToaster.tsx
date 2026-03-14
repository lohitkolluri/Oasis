"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * react-toastify for the rider app: swipe-to-dismiss on mobile, progress bar,
 * safe-area aware, and mobile-first layout. Admin/auth keep GoeyToaster.
 */
export function RiderToaster() {
  return (
    <ToastContainer
      position="top-center"
      theme="dark"
      limit={1}
      autoClose={4000}
      closeOnClick
      pauseOnHover
      draggable
      draggablePercent={60}
      hideProgressBar={false}
      newestOnTop
      closeButton
      className="rider-toast-container"
      toastClassName="rider-toast"
      progressClassName="rider-toast-progress"
    />
  );
}
