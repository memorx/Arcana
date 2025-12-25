import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const publicDir = path.join(process.cwd(), "public");

// SVG for the Arcana star logo
const createLogoSVG = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e1b4b"/>
      <stop offset="100%" style="stop-color:#0f0a19"/>
    </linearGradient>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a78bfa"/>
      <stop offset="50%" style="stop-color:#f59e0b"/>
      <stop offset="100%" style="stop-color:#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bgGrad)" rx="${size * 0.15}"/>
  <text
    x="50%"
    y="55%"
    font-family="Georgia, serif"
    font-size="${size * 0.5}"
    fill="url(#starGrad)"
    text-anchor="middle"
    dominant-baseline="middle"
  >☆</text>
</svg>
`;

// SVG for the OG image
const createOGImageSVG = () => `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e1b4b"/>
      <stop offset="50%" style="stop-color:#0f0a19"/>
      <stop offset="100%" style="stop-color:#1e1b4b"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#a78bfa"/>
      <stop offset="50%" style="stop-color:#f59e0b"/>
      <stop offset="100%" style="stop-color:#a78bfa"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Decorative stars -->
  <text x="100" y="100" font-size="40" fill="#a78bfa" opacity="0.2">✦</text>
  <text x="1050" y="150" font-size="50" fill="#f59e0b" opacity="0.2">☆</text>
  <text x="150" y="500" font-size="35" fill="#f59e0b" opacity="0.15">✧</text>
  <text x="1000" y="520" font-size="45" fill="#a78bfa" opacity="0.2">✦</text>

  <!-- Main star icon -->
  <text
    x="600"
    y="220"
    font-family="Georgia, serif"
    font-size="120"
    fill="url(#textGrad)"
    text-anchor="middle"
    filter="url(#glow)"
  >☆</text>

  <!-- ARCANA text -->
  <text
    x="600"
    y="360"
    font-family="Georgia, serif"
    font-size="90"
    font-weight="bold"
    fill="url(#textGrad)"
    text-anchor="middle"
    letter-spacing="15"
  >ARCANA</text>

  <!-- Tagline -->
  <text
    x="600"
    y="440"
    font-family="Georgia, serif"
    font-size="36"
    fill="#94a3b8"
    text-anchor="middle"
  >AI Tarot Readings</text>

  <!-- Subtitle -->
  <text
    x="600"
    y="520"
    font-family="Georgia, serif"
    font-size="24"
    fill="#64748b"
    text-anchor="middle"
  >Discover your path with personalized interpretations</text>
</svg>
`;

async function generateImages() {
  console.log("Generating PWA icons and OG image...\n");

  // Generate 192x192 icon
  console.log("Creating icon-192.png...");
  await sharp(Buffer.from(createLogoSVG(192)))
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));
  console.log("✓ icon-192.png created");

  // Generate 512x512 icon
  console.log("Creating icon-512.png...");
  await sharp(Buffer.from(createLogoSVG(512)))
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));
  console.log("✓ icon-512.png created");

  // Generate OG image
  console.log("Creating og-image.jpg...");
  await sharp(Buffer.from(createOGImageSVG()))
    .jpeg({ quality: 90 })
    .toFile(path.join(publicDir, "og-image.jpg"));
  console.log("✓ og-image.jpg created");

  console.log("\nAll images generated successfully!");
}

generateImages().catch(console.error);
