export async function copyToClipboard(text: string): Promise<void> {
  if (!text || !text.trim()) {
    throw new Error("No prompt text to copy")
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  textarea.style.top = "-9999px"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const successful = document.execCommand("copy")
  document.body.removeChild(textarea)

  if (!successful) {
    throw new Error("Clipboard copy failed")
  }
}
