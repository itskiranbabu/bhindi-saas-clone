# Deployment Guide - Bhindi SaaS Clone

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Domain name configured
- [ ] SSL certificates obtained
- [ ] Cloud provider account setup (AWS/GCP/Azure)
- [ ] Database instance provisioned
- [ ] Redis instance provisioned
- [ ] S3 bucket created (for file uploads)
- [ ] Email service configured (SendGrid/AWS SES)
- [ ] Payment gateway setup (Stripe)
- [ ] Monitoring tools configured (Sentry, etc.)

### Secrets & Environment Variables
- [ ] All API keys secured
- [ ] Database credentials secured
- [ ] JWT secret generated (strong random string)
- [ ] OAuth credentials configured
- [ ] Stripe keys configured
- [ ] AWS credentials configured

## 🚀 Deployment Options

### Option 1: Docker Compose (Simple)

**Best for:** Small teams, staging environments

```bash
# 1. Clone repository
git clone https://github.com/itskiranbabu/bhindi-saas-clone.git
cd bhindi-saas-clone

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Build and start
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose exec backend npm run db:migrate

# 5. Verify deployment
curl http://localhost:8000/health
```

### Option 2: Kubernetes (Scalable)

**Best for:** Production, high-traffic applications

```bash
# 1. Setup kubectl and connect to cluster
kubectl config use-context production

# 2. Create namespace
kubectl create namespace bhindi-saas

# 3. Create secrets
kubectl create secret generic bhindi-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=redis-url=$REDIS_URL \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=openai-key=$OPENAI_API_KEY \
  -n bhindi-saas

# 4. Deploy services
kubectl apply -f infrastructure/kubernetes/ -n bhindi-saas

# 5. Verify deployment
kubectl get pods -n bhindi-saas
kubectl get services -n bhindi-saas

# 6. Get external IP
kubectl get service frontend -n bhindi-saas
```

### Option 3: Cloud Platform (Managed)

#### AWS Deployment

**Services Used:**
- ECS/EKS for containers
- RDS for PostgreSQL
- ElastiCache for Redis
- S3 for storage
- CloudFront for CDN
- Route53 for DNS
- ALB for load balancing

```bash
# 1. Install AWS CLI
aws configure

# 2. Create ECR repositories
aws ecr create-repository --repository-name bhindi-frontend
aws ecr create-repository --repository-name bhindi-backend
aws ecr create-repository --repository-name bhindi-ai-engine

# 3. Build and push images
./scripts/deploy-aws.sh

# 4. Deploy with CloudFormation/Terraform
cd infrastructure/aws
terraform init
terraform plan
terraform apply
```

#### GCP Deployment

**Services Used:**
- Cloud Run for containers
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Storage for files
- Cloud CDN
- Cloud Load Balancing

```bash
# 1. Install gcloud CLI
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/bhindi-frontend ./frontend
gcloud builds submit --tag gcr.io/PROJECT_ID/bhindi-backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/bhindi-ai-engine ./ai-engine

# 3. Deploy to Cloud Run
gcloud run deploy bhindi-frontend \
  --image gcr.io/PROJECT_ID/bhindi-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

gcloud run deploy bhindi-backend \
  --image gcr.io/PROJECT_ID/bhindi-backend \
  --platform managed \
  --region us-central1

gcloud run deploy bhindi-ai-engine \
  --image gcr.io/PROJECT_ID/bhindi-ai-engine \
  --platform managed \
  --region us-central1
```

## 🔧 Production Configuration

### Database Setup

```bash
# 1. Create production database
createdb bhindi_saas_production

# 2. Run migrations
DATABASE_URL=postgresql://user:pass@host:5432/bhindi_saas_production \
  npm run db:migrate

# 3. Setup read replicas (optional)
# Configure in your cloud provider

# 4. Setup automated backups
# Configure in your cloud provider
```

### Redis Configuration

```bash
# Production Redis config
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/bhindi-saas
upstream backend {
    server backend:8000;
}

upstream ai_engine {
    server ai-engine:8001;
}

server {
    listen 80;
    server_name bhindi-saas.com www.bhindi-saas.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bhindi-saas.com www.bhindi-saas.com;

    ssl_certificate /etc/letsencrypt/live/bhindi-saas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bhindi-saas.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/bhindi-saas/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # AI Engine
    location /ai {
        proxy_pass http://ai_engine;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring & Observability

### Health Checks

```bash
# Backend health
curl https://api.bhindi-saas.com/health

# AI Engine health
curl https://api.bhindi-saas.com/ai/health

# Database connection
psql $DATABASE_URL -c "SELECT 1"

# Redis connection
redis-cli -u $REDIS_URL ping
```

### Logging

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f ai-engine

# Kubernetes logs
kubectl logs -f deployment/backend -n bhindi-saas
kubectl logs -f deployment/ai-engine -n bhindi-saas
```

### Metrics

Setup monitoring with:
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Sentry** for error tracking
- **DataDog/New Relic** for APM

## 🔄 Continuous Deployment

### GitHub Actions

The CI/CD pipeline automatically:
1. Runs tests on every PR
2. Builds Docker images on merge to main
3. Deploys to staging on merge to develop
4. Deploys to production on merge to main

### Manual Deployment

```bash
# 1. Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 2. Build images
docker-compose -f docker-compose.prod.yml build

# 3. Push to registry
docker-compose -f docker-compose.prod.yml push

# 4. Deploy
kubectl set image deployment/backend \
  backend=ghcr.io/itskiranbabu/bhindi-saas-clone/backend:v1.0.0 \
  -n bhindi-saas

kubectl set image deployment/ai-engine \
  ai-engine=ghcr.io/itskiranbabu/bhindi-saas-clone/ai-engine:v1.0.0 \
  -n bhindi-saas

kubectl set image deployment/frontend \
  frontend=ghcr.io/itskiranbabu/bhindi-saas-clone/frontend:v1.0.0 \
  -n bhindi-saas
```

## 🔐 Security Hardening

### SSL/TLS

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d bhindi-saas.com -d www.bhindi-saas.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Firewall Rules

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### Database Security

```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE bhindi_saas TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

## 🚨 Disaster Recovery

### Backup Strategy

```bash
# Database backup (daily)
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://bhindi-backups/

# Redis backup
redis-cli -u $REDIS_URL --rdb /backup/dump.rdb
```

### Restore Procedure

```bash
# Restore database
gunzip < backup-20240101.sql.gz | psql $DATABASE_URL

# Restore Redis
redis-cli -u $REDIS_URL --rdb /backup/dump.rdb
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n bhindi-saas

# Scale AI engine
kubectl scale deployment ai-engine --replicas=3 -n bhindi-saas

# Auto-scaling
kubectl autoscale deployment backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n bhindi-saas
```

### Database Scaling

- Setup read replicas
- Implement connection pooling
- Use caching aggressively
- Consider sharding for very large datasets

## 🎯 Performance Optimization

### CDN Setup

- Use CloudFront/CloudFlare for static assets
- Enable gzip compression
- Set proper cache headers
- Optimize images

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 'xxx';

-- Vacuum regularly
VACUUM ANALYZE;
```

### Caching Strategy

- Cache user sessions in Redis
- Cache frequently accessed data
- Implement CDN caching
- Use browser caching

## ✅ Post-Deployment Verification

```bash
# 1. Check all services are running
kubectl get pods -n bhindi-saas

# 2. Test authentication
curl -X POST https://api.bhindi-saas.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 3. Test chat functionality
# (Use frontend or API client)

# 4. Check logs for errors
kubectl logs -f deployment/backend -n bhindi-saas | grep ERROR

# 5. Monitor metrics
# Check Grafana dashboards

# 6. Run smoke tests
npm run test:smoke
```

## 📞 Support & Troubleshooting

### Common Issues

**Issue: Database connection timeout**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool settings
# Increase max connections if needed
```

**Issue: High memory usage**
```bash
# Check memory usage
kubectl top pods -n bhindi-saas

# Increase resource limits
kubectl set resources deployment backend \
  --limits=memory=2Gi \
  -n bhindi-saas
```

**Issue: Slow API responses**
```bash
# Check database query performance
# Add indexes
# Implement caching
# Scale horizontally
```

## 🎉 Success!

Your Bhindi SaaS Clone is now deployed and running in production!

Monitor your application closely for the first few days and be ready to scale resources as needed.
