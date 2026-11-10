import "dotenv/config";
import { createApp } from "./app.js";
import { providerLabel } from "./lib/ai.js";

const port = Number(process.env.PORT ?? 4000);
// Listen on all interfaces so a phone on the same Wi-Fi can reach the API.
createApp().listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${port}`);
  void providerLabel().then((label) =>
    console.log(label ? `AI features: enabled via ${label}` : "AI features: off (install Ollama, or set GROQ_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY)"),
  );
});
