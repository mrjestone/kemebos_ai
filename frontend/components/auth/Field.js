"use client";

import { useState } from "react";

// Borderless filled input. type="password" gets a Show/Hide toggle.
export default function Field({ label, id, type = "text", ...props }) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && shown ? "text" : type}
          className={`w-full rounded-xl bg-field py-3.5 pl-4 text-base outline-none transition placeholder:text-muted/60 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-crest-blue),0_8px_24px_-8px_rgba(63,143,217,0.45)] ${
            isPassword ? "pr-16" : "pr-4"
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-muted hover:text-ink"
            aria-label={shown ? "Hide password" : "Show password"}
          >
            {shown ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}
