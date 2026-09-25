// components/Toast.js
import React from "react";

export default function Toast({ type = "success", message }) {
  return (
    <div
      className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-300
        ${type === "success" ? "bg-green-500" : "bg-red-500"}
      `}
    >
      {message}
    </div>
  );
}
