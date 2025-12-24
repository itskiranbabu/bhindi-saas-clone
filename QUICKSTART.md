# ⚡ Quick Start Guide - Bhindi SaaS Clone

Get your production-ready AI SaaS running in **under 15 minutes**!

## 🎯 Prerequisites (5 minutes)

Install these if you don't have them:

```bash
# Node.js 18+
node --version  # Should be v18.x.x or higher

# Docker & Docker Compose
docker --version
docker-compose --version

# PostgreSQL (or use Docker)
psql --version

# Redis (or use Docker)
redis-cli --version
```

## 🚀 Option 1: Docker (Recommended - 5 minutes)

**Fastest way to get started!**

```bash
# 1. Clone the repository
git clone https://github.com/itskiranbabu/bhindi-saas-clone.git
cd bhindi-saas-clone

# 2. Create environment file
cp .env.example .env

# 3. Add your AI API keys to .env
# OPENAI_API_KEY=sk-...
# (Optional: ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY)

# 4. Start everything with Docker
docker-compose up -d

# 5. Wait for services to start (30 seconds)
docker-compose ps

# 6. Run database migrations
docker-compose exec backend npm run db:migrate

# 7. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# AI Engine: http://localhost:8001
```

**That's it! You're running! 🎉**

## 🛠️ Option 2: Manual Setup (10 minutes)

**For developers who want more control:**

### Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/itskiranbabu/bhindi-saas-clone.git
cd bhindi-saas-clone

# Install all dependencies
npm install
```

### Step 2: Setup Database (2 minutes)

```bash
# Create database
createdb bhindi_saas

# Set database URL in .env
echo "DATABASE_URL=postgresql://localhost:5432/bhindi_saas" >> .env

# Run migrations
cd backend
npm run db:migrate
cd ..
```

### Step 3: Setup Redis (1 minute)

```bash
# Start Redis (if not running)
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine

# Set Redis URL in .env
echo "REDIS_URL=redis://localhost:6379" >> .env
```

### Step 4: Configure Environment (2 minutes)

```bash
# Copy example environment
cp .env.example .env

# Edit .env and add:
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - OPENAI_API_KEY (get from OpenAI dashboard)
# - Other API keys as needed
```

### Step 5: Start Services (3 minutes)

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start AI engine
cd ai-engine
npm run dev

# Terminal 3: Start frontend
cd frontend
npm run dev
```

**Access your app:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- AI Engine: http://localhost:8001

## ✅ Verify Installation

### Test Backend
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy",...}
```

### Test AI Engine
```bash
curl http://localhost:8001/health
# Should return: {"status":"healthy",...}
```

### Test Frontend
Open http://localhost:3000 in your browser
- You should see the login page
- Click "Register" to create an account

## 🎮 First Steps

### 1. Create an Account
```
1. Go to http://localhost:3000
2. Click "Register"
3. Enter email, password, and name
4. Click "Create Account"
```

### 2. Start Chatting
```
1. You'll be redirected to the dashboard
2. Click "New Chat" or go to /chat
3. Type a message
4. Get AI response!
```

### 3. Explore Features
- **Dashboard**: Overview of your activity
- **Chat**: AI conversations
- **Workspace**: Manage your workspace
- **Settings**: Update your profile

## 🔧 Common Issues & Fixes

### Issue: Port already in use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
echo "PORT=3001" >> .env
```

### Issue: Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
echo $DATABASE_URL

# Restart PostgreSQL
sudo service postgresql restart
```

### Issue: Redis connection failed
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Restart Redis
sudo service redis restart
```

### Issue: AI not responding
```bash
# Check AI API key in .env
echo $OPENAI_API_KEY

# Check AI engine logs
docker-compose logs ai-engine
# or
cd ai-engine && npm run dev
```

## 📚 Next Steps

### Learn More
- Read [Complete Documentation](docs/README.md)
- Check [API Documentation](docs/README.md#api-endpoints)
- Review [Database Schema](database/schema.sql)

### Deploy to Production
- Follow [Deployment Guide](docs/DEPLOYMENT.md)
- Setup CI/CD with GitHub Actions
- Configure monitoring and alerts

### Customize
- Add new AI models
- Create custom agents
- Build new tools
- Design workflows

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev              # Start all services
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only
npm run dev:ai           # Start AI engine only

# Build
npm run build            # Build all services
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
docker-compose ps        # Check status

# Testing
npm test                 # Run all tests
npm run lint             # Lint code
npm run format           # Format code
```

## 💡 Pro Tips

1. **Use Docker for development** - It's faster and more reliable
2. **Keep .env secure** - Never commit it to git
3. **Check logs often** - `docker-compose logs -f`
4. **Use the health endpoints** - Monitor service status
5. **Read the docs** - Everything is documented in `/docs`

## 🆘 Need Help?

- **Documentation**: Check `/docs` folder
- **Issues**: Open a GitHub issue
- **Examples**: See code comments
- **Community**: Join discussions

## 🎉 You're Ready!

You now have a fully functional, production-ready AI SaaS platform running locally!

**What you can do:**
✅ Create user accounts
✅ Chat with AI (GPT-4, Claude, Gemini)
✅ Manage workspaces
✅ Track usage
✅ Build workflows
✅ Deploy to production

**Happy building! 🚀**

---

**Time to first chat: < 15 minutes**
**Time to production: < 1 hour**
