# Agentic Router UI

A beautiful, modern frontend for the Agentic Router Document Intelligence API.

![Agentic Router](https://img.shields.io/badge/Agentic-Router-blue?style=for-the-badge)

## Features

🔥 **Document Chat** - Natural language queries over your uploaded documents  
✨ **Data Extraction** - AI-powered extraction of structured information  
📊 **EDGAR Search** - Search and analyze SEC filings  
📁 **Document Management** - Upload, organize, and manage your PDF documents  

## Tech Stack

- **React 18** with Vite for blazing fast development
- **Tailwind CSS** for beautiful, responsive styling
- **Framer Motion** for smooth animations
- **Lucide Icons** for consistent iconography

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Start development server
npm run dev
```

### Configuration

Edit `.env` to point to your API:

```env
VITE_API_URL=https://your-api-url.railway.app
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Deployment

### Railway

1. Push to GitHub
2. Connect repo to Railway
3. Set `VITE_API_URL` environment variable
4. Deploy!

### Vercel

```bash
npm run build
# Deploy dist folder to Vercel
```

### Netlify

```bash
npm run build
# Deploy dist folder to Netlify
```

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx       # Navigation sidebar
│   ├── Header.jsx        # Page header
│   ├── ChatPanel.jsx     # Chat interface
│   ├── DocumentPanel.jsx # Document management
│   ├── ExtractPanel.jsx  # Data extraction
│   ├── EdgarPanel.jsx    # SEC filings search
│   └── Toast.jsx         # Notifications
├── App.jsx               # Main app component
├── main.jsx             # Entry point
└── index.css            # Global styles
```

## API Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `POST /upload` | Upload PDF documents |
| `GET /status` | Get uploaded documents |
| `POST /chatbot/query` | Query documents |
| `POST /extract` | Extract data from pages |
| `POST /edgar` | Search SEC filings |
| `DELETE /delete/:id` | Delete document |

## Design Philosophy

- **Deep Ocean Theme** - Professional, modern dark aesthetic
- **Glass Morphism** - Subtle transparency effects
- **Smooth Animations** - Delightful micro-interactions
- **Responsive** - Works on all screen sizes

## License

MIT
