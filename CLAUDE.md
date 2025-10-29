# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Open Nof1.ai** is an open-source AI-powered cryptocurrency trading platform that benchmarks AI models by having them trade real money in live markets. It's a Next.js 15 application using DeepSeek AI models for automated trading on Binance.

## Development Commands

### Essential Commands
- `bun dev` - Start development server with Turbopack
- `bun build` - Production build with Turbopack
- `bun start` - Start production server
- `bun lint` - Run ESLint

### Database Commands
- `bunx prisma generate` - Generate Prisma client
- `bunx prisma db push` - Push schema changes to database
- `bunx prisma studio` - Open Prisma Studio (database GUI)

## Architecture Overview

### Core System Components

**AI Trading Engine** (`/lib/ai/`):
- Uses DeepSeek V3 Chat and DeepSeek R1 models for trading decisions
- Chain-of-thought reasoning with full transparency logging
- Multi-model support via Vercel AI SDK

**Automated Trading System**:
- **3-minute intervals**: AI analysis and trading decisions via `/api/cron/3-minutes-run-interval`
- **20-second intervals**: Metrics collection via `/api/cron/20-seconds-metrics-interval`
- Both endpoints require JWT authentication via `CRON_SECRET_KEY`

**Real-Time Dashboard** (`/app/page.tsx`):
- Live crypto prices and performance charts
- Updates every 10 seconds
- Full AI reasoning and trade history visibility

### Key Directories

- `/app/api/cron/` - Automated job endpoints (JWT-protected)
- `/lib/ai/` - AI model configurations, prompts, and tools
- `/lib/trading/` - Buy/sell execution and market state management
- `/components/` - React components including charts and trading views
- `/prisma/` - Database schema for metrics, chat history, and trades

### Database Schema

**Main Entities**:
- **Metrics** - Performance tracking over time
- **Chat** - AI reasoning and decision history
- **Trading** - Individual trading operations

**Supported Assets**: BTC, ETH, SOL, BNB, DOGE
**AI Models**: Deepseek, DeepseekThinking, Qwen, Doubao

## Configuration Requirements

### Environment Variables (.env)
Required for full functionality:
- `DATABASE_URL` - PostgreSQL connection
- `DEEPSEEK_API_KEY` - Primary AI model
- `BINANCE_API_KEY` / `BINANCE_API_SECRET` - Trading access
- `BINANCE_USE_SANDBOX=true` - **Critical: Use sandbox for testing**
- `START_MONEY` - Initial capital (e.g., 10000 = $10,000 USDT)
- `CRON_SECRET_KEY` - JWT secret for cron job authentication

### Cron Job Setup
External cron scheduling required:
- Metrics: `POST /api/cron/20-seconds-metrics-interval` (every 20 seconds)
- Trading: `POST /api/cron/3-minutes-run-interval` (every 3 minutes)
- Header: `Authorization: Bearer YOUR_CRON_SECRET_KEY`

## Key Implementation Details

### Trading Logic Flow
1. Market data collection via CCXT
2. AI analysis with technical indicators in `/lib/ai/prompt.ts`
3. Risk management and position sizing calculations
4. Trade execution via Binance API
5. Complete reasoning storage in Chat model

### AI Prompt Engineering
The trading prompts in `/lib/ai/prompt.ts` include:
- Technical analysis using various indicators
- Risk management rules
- Portfolio allocation guidance
- Chain-of-thought reasoning requirements

### Security Considerations
- Cron endpoints are JWT-protected
- Environment-based configuration for sensitive data
- Sandbox mode available for safe testing
- Full audit trail of all AI decisions

## Development Workflow

### Testing Setup
1. Always use `BINANCE_USE_SANDBOX=true` for initial testing
2. Start with small `START_MONEY` amounts (e.g., 30 USDT)
3. Verify database schema with Prisma Studio
4. Test cron endpoints manually before automation

### Model Management
AI models configured in `/lib/ai/model.ts`:
- DeepSeek V3 Chat for primary trading decisions
- DeepSeek R1 for advanced reasoning
- Easy to extend with additional AI SDK providers

### Performance Monitoring
- Real-time charts use Recharts with data sampling
- Metrics collection optimized for frequent updates
- Historical data preserved for strategy analysis

## Common Tasks

### Adding New AI Models
1. Update model configuration in `/lib/ai/model.ts`
2. Add model to database schema enum
3. Update prompt templates if needed

### Extending Trading Assets
1. Add symbol to database schema enum
2. Update trading logic in `/lib/trading/`
3. Modify dashboard components for new price display

### Debugging Trading Issues
1. Check Chat table for AI reasoning
2. Review Trading table for execution details
3. Verify Metrics table for performance tracking
4. Monitor cron job logs for errors