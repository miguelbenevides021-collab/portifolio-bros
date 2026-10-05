// Aplica o tema salvo antes de desenhar a página.
try {
  const t = localStorage.getItem("bros-theme");
  document.documentElement.dataset.theme =
    t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
} catch (e) {
  document.documentElement.dataset.theme = "light";
}
