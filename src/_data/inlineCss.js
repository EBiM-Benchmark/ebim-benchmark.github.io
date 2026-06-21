import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";

const cssPath = fileURLToPath(new URL("../css/style.css", import.meta.url));
const raw = readFileSync(cssPath, "utf8");
const { styles, errors } = new CleanCSS({ level: 1 }).minify(raw); // level 1 = safe, no rule reordering
if (errors.length) throw new Error("clean-css failed: " + errors.join("; "));
export default styles;
