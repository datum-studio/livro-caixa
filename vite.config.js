import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: "base" precisa ser exatamente "/<nome-do-repositorio>/".
// Repositório confirmado: github.com/datum-studio/livro-caixa-datum
export default defineConfig({
  plugins: [react()],
  base: "/livro-caixa-datum/",
});
