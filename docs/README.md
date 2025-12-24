# Bhindi SaaS Clone - Complete Documentation

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Getting Started](#getting-started)
4. [Development Guide](#development-guide)
5. [Deployment](#deployment)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Security](#security)
9. [Monitoring & Observability](#monitoring--observability)

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   Chat   │  │Workspace │  │ Settings │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Node.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   Chat   │  │  Agents  │  │  Tools   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   AI Engine (Orchestrator)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  OpenAI  │  │Anthropic │  │  Google  │  │  Tools   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   PostgreSQL     │         │      Redis       │         │
│  │  (Primary DB)    │         │   (Cache/Queue)  │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Frontend (React + TypeScript)**
- Modern React 18 with TypeScript
- Tailwind CSS for styling
- React Query for data fetching
- Zustand for state management
- Socket.IO client for real-time features

**Backend API (Node.js + Express)**
- RESTful API with Express
- JWT authentication
- PostgreSQL for data persistence
- Redis for caching and sessions
- Socket.IO for real-time communication

**AI Engine**
- Multi-model support (OpenAI, Anthropic, Google)
- Agent orchestration
- Tool execution framework
- Context management

**Data Layer**
- PostgreSQL for relational data
- Redis for caching and queues
- S3 for file storage (optional)

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **UI Components**: Custom + Lucide Icons

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **ORM**: Raw SQL with pg
- **Authentication**: JWT + bcrypt
- **Validation**: Zod + express-validator
- **Real-time**: Socket.IO
- **Job Queue**: Bull
- **Logging**: Winston
- **Monitoring**: Sentry (optional)

### AI Engine
- **OpenAI**: GPT-4, GPT-3.5
- **Anthropic**: Claude 3
- **Google**: Gemini Pro
- **Tool Framework**: Custom orchestrator

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose (dev), Kubernetes (prod)
- **CI/CD**: GitHub Actions
- **Cloud**: AWS/GCP/Azure compatible

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/itskiranbabu/bhindi-saas-clone.git
cd bhindi-saas-clone
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Create database
createdb bhindi_saas

# Run migrations
npm run db:migrate

# Seed data (optional)
npm run db:seed
```

5. **Start development servers**
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:frontend  # Port 3000
npm run dev:backend   # Port 8000
npm run dev:ai        # Port 8001
```

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 💻 Development Guide

### Project Structure
```
bhindi-saas-clone/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── layouts/      # Layout components
│   │   ├── stores/       # Zustand stores
│   │   ├── lib/          # Utilities & API client
│   │   └── hooks/        # Custom React hooks
│   └── package.json
├── backend/              # Express backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── database/     # DB connection & queries
│   │   ├── cache/        # Redis utilities
│   │   ├── socket/       # Socket.IO handlers
│   │   ├── workers/      # Background jobs
│   │   └── utils/        # Utilities
│   └── package.json
├── ai-engine/            # AI orchestration
│   ├── src/
│   │   ├── orchestrator.ts
│   │   ├── models/       # AI model integrations
│   │   ├── tools/        # Tool implementations
│   │   └── utils/
│   └── package.json
├── database/             # Database files
│   ├── schema.sql        # Database schema
│   └── migrations/       # Migration files
├── infrastructure/       # Infrastructure configs
│   ├── docker/
│   └── kubernetes/
└── docs/                 # Documentation
```

### API Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/logout` - Logout user

**Users**
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update user profile

**Workspaces**
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/:id` - Get workspace
- `GET /api/workspaces/:id/members` - Get members

**Conversations**
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation
- `POST /api/conversations` - Create conversation
- `POST /api/conversations/:id/messages` - Send message
- `PATCH /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Archive conversation

**Agents**
- `GET /api/agents` - List agents
- `GET /api/agents/executions` - Get executions

**Tools**
- `GET /api/tools` - List tools
- `GET /api/tools/executions` - Get executions

**Workflows**
- `GET /api/workflows` - List workflows
- `GET /api/workflows/:id` - Get workflow
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id/executions` - Get executions

**Subscriptions**
- `GET /api/subscriptions` - Get subscription
- `GET /api/subscriptions/usage` - Get usage quotas

### Database Schema

See `database/schema.sql` for complete schema.

**Core Tables:**
- `users` - User accounts
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - Workspace membership
- `subscriptions` - Billing & plans
- `usage_quotas` - Resource limits
- `conversations` - Chat conversations
- `messages` - Chat messages
- `agents` - AI agents
- `agent_executions` - Agent execution logs
- `tools` - Available tools
- `tool_executions` - Tool execution logs
- `workflows` - Automation workflows
- `workflow_executions` - Workflow runs
- `audit_logs` - Audit trail
- `api_keys` - API authentication

## 🚢 Deployment

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key

**Optional:**
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GOOGLE_AI_API_KEY` - Google AI API key
- `STRIPE_SECRET_KEY` - Stripe for payments
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `SENTRY_DSN` - Error tracking

### Production Deployment

**Using Docker:**
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

**Manual Deployment:**
```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build

# Build AI engine
cd ai-engine && npm run build

# Start services
npm start
```

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- CORS configuration
- Helmet.js security headers
- Input validation with Zod
- SQL injection prevention
- XSS protection
- CSRF tokens (implement as needed)

## 📊 Monitoring & Observability

- Winston logging
- Sentry error tracking
- Health check endpoints
- Audit logs for all actions
- Usage tracking
- Performance metrics

## 📝 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📧 Support

For issues and questions, please open a GitHub issue.
