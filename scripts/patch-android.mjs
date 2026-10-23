// بعد از "npx cap add android" اجرا می‌شود و مجوزهای لازم را به AndroidManifest اضافه می‌کند.
// چند بار اجرا شود مشکلی ندارد.
import fs from "fs";

const file = "android/app/src/main/AndroidManifest.xml";
if (!fs.existsSync(file)) {
  console.error("فایل AndroidManifest.xml پیدا نشد. اول باید «npx cap add android» اجرا شود.");
  process.exit(1);
}
let x = fs.readFileSync(file, "utf8");

let add = "";
for (const p of ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"]) {
  if (!x.includes(p)) add += `    <uses-permission android:name="${p}" />\n`;
}
if (!x.includes("android.hardware.location.gps")) {
  add += `    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n`;
}
if (add) x = x.replace("</manifest>", add + "</manifest>");

if (!x.includes("android:screenOrientation")) {
  x = x.replace("<activity", "<activity android:screenOrientation=\"portrait\"");
}

fs.writeFileSync(file, x);
console.log("AndroidManifest.xml به‌روز شد.");
