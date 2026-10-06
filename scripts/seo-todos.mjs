// Lista todos los marcadores `{{TODO: …}}` pendientes del repo (contenido y código).
// Uso: npm run seo:todos
import { execFileSync } from "node:child_process";

let output = "";
try {
  output = execFileSync(
    "grep",
    ["-rnoE", "--include=*.json", "--include=*.ts", "--include=*.tsx", "--include=*.mjs", "--include=*.md", "\\{\\{TODO[^}]*\\}\\}", "src", "scripts"],
    { encoding: "utf8" }
  );
} catch (error) {
  if (error.status !== 1) throw error; // 1 = sin coincidencias
}

const lines = output
  .split("\n")
  .filter(Boolean)
  .filter((line) => !line.startsWith("src/lib/todoPlaceholders.ts") && !line.includes("seo-todos.mjs") && !line.includes(".test."));

if (lines.length === 0) {
  console.log("✔ No quedan marcadores {{TODO}} pendientes.");
} else {
  console.log(`${lines.length} marcador(es) {{TODO}} pendientes:\n`);
  for (const line of lines) console.log(line);
}
