import sharp from "sharp";
import path from "path";
import fs from "fs";

const OUTPUT_DIR = path.join(process.cwd(), "public", "screenshots");

async function generateStaticScreenshots() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const createHomeScreenshot = async () => {
    const svg = `
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f0a19"/>
            <stop offset="50%" style="stop-color:#1a1025"/>
            <stop offset="100%" style="stop-color:#0f0a19"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#7c3aed"/>
            <stop offset="100%" style="stop-color:#a78bfa"/>
          </linearGradient>
          <linearGradient id="cardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:0.1"/>
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg)"/>

        <!-- Decorative circles -->
        <circle cx="540" cy="700" r="250" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.2"/>
        <circle cx="540" cy="700" r="350" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.15"/>
        <circle cx="540" cy="700" r="450" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.1"/>

        <!-- Stars decoration -->
        <text x="150" y="300" font-size="20" fill="#7c3aed" opacity="0.5">&#10022;</text>
        <text x="920" y="400" font-size="28" fill="#a78bfa" opacity="0.4">&#10023;</text>
        <text x="100" y="900" font-size="18" fill="#7c3aed" opacity="0.3">&#10022;</text>
        <text x="950" y="1000" font-size="24" fill="#a78bfa" opacity="0.35">&#10023;</text>
        <text x="200" y="1400" font-size="22" fill="#7c3aed" opacity="0.25">&#10022;</text>
        <text x="880" y="1500" font-size="26" fill="#a78bfa" opacity="0.3">&#10023;</text>

        <!-- Header bar mockup -->
        <rect x="0" y="0" width="1080" height="80" fill="#0f0a19" opacity="0.8"/>
        <text x="540" y="52" font-family="Georgia, serif" font-size="28" fill="#e9d5ff" text-anchor="middle" font-weight="bold">Arcana</text>

        <!-- Main title -->
        <text x="540" y="280" font-family="Georgia, serif" font-size="56" fill="#ffffff" text-anchor="middle" font-weight="bold">Discover Your</text>
        <text x="540" y="350" font-family="Georgia, serif" font-size="56" fill="url(#accent)" text-anchor="middle" font-weight="bold">Destiny</text>

        <!-- Subtitle -->
        <text x="540" y="420" font-family="system-ui, sans-serif" font-size="22" fill="#9ca3af" text-anchor="middle">AI-powered tarot readings personalized for you</text>

        <!-- Card fan display -->
        <g transform="translate(540, 750)">
          <!-- Left card -->
          <g transform="rotate(-15)">
            <rect x="-100" y="-150" width="200" height="300" rx="12" fill="#1f1635" stroke="#4c1d95" stroke-width="2"/>
            <rect x="-80" y="-130" width="160" height="260" rx="8" fill="url(#cardGlow)"/>
            <text x="0" y="20" font-size="48" text-anchor="middle">&#9734;</text>
          </g>
          <!-- Center card -->
          <g transform="rotate(0)">
            <rect x="-100" y="-150" width="200" height="300" rx="12" fill="#2d1f4e" stroke="#7c3aed" stroke-width="2"/>
            <rect x="-80" y="-130" width="160" height="260" rx="8" fill="url(#cardGlow)"/>
            <text x="0" y="30" font-size="64" text-anchor="middle">&#9883;</text>
          </g>
          <!-- Right card -->
          <g transform="rotate(15)">
            <rect x="-100" y="-150" width="200" height="300" rx="12" fill="#1f1635" stroke="#4c1d95" stroke-width="2"/>
            <rect x="-80" y="-130" width="160" height="260" rx="8" fill="url(#cardGlow)"/>
            <text x="0" y="20" font-size="48" text-anchor="middle">&#9789;</text>
          </g>
        </g>

        <!-- CTA Button -->
        <rect x="290" y="1100" width="500" height="70" rx="35" fill="#7c3aed"/>
        <text x="540" y="1145" font-family="system-ui, sans-serif" font-size="24" fill="#ffffff" text-anchor="middle" font-weight="600">Start Your Reading</text>

        <!-- Features section -->
        <text x="540" y="1280" font-family="system-ui, sans-serif" font-size="18" fill="#6b7280" text-anchor="middle">&#10003; 3 free readings  &#8226;  &#10003; No credit card required</text>

        <!-- Trust badges -->
        <g transform="translate(0, 1380)">
          <rect x="120" y="0" width="250" height="100" rx="12" fill="#1a1025" stroke="#2d1f4e" stroke-width="1"/>
          <text x="245" y="40" font-size="32" text-anchor="middle">&#127183;</text>
          <text x="245" y="75" font-family="system-ui, sans-serif" font-size="14" fill="#a78bfa" text-anchor="middle">78 Cards</text>

          <rect x="415" y="0" width="250" height="100" rx="12" fill="#1a1025" stroke="#2d1f4e" stroke-width="1"/>
          <text x="540" y="40" font-size="32" text-anchor="middle">&#10024;</text>
          <text x="540" y="75" font-family="system-ui, sans-serif" font-size="14" fill="#a78bfa" text-anchor="middle">AI Powered</text>

          <rect x="710" y="0" width="250" height="100" rx="12" fill="#1a1025" stroke="#2d1f4e" stroke-width="1"/>
          <text x="835" y="40" font-size="32" text-anchor="middle">&#128274;</text>
          <text x="835" y="75" font-family="system-ui, sans-serif" font-size="14" fill="#a78bfa" text-anchor="middle">Private</text>
        </g>

        <!-- Bottom navigation mockup -->
        <rect x="0" y="1800" width="1080" height="120" fill="#0f0a19"/>
        <line x1="0" y1="1800" x2="1080" y2="1800" stroke="#2d1f4e" stroke-width="1"/>
        <text x="200" y="1860" font-size="24" fill="#6b7280" text-anchor="middle">&#127968;</text>
        <text x="200" y="1890" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Home</text>
        <text x="540" y="1860" font-size="24" fill="#7c3aed" text-anchor="middle">&#10022;</text>
        <text x="540" y="1890" font-family="system-ui, sans-serif" font-size="12" fill="#7c3aed" text-anchor="middle">Reading</text>
        <text x="880" y="1860" font-size="24" fill="#6b7280" text-anchor="middle">&#128100;</text>
        <text x="880" y="1890" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Profile</text>
      </svg>
    `;

    await sharp(Buffer.from(svg)).png().toFile(path.join(OUTPUT_DIR, "home.png"));
    console.log("  home.png created");
  };

  const createReadingScreenshot = async () => {
    const svg = `
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f0a19"/>
            <stop offset="50%" style="stop-color:#1a1025"/>
            <stop offset="100%" style="stop-color:#0f0a19"/>
          </linearGradient>
          <linearGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#7c3aed"/>
            <stop offset="100%" style="stop-color:#a78bfa"/>
          </linearGradient>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fbbf24"/>
            <stop offset="100%" style="stop-color:#f59e0b"/>
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg2)"/>

        <!-- Subtle glow behind cards -->
        <ellipse cx="540" cy="650" rx="400" ry="300" fill="#7c3aed" opacity="0.05"/>

        <!-- Header -->
        <rect x="0" y="0" width="1080" height="80" fill="#0f0a19" opacity="0.9"/>
        <text x="60" y="52" font-family="system-ui, sans-serif" font-size="24" fill="#a78bfa">&#8592;</text>
        <text x="540" y="52" font-family="Georgia, serif" font-size="24" fill="#e9d5ff" text-anchor="middle" font-weight="bold">Your Reading</text>

        <!-- Title -->
        <text x="540" y="160" font-family="Georgia, serif" font-size="36" fill="#ffffff" text-anchor="middle">Three Card Spread</text>
        <text x="540" y="200" font-family="system-ui, sans-serif" font-size="18" fill="#9ca3af" text-anchor="middle">Past - Present - Future</text>

        <!-- Three cards layout -->
        <!-- Card 1 - Past -->
        <g transform="translate(180, 350)">
          <rect x="0" y="0" width="200" height="300" rx="12" fill="#1f1635" stroke="#7c3aed" stroke-width="2"/>
          <text x="100" y="50" font-family="system-ui, sans-serif" font-size="14" fill="#a78bfa" text-anchor="middle">PAST</text>
          <text x="100" y="160" font-size="56" text-anchor="middle">&#9883;</text>
          <text x="100" y="240" font-family="Georgia, serif" font-size="16" fill="#e9d5ff" text-anchor="middle">The Moon</text>
          <text x="100" y="270" font-family="system-ui, sans-serif" font-size="12" fill="#7c3aed" text-anchor="middle">Intuition</text>
        </g>

        <!-- Card 2 - Present -->
        <g transform="translate(440, 350)">
          <rect x="0" y="0" width="200" height="300" rx="12" fill="#2d1f4e" stroke="url(#gold)" stroke-width="3"/>
          <text x="100" y="50" font-family="system-ui, sans-serif" font-size="14" fill="#fbbf24" text-anchor="middle">PRESENT</text>
          <text x="100" y="160" font-size="56" text-anchor="middle">&#9734;</text>
          <text x="100" y="240" font-family="Georgia, serif" font-size="16" fill="#e9d5ff" text-anchor="middle">The Star</text>
          <text x="100" y="270" font-family="system-ui, sans-serif" font-size="12" fill="#fbbf24" text-anchor="middle">Hope</text>
        </g>

        <!-- Card 3 - Future -->
        <g transform="translate(700, 350)">
          <rect x="0" y="0" width="200" height="300" rx="12" fill="#1f1635" stroke="#7c3aed" stroke-width="2"/>
          <text x="100" y="50" font-family="system-ui, sans-serif" font-size="14" fill="#a78bfa" text-anchor="middle">FUTURE</text>
          <text x="100" y="160" font-size="56" text-anchor="middle">&#9788;</text>
          <text x="100" y="240" font-family="Georgia, serif" font-size="16" fill="#e9d5ff" text-anchor="middle">The Sun</text>
          <text x="100" y="270" font-family="system-ui, sans-serif" font-size="12" fill="#7c3aed" text-anchor="middle">Joy</text>
        </g>

        <!-- Interpretation section -->
        <rect x="60" y="720" width="960" height="400" rx="16" fill="#1a1025" stroke="#2d1f4e" stroke-width="1"/>

        <text x="100" y="780" font-family="Georgia, serif" font-size="24" fill="#e9d5ff">Interpretation</text>

        <text x="100" y="830" font-family="system-ui, sans-serif" font-size="16" fill="#9ca3af">
          <tspan x="100" dy="0">Your journey shows a path from uncertainty to</tspan>
          <tspan x="100" dy="28">clarity. The Moon in your past represents a time</tspan>
          <tspan x="100" dy="28">of confusion and hidden truths...</tspan>
        </text>

        <text x="100" y="940" font-family="system-ui, sans-serif" font-size="16" fill="#9ca3af">
          <tspan x="100" dy="0">The Star illuminates your present moment,</tspan>
          <tspan x="100" dy="28">bringing hope and renewed faith. Trust in the</tspan>
          <tspan x="100" dy="28">process of healing and transformation...</tspan>
        </text>

        <text x="100" y="1050" font-family="system-ui, sans-serif" font-size="16" fill="#a78bfa">Read more...</text>

        <!-- Your Intention section -->
        <rect x="60" y="1150" width="960" height="120" rx="16" fill="#1a1025" stroke="#2d1f4e" stroke-width="1"/>
        <text x="100" y="1200" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280">YOUR INTENTION</text>
        <text x="100" y="1240" font-family="system-ui, sans-serif" font-size="18" fill="#e9d5ff">"What guidance do I need for my career path?"</text>

        <!-- Action buttons -->
        <rect x="60" y="1320" width="460" height="60" rx="30" fill="#7c3aed"/>
        <text x="290" y="1360" font-family="system-ui, sans-serif" font-size="18" fill="#ffffff" text-anchor="middle" font-weight="600">Save Reading</text>

        <rect x="560" y="1320" width="460" height="60" rx="30" fill="none" stroke="#7c3aed" stroke-width="2"/>
        <text x="790" y="1360" font-family="system-ui, sans-serif" font-size="18" fill="#a78bfa" text-anchor="middle" font-weight="600">Share</text>

        <!-- Notes section hint -->
        <rect x="60" y="1420" width="960" height="80" rx="12" fill="#0f0a19" stroke="#2d1f4e" stroke-width="1" stroke-dasharray="5,5"/>
        <text x="540" y="1470" font-family="system-ui, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle">+ Add your personal notes...</text>

        <!-- Stats bar -->
        <rect x="60" y="1540" width="960" height="60" rx="12" fill="#1a1025"/>
        <text x="200" y="1580" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">&#128197; Dec 29, 2024</text>
        <text x="540" y="1580" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">&#127183; 3 cards</text>
        <text x="880" y="1580" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">&#9201; 5 min read</text>

        <!-- Bottom navigation mockup -->
        <rect x="0" y="1800" width="1080" height="120" fill="#0f0a19"/>
        <line x1="0" y1="1800" x2="1080" y2="1800" stroke="#2d1f4e" stroke-width="1"/>
        <text x="200" y="1860" font-size="24" fill="#6b7280" text-anchor="middle">&#127968;</text>
        <text x="200" y="1890" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Home</text>
        <text x="540" y="1860" font-size="24" fill="#7c3aed" text-anchor="middle">&#10022;</text>
        <text x="540" y="1890" font-family="system-ui, sans-serif" font-size="12" fill="#7c3aed" text-anchor="middle">Reading</text>
        <text x="880" y="1860" font-size="24" fill="#6b7280" text-anchor="middle">&#128100;</text>
        <text x="880" y="1890" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Profile</text>
      </svg>
    `;

    await sharp(Buffer.from(svg)).png().toFile(path.join(OUTPUT_DIR, "reading.png"));
    console.log("  reading.png created");
  };

  console.log("Generating PWA screenshots...");

  await createHomeScreenshot();
  await createReadingScreenshot();

  console.log("Screenshots generated in public/screenshots/");
}

generateStaticScreenshots().catch(console.error);
