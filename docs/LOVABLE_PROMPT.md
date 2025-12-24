# LOVABLE MASTER PROMPT - Bhindi SaaS Clone
# Production-Ready AI SaaS Platform

## SYSTEM ROLE
You are an expert full-stack developer building a production-grade SaaS application. You MUST follow this specification exactly without deviation, assumption, or hallucination.

## PRODUCT CONTEXT
Build a complete AI-powered SaaS platform inspired by Bhindi AI with:
- Multi-tenant architecture
- AI chat with context memory
- Agent orchestration system
- 200+ tool integrations
- Subscription management
- Real-time collaboration
- Enterprise-grade security

## NON-NEGOTIABLE CONSTRAINTS

### Technology Stack (EXACT)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js 18 + Express + TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **AI**: OpenAI GPT-4 + Anthropic Claude + Google Gemini
- **Real-time**: Socket.IO
- **State**: Zustand (frontend), PostgreSQL (backend)
- **Auth**: JWT + bcrypt
- **Validation**: Zod

### Architecture Rules
1. Monorepo with 3 services: frontend, backend, ai-engine
2. All services MUST be independently deployable
3. Database schema MUST match provided schema.sql exactly
4. API endpoints MUST follow RESTful conventions
5. All responses MUST be JSON with { success, data/error } format
6. All errors MUST be handled with proper HTTP status codes
7. All database queries MUST use parameterized queries (no SQL injection)
8. All passwords MUST be hashed with bcrypt (12 rounds)
9. All API routes (except auth) MUST require JWT authentication
10. All user inputs MUST be validated before processing

## ARCHITECTURE DEFINITION

### Database Schema (EXACT - DO NOT MODIFY)
```sql
-- See database/schema.sql for complete schema
-- Core tables: users, workspaces, workspace_members, subscriptions,
-- usage_quotas, conversations, messages, agents, agent_executions,
-- tools, tool_executions, workflows, workflow_executions, audit_logs
```

### API Structure (EXACT)

**Authentication Endpoints:**
- POST /api/auth/register → { email, password, fullName }
- POST /api/auth/login → { email, password }
- GET /api/auth/verify → Verify JWT token
- POST /api/auth/logout → Logout (client-side token removal)

**User Endpoints:**
- GET /api/users/me → Get current user profile
- PATCH /api/users/me → Update user profile

**Workspace Endpoints:**
- GET /api/workspaces → List user's workspaces
- GET /api/workspaces/:id → Get workspace details
- GET /api/workspaces/:id/members → List workspace members

**Conversation Endpoints:**
- GET /api/conversations → List conversations (with ?workspaceId filter)
- GET /api/conversations/:id → Get conversation with messages
- POST /api/conversations → Create new conversation
- POST /api/conversations/:id/messages → Send message
- PATCH /api/conversations/:id → Update conversation
- DELETE /api/conversations/:id → Archive conversation

**Agent Endpoints:**
- GET /api/agents → List available agents
- GET /api/agents/executions → Get agent execution history

**Tool Endpoints:**
- GET /api/tools → List available tools
- GET /api/tools/executions → Get tool execution history

**Workflow Endpoints:**
- GET /api/workflows → List workflows
- GET /api/workflows/:id → Get workflow details
- POST /api/workflows → Create workflow
- GET /api/workflows/:id/executions → Get workflow executions

**Subscription Endpoints:**
- GET /api/subscriptions → Get subscription details
- GET /api/subscriptions/usage → Get usage quotas

### Frontend Structure (EXACT)

**Pages:**
1. LoginPage - Email/password login form
2. RegisterPage - Registration form
3. DashboardPage - Overview with stats
4. ChatPage - Main chat interface
5. WorkspacePage - Workspace management
6. SettingsPage - User settings

**Components:**
1. AuthLayout - Layout for auth pages
2. DashboardLayout - Layout with sidebar + header
3. ChatMessage - Individual message component
4. ChatInput - Message input with send button
5. Sidebar - Navigation sidebar
6. Header - Top header with user menu

**State Management:**
- authStore (Zustand) - User, token, isAuthenticated
- API calls via axios client with interceptors
- Socket.IO client for real-time features

### Backend Structure (EXACT)

**Middleware (MUST IMPLEMENT):**
1. authenticate - Verify JWT token
2. errorHandler - Global error handling
3. rateLimiter - Rate limiting (100 req/15min)
4. requestLogger - Log all requests
5. aiRateLimiter - AI-specific rate limiting

**Services:**
1. Database connection with pooling
2. Redis connection with retry logic
3. Socket.IO server with authentication
4. AI orchestrator with multi-model support

### AI Engine Structure (EXACT)

**Core Components:**
1. AIOrchestrator class
   - process(request) → AIResponse
   - stream(request, onChunk) → void
   - executeTool(name, params) → result

2. Model Support:
   - OpenAI (GPT-4, GPT-3.5)
   - Anthropic (Claude 3)
   - Google (Gemini Pro)

3. Tool Framework:
   - Tool registration
   - Tool execution
   - Error handling

## BUILD PHASES

### Phase 1: Foundation (MUST COMPLETE FIRST)
1. Setup monorepo structure
2. Install all dependencies (exact versions from package.json files)
3. Create database schema (run schema.sql)
4. Setup environment variables (.env.example → .env)
5. Configure TypeScript for all services
6. Setup Tailwind CSS for frontend

**Validation:**
- All services start without errors
- Database connection successful
- Redis connection successful
- TypeScript compiles without errors

### Phase 2: Authentication (MUST COMPLETE SECOND)
1. Implement JWT generation/verification
2. Implement password hashing with bcrypt
3. Create auth routes (register, login, verify, logout)
4. Create auth middleware
5. Create auth store (Zustand)
6. Create LoginPage and RegisterPage
7. Implement protected routes

**Validation:**
- User can register with email/password
- User can login and receive JWT token
- Token is stored in localStorage
- Protected routes redirect to login if not authenticated
- Token is sent in Authorization header

### Phase 3: Core Features (MUST COMPLETE THIRD)
1. Implement conversation CRUD
2. Implement message sending
3. Setup Socket.IO for real-time chat
4. Create ChatPage with message list
5. Create ChatInput component
6. Implement AI orchestrator
7. Connect chat to AI engine

**Validation:**
- User can create conversations
- User can send messages
- Messages appear in real-time
- AI responds to messages
- Conversation history persists

### Phase 4: Advanced Features (MUST COMPLETE FOURTH)
1. Implement workspace management
2. Implement agent system
3. Implement tool system
4. Implement workflow system
5. Implement subscription management
6. Implement usage tracking

**Validation:**
- Workspaces isolate data correctly
- Agents execute successfully
- Tools integrate properly
- Workflows run as expected
- Usage quotas enforced

### Phase 5: Production Hardening (MUST COMPLETE LAST)
1. Add comprehensive error handling
2. Add rate limiting to all endpoints
3. Add input validation to all endpoints
4. Add audit logging
5. Add monitoring/observability
6. Add Docker configurations
7. Add CI/CD pipeline
8. Add comprehensive tests

**Validation:**
- All errors handled gracefully
- Rate limits prevent abuse
- Invalid inputs rejected
- All actions logged
- Services containerized
- Tests pass

## VALIDATION RULES

### Code Quality
- NO console.log in production code (use logger)
- NO any types in TypeScript
- NO inline styles (use Tailwind classes)
- NO hardcoded values (use environment variables)
- NO SQL string concatenation (use parameterized queries)
- NO plain text passwords (always hash)
- NO missing error handling
- NO missing input validation

### API Responses
- ALWAYS return { success: true, data: {...} } on success
- ALWAYS return { success: false, error: "message" } on error
- ALWAYS use appropriate HTTP status codes
- ALWAYS validate request body/params
- ALWAYS handle database errors
- ALWAYS log errors with context

### Security
- ALWAYS hash passwords with bcrypt (12 rounds)
- ALWAYS validate JWT tokens
- ALWAYS use parameterized SQL queries
- ALWAYS sanitize user inputs
- ALWAYS implement rate limiting
- ALWAYS use HTTPS in production
- ALWAYS set secure HTTP headers

### Database
- ALWAYS use transactions for multi-step operations
- ALWAYS handle connection errors
- ALWAYS use connection pooling
- ALWAYS index foreign keys
- ALWAYS use timestamps (created_at, updated_at)
- ALWAYS soft delete (deleted_at) instead of hard delete

## ANTI-HALLUCINATION INSTRUCTIONS

### DO NOT:
1. Create endpoints not specified in this document
2. Modify database schema without explicit instruction
3. Use libraries not listed in package.json files
4. Assume features exist that aren't documented
5. Skip error handling
6. Skip input validation
7. Use mock data in production code
8. Implement features not in the specification

### DO:
1. Follow the exact API structure provided
2. Use the exact database schema provided
3. Implement all middleware as specified
4. Handle all error cases
5. Validate all inputs
6. Log all important events
7. Test each feature after implementation
8. Ask for clarification if specification is unclear

## EXECUTION CHECKLIST

Before marking any phase complete, verify:
- [ ] All files created as specified
- [ ] All dependencies installed
- [ ] All TypeScript errors resolved
- [ ] All environment variables configured
- [ ] All database tables created
- [ ] All API endpoints working
- [ ] All authentication working
- [ ] All error handling implemented
- [ ] All validation implemented
- [ ] All logging implemented
- [ ] All tests passing
- [ ] All Docker containers building
- [ ] All services starting successfully

## SUCCESS CRITERIA

The application is complete when:
1. User can register and login
2. User can create and manage conversations
3. User can send messages and receive AI responses
4. Messages appear in real-time via WebSocket
5. Workspaces isolate data correctly
6. Agents and tools execute successfully
7. Subscriptions and usage tracking work
8. All API endpoints return proper responses
9. All errors are handled gracefully
10. All services run in Docker containers
11. Application is production-ready

## FINAL NOTE

This is a PRODUCTION application, not a demo. Every feature must be:
- Fully functional
- Properly error-handled
- Securely implemented
- Well-tested
- Production-ready

NO shortcuts. NO placeholders. NO "TODO" comments in production code.

If you encounter ambiguity, STOP and ask for clarification rather than making assumptions.
