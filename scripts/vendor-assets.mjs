// فونت وزیرمتن، Leaflet و Supabase را داخل خود برنامه می‌گذارد تا برنامه به CDN (جی‌اس‌دلیور / گوگل‌فونت) وابسته نباشد
// و در ایران بدون فیلترشکن هم کامل لود شود. اگر هر مرحله خطا بدهد، همان قسمت به حالت قبلی (CDN) می‌ماند و ساخت ادامه پیدا می‌کند.
import fs from "fs";
import path from "path";

const WWW = "www";
const NM = "node_modules";
let html = fs.readFileSync(path.join(WWW, "index.html"), "utf8");
const done = [];

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
function listFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out); else out.push(p);
  }
  return out;
}
function swap(from, to) {
  if (!html.includes(from)) { console.warn("آدرس پیدا نشد:", from.slice(0, 70)); return false; }
  html = html.replace(from, to);
  return true;
}

// ---- Leaflet ----
try {
  const base = path.join(NM, "leaflet", "dist");
  if (!fs.existsSync(path.join(base, "leaflet.js"))) throw new Error("leaflet.js پیدا نشد");
  copy(path.join(base, "leaflet.js"), path.join(WWW, "vendor/leaflet/leaflet.js"));
  copy(path.join(base, "leaflet.css"), path.join(WWW, "vendor/leaflet/leaflet.css"));
  for (const f of listFiles(path.join(base, "images"))) copy(f, path.join(WWW, "vendor/leaflet/images", path.basename(f)));
  const a = swap("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css", "vendor/leaflet/leaflet.css");
  const b = swap("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js", "vendor/leaflet/leaflet.js");
  if (a && b) done.push("leaflet");
} catch (e) { console.warn("leaflet:", e.message); }

// ---- Supabase ----
try {
  const f = path.join(NM, "@supabase", "supabase-js", "dist", "umd", "supabase.js");
  if (!fs.existsSync(f)) throw new Error("supabase.js پیدا نشد");
  copy(f, path.join(WWW, "vendor/supabase.js"));
  if (swap("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js", "vendor/supabase.js")) done.push("supabase");
} catch (e) { console.warn("supabase:", e.message); }

// ---- فونت وزیرمتن ----
try {
  const files = listFiles(path.join(NM, "vazirmatn")).filter((p) => p.toLowerCase().endsWith(".woff2"));
  if (!files.length) throw new Error("فایل woff2 پیدا نشد");
  const out = path.join(WWW, "vendor/fonts");
  fs.mkdirSync(out, { recursive: true });
  let css = "";
  const variable = files.find((p) => /variable|\[wght\]|-vf/i.test(p));
  if (variable) {
    copy(variable, path.join(out, "vazirmatn-var.woff2"));
    css = "@font-face{font-family:'Vazirmatn';src:url('vazirmatn-var.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap;}\n";
  } else {
    const weights = { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
    for (const [name, w] of Object.entries(weights)) {
      const f = files.find((p) => path.basename(p).toLowerCase().replace(/[^a-z]/g, "").endsWith(name + "woff"));
      if (!f) continue;
      copy(f, path.join(out, `vazirmatn-${w}.woff2`));
      css += `@font-face{font-family:'Vazirmatn';src:url('vazirmatn-${w}.woff2') format('woff2');font-weight:${w};font-style:normal;font-display:swap;}\n`;
    }
    if (!css) throw new Error("وزن‌های فونت پیدا نشد");
  }
  fs.writeFileSync(path.join(out, "vazirmatn.css"), css);
  const a = swap('<link rel="preconnect" href="https://fonts.googleapis.com">\n', "");
  const b = swap('<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">', '<link rel="stylesheet" href="vendor/fonts/vazirmatn.css">');
  if (b) done.push("font");
} catch (e) { console.warn("font:", e.message); }

fs.writeFileSync(path.join(WWW, "index.html"), html);
console.log("داخل برنامه قرار گرفت:", done.length ? done.join("، ") : "هیچ‌چیز (از CDN استفاده می‌شود)");
