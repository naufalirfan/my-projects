const tools = [
  {
    id: 1,
    tool: "Penpot",
    replaces: "Figma",
    category: "Design",
    price: "Gratis / Self-hosted",
    link: "https://github.com/penpot/penpot",
    description: "Desain UI/UX open source. SVG-native, real-time collab, bisa self-host.",
    level: "Mudah"
  },
  {
    id: 2,
    tool: "n8n",
    replaces: "Zapier",
    category: "Automation",
    price: "Gratis (self-hosted)",
    link: "https://github.com/n8n-io/n8n",
    description: "Workflow automation 400+ integrasi. Visual drag-and-drop builder.",
    level: "Menengah"
  },
  {
    id: 3,
    tool: "Stirling-PDF",
    replaces: "Adobe Acrobat",
    category: "Produktivitas",
    price: "Gratis / Self-hosted",
    link: "https://github.com/Stirling-Tools/Stirling-PDF",
    description: "50+ operasi PDF: merge, split, OCR, convert, sign, compress.",
    level: "Mudah"
  },
  {
    id: 4,
    tool: "Bitwarden",
    replaces: "1Password",
    category: "Keamanan",
    price: "Gratis",
    link: "https://github.com/bitwarden/clients",
    description: "Password manager open source. Sync cross-device, browser extension.",
    level: "Mudah"
  },
  {
    id: 5,
    tool: "Cal.com",
    replaces: "Calendly",
    category: "Produktivitas",
    price: "Gratis",
    link: "https://github.com/calcom/cal.com",
    description: "Penjadwalan meeting self-hosted. Integrasi Google Calendar, Zoom.",
    level: "Menengah"
  },
  {
    id: 6,
    tool: "Ollama",
    replaces: "ChatGPT API",
    category: "AI",
    price: "Gratis (local)",
    link: "https://github.com/ollama/ollama",
    description: "Jalankan LLM (Llama, Mistral, Gemma) di komputermu. Tanpa API key.",
    level: "Menengah"
  },
  {
    id: 7,
    tool: "AppFlowy",
    replaces: "Notion",
    category: "Produktivitas",
    price: "Gratis",
    link: "https://github.com/AppFlowy-IO/AppFlowy",
    description: "Notion-like notes & database. Privasi terjaga, offline-first.",
    level: "Mudah"
  },
  {
    id: 8,
    tool: "Hoppscotch",
    replaces: "Postman",
    category: "Developer",
    price: "Gratis",
    link: "https://github.com/hoppscotch/hoppscotch",
    description: "API testing langsung di browser. REST, GraphQL, WebSocket, SSE.",
    level: "Menengah"
  },
  {
    id: 9,
    tool: "Immich",
    replaces: "Google Photos",
    category: "Media",
    price: "Gratis (self-hosted)",
    link: "https://github.com/immich-app/immich",
    description: "Backup foto & video. Face recognition, smart search, mobile app.",
    level: "Sulit"
  },
  {
    id: 10,
    tool: "Plausible",
    replaces: "Google Analytics",
    category: "Analytics",
    price: "Gratis (self-hosted)",
    link: "https://github.com/plausible/analytics",
    description: "Web analytics privasi-first. Tanpa cookie, GDPR compliant, < 1KB script.",
    level: "Sulit"
  },
  {
    id: 11,
    tool: "Whisper",
    replaces: "Otter.ai",
    category: "AI",
    price: "Gratis (local)",
    link: "https://github.com/openai/whisper",
    description: "Speech-to-text dari OpenAI. 99 bahasa, jalan lokal, akurat.",
    level: "Sulit"
  },
  {
    id: 12,
    tool: "yt-dlp",
    replaces: "YouTube Premium",
    category: "Media",
    price: "Gratis",
    link: "https://github.com/yt-dlp/yt-dlp",
    description: "Download video/audio dari 1000+ situs. Command line tool.",
    level: "Menengah"
  },
  {
    id: 13,
    tool: "Gitea",
    replaces: "GitHub Enterprise",
    category: "Developer",
    price: "Gratis (self-hosted)",
    link: "https://github.com/go-gitea/gitea",
    description: "Git hosting ringan. Push/pull request, CI/CD, package registry.",
    level: "Menengah"
  },
  {
    id: 14,
    tool: "Open-Meteo",
    replaces: "Weather API Berbayar",
    category: "API",
    price: "Gratis",
    link: "https://open-meteo.com",
    description: "API cuaca gratis tanpa API key. Forecast, historical data.",
    level: "Mudah"
  },
  {
    id: 15,
    tool: "PokeAPI",
    replaces: "Game API Berbayar",
    category: "API",
    price: "Gratis",
    link: "https://pokeapi.co",
    description: "Data lengkap Pokemon: stats, moves, evolutions. JSON format.",
    level: "Mudah"
  },
  {
    id: 16,
    tool: "Huly",
    replaces: "Jira",
    category: "Produktivitas",
    price: "Gratis (self-hosted)",
    link: "https://github.com/hcengineering/platform",
    description: "Project management: issues, sprints, time tracking. Alternative Jira/Linear.",
    level: "Menengah"
  },
  {
    id: 17,
    tool: "RocketChat",
    replaces: "Slack",
    category: "Komunikasi",
    price: "Gratis (self-hosted)",
    link: "https://github.com/RocketChat/Rocket.Chat",
    description: "Team chat self-hosted. Channels, DM, video call, file sharing.",
    level: "Menengah"
  },
  {
    id: 18,
    tool: "Nextcloud",
    replaces: "Google Drive",
    category: "Produktivitas",
    price: "Gratis (self-hosted)",
    link: "https://github.com/nextcloud/server",
    description: "Cloud storage sendiri. Files, calendar, contacts, office suite.",
    level: "Menengah"
  },
  {
    id: 19,
    tool: "Mattermost",
    replaces: "Microsoft Teams",
    category: "Komunikasi",
    price: "Gratis",
    link: "https://github.com/mattermost/mattermost",
    description: "Open source team messaging. Thread, channels, integrasi.",
    level: "Menengah"
  },
  {
    id: 20,
    tool: "Vaultwarden",
    replaces: "LastPass",
    category: "Keamanan",
    price: "Gratis (self-hosted)",
    link: "https://github.com/dani-garcia/vaultwarden",
    description: "Bitwarden server ringan. Self-host, hemat RAM, full fitur.",
    level: "Menengah"
  },
  {
    id: 21,
    tool: "Uptime Kuma",
    replaces: "Pingdom",
    category: "DevOps",
    price: "Gratis (self-hosted)",
    link: "https://github.com/louislam/uptime-kuma",
    description: "Monitor uptime website & server. Telegram, Discord, email alerts.",
    level: "Mudah"
  },
  {
    id: 22,
    tool: "Dify",
    replaces: "OpenAI API Platform",
    category: "AI",
    price: "Gratis (self-hosted)",
    link: "https://github.com/langgenius/dify",
    description: "Build AI apps visual. RAG pipelines, prompt management, model routing.",
    level: "Menengah"
  },
  {
    id: 23,
    tool: "Duplicati",
    replaces: "Backblaze",
    category: "DevOps",
    price: "Gratis",
    link: "https://github.com/duplicati/duplicati",
    description: "Backup terenkripsi ke cloud. AWS, Google Drive, OneDrive, local.",
    level: "Menengah"
  },
  {
    id: 24,
    tool: "PhotoPrism",
    replaces: "iCloud Photos",
    category: "Media",
    price: "Gratis (self-hosted)",
    link: "https://github.com/photoprism/photoprism",
    description: "Photo management AI-powered. Face recognition, location, labels.",
    level: "Sulit"
  },
  {
    id: 25,
    tool: "Coolify",
    replaces: "Heroku",
    category: "DevOps",
    price: "Gratis (self-hosted)",
    link: "https://github.com/coollabsio/coolify",
    description: "Deploy app ke VPS sendiri. One-click deploy, auto SSL, Docker.",
    level: "Sulit"
  },
  {
    id: 26,
    tool: "Paperless-ngx",
    replaces: "DocuSign",
    category: "Produktivitas",
    price: "Gratis (self-hosted)",
    link: "https://github.com/paperless-ngx/paperless-ngx",
    description: "Document management. OCR, tag otomatis, search full-text.",
    level: "Menengah"
  },
  {
    id: 27,
    tool: "Firefly III",
    replaces: "Mint",
    category: "Produktivitas",
    price: "Gratis (self-hosted)",
    link: "https://github.com/firefly-iii/firefly-iii",
    description: "Personal finance manager. Budget, expenses, reports, multi-currency.",
    level: "Menengah"
  },
  {
    id: 28,
    tool: "Jellyfin",
    replaces: "Netflix",
    category: "Media",
    price: "Gratis (self-hosted)",
    link: "https://github.com/jellyfin/jellyfin",
    description: "Media server sendiri. Stream film, musik, foto ke semua device.",
    level: "Menengah"
  },
  {
    id: 29,
    tool: "Outline",
    replaces: "Confluence",
    category: "Produktivitas",
    price: "Gratis (self-hosted)",
    link: "https://github.com/outline/outline",
    description: "Wiki & knowledge base untuk tim. Markdown, real-time collab.",
    level: "Menengah"
  },
  {
    id: 30,
    tool: "Meilisearch",
    replaces: "Algolia",
    category: "Developer",
    price: "Gratis (self-hosted)",
    link: "https://github.com/meilisearch/meilisearch",
    description: "Search engine ultra-fast. Typo tolerance, instant results < 50ms.",
    level: "Menengah"
  },
  {
    id: 31,
    tool: "MinIO",
    replaces: "Amazon S3",
    category: "Developer",
    price: "Gratis (self-hosted)",
    link: "https://github.com/minio/minio",
    description: "Object storage S3-compatible. High performance, erasure coding.",
    level: "Sulit"
  },
  {
    id: 32,
    tool: "Supabase",
    replaces: "Firebase",
    category: "Developer",
    price: "Gratis",
    link: "https://github.com/supabase/supabase",
    description: "Backend-as-a-service: database, auth, storage, real-time, edge functions.",
    level: "Menengah"
  },
  {
    id: 33,
    tool: "Sentry",
    replaces: "Datadog APM",
    category: "DevOps",
    price: "Gratis (self-hosted)",
    link: "https://github.com/getsentry/sentry",
    description: "Error tracking & performance monitoring. Crash reports, stack trace.",
    level: "Sulit"
  },
  {
    id: 34,
    tool: "Netbird",
    replaces: "Tailscale",
    category: "Keamanan",
    price: "Gratis (self-hosted)",
    link: "https://github.com/netbirdio/netbird",
    description: "VPN peer-to-peer. WireGuard, zero config, single sign-on.",
    level: "Menengah"
  },
  {
    id: 35,
    tool: "Dokploy",
    replaces: "Vercel",
    category: "DevOps",
    price: "Gratis (self-hosted)",
    link: "https://github.com/Dokploy/dokploy",
    description: "Deploy web apps & databases. Open source Vercel/Netlify alternative.",
    level: "Menengah"
  },
  {
    id: 36,
    tool: "Windmill",
    replaces: "Airflow",
    category: "Automation",
    price: "Gratis (self-hosted)",
    link: "https://github.com/windmill-labs/windmill",
    description: "Workflow engine. Scripts Python/TypeScript/Go, flows, apps.",
    level: "Sulit"
  }
];