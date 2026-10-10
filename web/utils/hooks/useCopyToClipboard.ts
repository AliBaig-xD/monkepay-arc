/**
 * useCopyToClipboard Hook
 * Handles copy-to-clipboard functionality with auto-clear feedback
 */

"use client";

import { useState } from "react";

export function useCopyToClipboard() {
  const [copied, setCopied] = useState<{
    value: string | null;
    field: "keyId" | "secret" | null;
  }>({
    value: null,
    field: null,
  });

  const copyToClipboard = (value: string, field: "keyId" | "secret") => {
    navigator.clipboard.writeText(value);
    setCopied({ value, field });
    setTimeout(() => setCopied({ value: null, field: null }), 2000);
  };

  return { copied, copyToClipboard };
}
