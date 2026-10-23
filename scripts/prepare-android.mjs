// اسم برنامه (برچسب زیر آیکون) و شماره‌ی نسخه را در پروژه‌ی اندروید تنظیم می‌کند. چند بار اجرا شود مشکلی ندارد.
// در GitHub، شماره‌ی نسخه از متغیر VERSION_CODE (شماره‌ی اجرای ساخت) خوانده می‌شود تا همیشه بزرگ‌تر شود.
import fs from "fs";

const VERSION_CODE = Number(process.env.VERSION_CODE) || 21;
const VERSION_NAME = process.env.VERSION_NAME || "1.1.0";

const cfg = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const appName = cfg.appName;

const strings = "android/app/src/main/res/values/strings.xml";
if (fs.existsSync(strings)) {
  let x = fs.readFileSync(strings, "utf8");
  x = x.replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${appName}$2`);
  x = x.replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${appName}$2`);
  fs.writeFileSync(strings, x);
  console.log("اسم برنامه:", appName);
} else {
  console.warn("strings.xml پیدا نشد (هنوز پروژه‌ی اندروید ساخته نشده)");
}

const gradle = "android/app/build.gradle";
if (fs.existsSync(gradle)) {
  let g = fs.readFileSync(gradle, "utf8");
  g = g.replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`);
  g = g.replace(/versionName\s+"[^"]*"/, `versionName "${VERSION_NAME}"`);
  fs.writeFileSync(gradle, g);
  console.log("versionCode:", VERSION_CODE, " versionName:", VERSION_NAME);
} else {
  console.warn("build.gradle پیدا نشد");
}
