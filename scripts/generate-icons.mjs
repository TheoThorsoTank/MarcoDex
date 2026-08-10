import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#d97706"/>
  <rect x="120" y="120" width="180" height="180" rx="28" fill="#fffbeb" transform="rotate(-8 210 210)"/>
  <circle cx="180" cy="180" r="14" fill="#d97706" transform="rotate(-8 210 210)"/>
  <circle cx="240" cy="240" r="14" fill="#d97706" transform="rotate(-8 210 210)"/>
  <rect x="220" y="220" width="180" height="180" rx="28" fill="#ffffff"/>
  <circle cx="260" cy="260" r="14" fill="#d97706"/>
  <circle cx="360" cy="260" r="14" fill="#d97706"/>
  <circle cx="310" cy="310" r="14" fill="#d97706"/>
  <circle cx="260" cy="360" r="14" fill="#d97706"/>
  <circle cx="360" cy="360" r="14" fill="#d97706"/>
</svg>
`;

mkdirSync("public/icons", { recursive: true });

const targets = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
