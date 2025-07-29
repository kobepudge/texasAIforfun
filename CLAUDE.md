# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React App)
```bash
# Install dependencies (use legacy peer deps for React 19 compatibility)
npm install --legacy-peer-deps

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Backend (GTO Server)
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start server
npm start

# Start with auto-reload during development
npm run dev
```

## Architecture Overview

This is a Texas Hold'em poker AI battle demonstration project built with React + TypeScript frontend and Node.js backend.

### Core Architecture
- **Frontend**: React 18 with TypeScript, Tailwind CSS, Radix UI components
- **Backend**: Express server providing GTO (Game Theory Optimal) strategy data
- **AI System**: Multi-layered decision engine with hybrid session management

### Key Components

#### Core Game Engine (`/src/core/`)
- `game-engine.ts` - Main game engine managing state, turns, and player actions
- `event-bus.ts` - Event system for game event pub/sub

#### AI Decision System (`/src/ai/`)
- `fast-decision-engine.ts` - Three-layer decision architecture (50ms → 1-3s → 200ms)
- `ai-player.ts` - AI player entities with configurable personalities
- `ai-instance-manager.ts` - AI performance monitoring and health management
- `adaptive-prompt-manager.ts` - Context-aware prompt generation based on situation complexity
- `ai-api-pool.ts` - Concurrent API request management

#### Game Logic (`/src/utils/`)
- `gto-ai-system.ts` - GTO AI system with hybrid session architecture
- `hybrid-session-manager.ts` - Smart token management and session continuity
- `poker.ts` - Core poker game utilities and rules
- `ai-personalities.ts` - Different AI playing styles configuration

### AI Decision Layers
1. **Fast Filter (50ms)**: Cache queries, obvious decisions, simple situations
2. **Strategy Analysis (1-3s)**: GTO base strategy, opponent modeling, situation assessment  
3. **Fine Tuning (200ms)**: Complex analysis, meta-game considerations, final optimization

### Environment Configuration

#### Frontend Environment Variables
```bash
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_AI_API_KEY=your-api-key
REACT_APP_AI_BASE_URL=https://api.tu-zi.com/v1
```

#### Backend Environment Variables
```bash
PORT=3001
NODE_ENV=development
```

## Important Notes

### React 19 Compatibility
Always use `--legacy-peer-deps` flag when installing npm packages due to React 19 compatibility requirements.

### AI System Features
- **Hybrid Session Management**: Automatic token management with 37,500 token threshold
- **No Timeout Strategy**: AI decisions run without time limits to ensure quality
- **Concurrent Processing**: 3 parallel API connections for optimal performance
- **Smart Caching**: LRU cache for similar game situations

### API Integration
- Uses standard `/chat/completions` endpoint with conversation history management
- JSON response format for structured AI decisions
- Automatic fallback to GTO base strategy if AI fails

### Key File Locations
- Main game table: `src/components/PokerTable.tsx`
- AI configuration: `src/components/AIConfig.tsx`
- Game state management: `src/hooks/useGameState.ts`
- Backend GTO data: `server/gto-data.js`

### Development Tips
- Monitor AI performance via `AIStatusMonitor` component
- Use `HybridSessionMonitor` to track token usage
- Check browser console for detailed AI decision logs
- Server runs on port 3001, frontend on default React port (3000)