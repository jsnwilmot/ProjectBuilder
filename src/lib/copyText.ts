export type CopyTextResult = "copied" | "selected";

export async function copyText(text: string): Promise<CopyTextResult> {
  document.querySelector("[data-copy-fallback]")?.remove();

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      // Use the local selection fallback when clipboard permission is unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-label", "Selected text ready to copy");
  textarea.setAttribute("data-copy-fallback", "");
  textarea.style.position = "fixed";
  textarea.style.right = "16px";
  textarea.style.bottom = "16px";
  textarea.style.zIndex = "1000";
  textarea.style.width = "min(520px, calc(100vw - 32px))";
  textarea.style.height = "120px";
  textarea.style.padding = "12px";
  textarea.style.border = "2px solid #1769e0";
  textarea.style.borderRadius = "8px";
  textarea.style.background = "#fff";
  textarea.style.color = "#1c2738";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  if (copied) {
    textarea.remove();
    return "copied";
  }
  return "selected";
}
