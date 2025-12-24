-- ============================================================================
-- BHINDI SAAS CLONE - COMPLETE SQL QUERIES REFERENCE
-- ============================================================================
-- Version: 1.0.0
-- Database: PostgreSQL 15+
-- Purpose: Production-ready SQL queries for all operations
-- ============================================================================

-- ============================================================================
-- TABLE OF CONTENTS
-- ============================================================================
-- 1. USER MANAGEMENT QUERIES
-- 2. WORKSPACE MANAGEMENT QUERIES
-- 3. CONVERSATION & MESSAGE QUERIES
-- 4. AGENT & TOOL QUERIES
-- 5. WORKFLOW QUERIES
-- 6. SUBSCRIPTION & BILLING QUERIES
-- 7. ANALYTICS & REPORTING QUERIES
-- 8. AUDIT & SECURITY QUERIES
-- 9. MAINTENANCE & OPTIMIZATION QUERIES
-- 10. BACKUP & RESTORE QUERIES
-- ============================================================================


-- ============================================================================
-- 1. USER MANAGEMENT QUERIES
-- ============================================================================

-- 1.1 Create New User
-- Purpose: Register a new user with hashed password
-- Usage: Called during user registration
INSERT INTO users (email, password_hash, full_name, timezone, locale, status)
VALUES ($1, $2, $3, $4, $5, 'active')
RETURNING id, email, full_name, created_at;

-- 1.2 Find User by Email
-- Purpose: Authenticate user during login
-- Usage: Called during login process
SELECT 
    u.id,
    u.email,
    u.password_hash,
    u.full_name,
    u.status,
    u.email_verified,
    u.last_login_at,
    wm.workspace_id,
    wm.role
FROM users u
LEFT JOIN workspace_members wm ON u.id = wm.user_id
WHERE u.email = $1 
  AND u.deleted_at IS NULL
LIMIT 1;

-- 1.3 Update User Profile
-- Purpose: Update user information
-- Usage: Called from settings page
UPDATE users
SET 
    full_name = COALESCE($1, full_name),
    timezone = COALESCE($2, timezone),
    locale = COALESCE($3, locale),
    avatar_url = COALESCE($4, avatar_url),
    updated_at = NOW()
WHERE id = $5
RETURNING id, email, full_name, timezone, locale, avatar_url;

-- 1.4 Update Last Login
-- Purpose: Track user login activity
-- Usage: Called after successful login
UPDATE users
SET last_login_at = NOW()
WHERE id = $1;

-- 1.5 Soft Delete User
-- Purpose: Deactivate user account (GDPR compliant)
-- Usage: Called when user deletes account
UPDATE users
SET 
    deleted_at = NOW(),
    status = 'deleted',
    email = CONCAT(email, '_deleted_', id)
WHERE id = $1;

-- 1.6 Get User Statistics
-- Purpose: Get user activity statistics
-- Usage: Dashboard analytics
SELECT 
    u.id,
    u.full_name,
    u.email,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT ae.id) as total_agent_executions,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id AND c.archived_at IS NULL
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN agent_executions ae ON u.id = ae.user_id
WHERE u.id = $1
GROUP BY u.id;

-- 1.7 Search Users
-- Purpose: Admin search functionality
-- Usage: Admin panel user search
SELECT 
    id,
    email,
    full_name,
    status,
    created_at,
    last_login_at
FROM users
WHERE 
    deleted_at IS NULL
    AND (
        email ILIKE '%' || $1 || '%'
        OR full_name ILIKE '%' || $1 || '%'
    )
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;


-- ============================================================================
-- 2. WORKSPACE MANAGEMENT QUERIES
-- ============================================================================

-- 2.1 Create Workspace
-- Purpose: Create new workspace for user
-- Usage: Called during user registration or workspace creation
INSERT INTO workspaces (name, slug, owner_id, plan_type, settings)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, slug, plan_type, created_at;

-- 2.2 Add User to Workspace
-- Purpose: Add member to workspace
-- Usage: Invite user to workspace
INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
VALUES ($1, $2, $3, $4)
ON CONFLICT (workspace_id, user_id) DO NOTHING
RETURNING id, workspace_id, user_id, role, joined_at;

-- 2.3 Get User's Workspaces
-- Purpose: List all workspaces user belongs to
-- Usage: Workspace switcher dropdown
SELECT 
    w.id,
    w.name,
    w.slug,
    w.plan_type,
    w.settings,
    w.created_at,
    wm.role,
    wm.joined_at,
    COUNT(DISTINCT wm2.user_id) as member_count
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN workspace_members wm2 ON w.id = wm2.workspace_id
WHERE wm.user_id = $1
GROUP BY w.id, wm.role, wm.joined_at
ORDER BY wm.joined_at DESC;

-- 2.4 Get Workspace Details
-- Purpose: Get complete workspace information
-- Usage: Workspace settings page
SELECT 
    w.id,
    w.name,
    w.slug,
    w.plan_type,
    w.settings,
    w.created_at,
    w.updated_at,
    u.id as owner_id,
    u.full_name as owner_name,
    u.email as owner_email,
    COUNT(DISTINCT wm.user_id) as member_count,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT wf.id) as workflow_count
FROM workspaces w
JOIN users u ON w.owner_id = u.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN conversations c ON w.id = c.workspace_id AND c.archived_at IS NULL
LEFT JOIN workflows wf ON w.id = wf.workspace_id AND wf.is_active = true
WHERE w.id = $1
GROUP BY w.id, u.id;

-- 2.5 Get Workspace Members
-- Purpose: List all members in workspace
-- Usage: Team management page
SELECT 
    wm.id,
    wm.role,
    wm.permissions,
    wm.joined_at,
    u.id as user_id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.last_login_at,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count
FROM workspace_members wm
JOIN users u ON wm.user_id = u.id
LEFT JOIN conversations c ON u.id = c.user_id AND c.workspace_id = $1
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE wm.workspace_id = $1
GROUP BY wm.id, u.id
ORDER BY wm.joined_at ASC;

-- 2.6 Update Workspace Settings
-- Purpose: Update workspace configuration
-- Usage: Workspace settings page
UPDATE workspaces
SET 
    name = COALESCE($1, name),
    settings = COALESCE($2, settings),
    updated_at = NOW()
WHERE id = $3
RETURNING id, name, settings, updated_at;

-- 2.7 Remove Member from Workspace
-- Purpose: Remove user from workspace
-- Usage: Team management
DELETE FROM workspace_members
WHERE workspace_id = $1 AND user_id = $2
RETURNING id;

-- 2.8 Update Member Role
-- Purpose: Change member's role in workspace
-- Usage: Team management
UPDATE workspace_members
SET 
    role = $1,
    permissions = COALESCE($2, permissions)
WHERE workspace_id = $3 AND user_id = $4
RETURNING id, role, permissions;


-- ============================================================================
-- 3. CONVERSATION & MESSAGE QUERIES
-- ============================================================================

-- 3.1 Create Conversation
-- Purpose: Start new chat conversation
-- Usage: New chat button
INSERT INTO conversations (workspace_id, user_id, title, context, metadata, status)
VALUES ($1, $2, $3, $4, $5, 'active')
RETURNING id, title, status, created_at;

-- 3.2 Get User's Conversations
-- Purpose: List all conversations for user
-- Usage: Conversation sidebar
SELECT 
    c.id,
    c.title,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    (
        SELECT content 
        FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as last_message_preview
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE 
    c.user_id = $1 
    AND c.workspace_id = $2
    AND c.archived_at IS NULL
GROUP BY c.id
ORDER BY c.updated_at DESC
LIMIT $3 OFFSET $4;

-- 3.3 Get Conversation with Messages
-- Purpose: Load conversation history
-- Usage: Open conversation
SELECT 
    c.id as conversation_id,
    c.title,
    c.context,
    c.metadata,
    c.status,
    c.created_at as conversation_created_at,
    json_agg(
        json_build_object(
            'id', m.id,
            'role', m.role,
            'content', m.content,
            'tokens_used', m.tokens_used,
            'model_used', m.model_used,
            'metadata', m.metadata,
            'created_at', m.created_at
        ) ORDER BY m.created_at ASC
    ) FILTER (WHERE m.id IS NOT NULL) as messages
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.id = $1 AND c.user_id = $2
GROUP BY c.id;

-- 3.4 Add Message to Conversation
-- Purpose: Save user or AI message
-- Usage: Send message
INSERT INTO messages (conversation_id, role, content, tokens_used, model_used, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, role, content, tokens_used, model_used, created_at;

-- 3.5 Update Conversation Title
-- Purpose: Rename conversation
-- Usage: Edit conversation title
UPDATE conversations
SET 
    title = $1,
    updated_at = NOW()
WHERE id = $2 AND user_id = $3
RETURNING id, title, updated_at;

-- 3.6 Archive Conversation
-- Purpose: Soft delete conversation
-- Usage: Delete conversation
UPDATE conversations
SET 
    archived_at = NOW(),
    status = 'archived'
WHERE id = $1 AND user_id = $2
RETURNING id;

-- 3.7 Get Conversation Statistics
-- Purpose: Analytics for conversation
-- Usage: Conversation insights
SELECT 
    c.id,
    c.title,
    COUNT(m.id) as total_messages,
    COUNT(m.id) FILTER (WHERE m.role = 'user') as user_messages,
    COUNT(m.id) FILTER (WHERE m.role = 'assistant') as ai_messages,
    SUM(m.tokens_used) as total_tokens,
    AVG(m.tokens_used) FILTER (WHERE m.role = 'assistant') as avg_tokens_per_response,
    MIN(m.created_at) as first_message_at,
    MAX(m.created_at) as last_message_at,
    EXTRACT(EPOCH FROM (MAX(m.created_at) - MIN(m.created_at))) as duration_seconds
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.id = $1
GROUP BY c.id;

-- 3.8 Search Messages
-- Purpose: Full-text search in messages
-- Usage: Search functionality
SELECT 
    m.id,
    m.conversation_id,
    m.role,
    m.content,
    m.created_at,
    c.title as conversation_title,
    ts_rank(
        to_tsvector('english', m.content),
        plainto_tsquery('english', $1)
    ) as relevance
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE 
    c.user_id = $2
    AND c.workspace_id = $3
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
ORDER BY relevance DESC, m.created_at DESC
LIMIT $4 OFFSET $5;

-- 3.9 Get Recent Conversations
-- Purpose: Quick access to recent chats
-- Usage: Dashboard recent activity
SELECT 
    c.id,
    c.title,
    c.updated_at,
    COUNT(m.id) as message_count,
    (
        SELECT content 
        FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as last_message
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE 
    c.user_id = $1 
    AND c.workspace_id = $2
    AND c.archived_at IS NULL
GROUP BY c.id
ORDER BY c.updated_at DESC
LIMIT 10;


-- ============================================================================
-- 4. AGENT & TOOL QUERIES
-- ============================================================================

-- 4.1 Get Available Agents
-- Purpose: List all agents user can access
-- Usage: Agent selection
SELECT 
    a.id,
    a.name,
    a.description,
    a.type,
    a.config,
    a.is_system,
    a.is_active,
    a.created_at,
    COUNT(ae.id) as execution_count,
    MAX(ae.created_at) as last_used_at
FROM agents a
LEFT JOIN agent_executions ae ON a.id = ae.agent_id AND ae.user_id = $2
WHERE 
    (a.is_system = true OR a.workspace_id = $1)
    AND a.is_active = true
GROUP BY a.id
ORDER BY a.is_system DESC, a.name ASC;

-- 4.2 Create Agent Execution
-- Purpose: Log agent execution
-- Usage: When agent is invoked
INSERT INTO agent_executions (
    agent_id, 
    conversation_id, 
    user_id, 
    input, 
    status
)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING id, agent_id, status, created_at;

-- 4.3 Update Agent Execution
-- Purpose: Update execution result
-- Usage: After agent completes
UPDATE agent_executions
SET 
    output = $1,
    status = $2,
    error_message = $3,
    execution_time_ms = $4,
    completed_at = NOW()
WHERE id = $5
RETURNING id, status, execution_time_ms, completed_at;

-- 4.4 Get Agent Execution History
-- Purpose: View agent usage history
-- Usage: Analytics dashboard
SELECT 
    ae.id,
    ae.status,
    ae.execution_time_ms,
    ae.created_at,
    ae.completed_at,
    a.name as agent_name,
    a.type as agent_type,
    c.title as conversation_title
FROM agent_executions ae
JOIN agents a ON ae.agent_id = a.id
LEFT JOIN conversations c ON ae.conversation_id = c.id
WHERE ae.user_id = $1
ORDER BY ae.created_at DESC
LIMIT $2 OFFSET $3;

-- 4.5 Get Available Tools
-- Purpose: List all available tools
-- Usage: Tool selection
SELECT 
    t.id,
    t.name,
    t.category,
    t.description,
    t.config,
    t.is_active,
    COUNT(te.id) as execution_count,
    MAX(te.created_at) as last_used_at
FROM tools t
LEFT JOIN tool_executions te ON t.id = te.tool_id AND te.user_id = $1
WHERE t.is_active = true
GROUP BY t.id
ORDER BY t.category, t.name;

-- 4.6 Create Tool Execution
-- Purpose: Log tool execution
-- Usage: When tool is invoked
INSERT INTO tool_executions (
    tool_id,
    agent_execution_id,
    user_id,
    input,
    status
)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING id, tool_id, status, created_at;

-- 4.7 Update Tool Execution
-- Purpose: Update execution result
-- Usage: After tool completes
UPDATE tool_executions
SET 
    output = $1,
    status = $2,
    error_message = $3,
    execution_time_ms = $4,
    completed_at = NOW()
WHERE id = $5
RETURNING id, status, execution_time_ms, completed_at;

-- 4.8 Get Tool Statistics
-- Purpose: Tool usage analytics
-- Usage: Analytics dashboard
SELECT 
    t.id,
    t.name,
    t.category,
    COUNT(te.id) as total_executions,
    COUNT(te.id) FILTER (WHERE te.status = 'completed') as successful_executions,
    COUNT(te.id) FILTER (WHERE te.status = 'failed') as failed_executions,
    AVG(te.execution_time_ms) FILTER (WHERE te.status = 'completed') as avg_execution_time,
    MAX(te.created_at) as last_used_at
FROM tools t
LEFT JOIN tool_executions te ON t.id = te.tool_id
WHERE te.user_id = $1
GROUP BY t.id
ORDER BY total_executions DESC;


-- ============================================================================
-- 5. WORKFLOW QUERIES
-- ============================================================================

-- 5.1 Create Workflow
-- Purpose: Create automation workflow
-- Usage: Workflow builder
INSERT INTO workflows (
    workspace_id,
    name,
    description,
    trigger_config,
    steps,
    created_by,
    is_active
)
VALUES ($1, $2, $3, $4, $5, $6, true)
RETURNING id, name, description, is_active, created_at;

-- 5.2 Get Workspace Workflows
-- Purpose: List all workflows in workspace
-- Usage: Workflow management page
SELECT 
    w.id,
    w.name,
    w.description,
    w.is_active,
    w.created_at,
    w.updated_at,
    u.full_name as created_by_name,
    COUNT(we.id) as execution_count,
    COUNT(we.id) FILTER (WHERE we.status = 'completed') as successful_count,
    MAX(we.started_at) as last_run_at
FROM workflows w
JOIN users u ON w.created_by = u.id
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
WHERE w.workspace_id = $1
GROUP BY w.id, u.full_name
ORDER BY w.created_at DESC;

-- 5.3 Get Workflow Details
-- Purpose: Get complete workflow configuration
-- Usage: Workflow editor
SELECT 
    w.id,
    w.name,
    w.description,
    w.trigger_config,
    w.steps,
    w.is_active,
    w.created_at,
    w.updated_at,
    u.id as created_by_id,
    u.full_name as created_by_name
FROM workflows w
JOIN users u ON w.created_by = u.id
WHERE w.id = $1 AND w.workspace_id = $2;

-- 5.4 Update Workflow
-- Purpose: Update workflow configuration
-- Usage: Workflow editor
UPDATE workflows
SET 
    name = COALESCE($1, name),
    description = COALESCE($2, description),
    trigger_config = COALESCE($3, trigger_config),
    steps = COALESCE($4, steps),
    is_active = COALESCE($5, is_active),
    updated_at = NOW()
WHERE id = $6 AND workspace_id = $7
RETURNING id, name, is_active, updated_at;

-- 5.5 Create Workflow Execution
-- Purpose: Log workflow execution
-- Usage: When workflow is triggered
INSERT INTO workflow_executions (
    workflow_id,
    status,
    input,
    started_at
)
VALUES ($1, 'running', $2, NOW())
RETURNING id, workflow_id, status, started_at;

-- 5.6 Update Workflow Execution
-- Purpose: Update execution result
-- Usage: After workflow completes
UPDATE workflow_executions
SET 
    status = $1,
    output = $2,
    error_message = $3,
    completed_at = NOW()
WHERE id = $4
RETURNING id, status, completed_at;

-- 5.7 Get Workflow Execution History
-- Purpose: View workflow run history
-- Usage: Workflow analytics
SELECT 
    we.id,
    we.status,
    we.started_at,
    we.completed_at,
    EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) as duration_seconds,
    w.name as workflow_name
FROM workflow_executions we
JOIN workflows w ON we.workflow_id = w.id
WHERE we.workflow_id = $1
ORDER BY we.started_at DESC
LIMIT $2 OFFSET $3;

-- 5.8 Get Workflow Statistics
-- Purpose: Workflow performance metrics
-- Usage: Analytics dashboard
SELECT 
    w.id,
    w.name,
    COUNT(we.id) as total_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'completed') as successful_executions,
    COUNT(we.id) FILTER (WHERE we.status = 'failed') as failed_executions,
    AVG(EXTRACT(EPOCH FROM (we.completed_at - we.started_at))) 
        FILTER (WHERE we.status = 'completed') as avg_duration_seconds,
    MAX(we.started_at) as last_run_at
FROM workflows w
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
WHERE w.workspace_id = $1
GROUP BY w.id
ORDER BY total_executions DESC;


-- ============================================================================
-- 6. SUBSCRIPTION & BILLING QUERIES
-- ============================================================================

-- 6.1 Create Subscription
-- Purpose: Create new subscription for workspace
-- Usage: Upgrade to paid plan
INSERT INTO subscriptions (
    workspace_id,
    stripe_subscription_id,
    stripe_customer_id,
    plan_name,
    status,
    current_period_start,
    current_period_end,
    metadata
)
VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)
RETURNING id, plan_name, status, current_period_end;

-- 6.2 Get Active Subscription
-- Purpose: Get workspace subscription details
-- Usage: Billing page
SELECT 
    s.id,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.plan_name,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.metadata,
    s.created_at,
    w.name as workspace_name
FROM subscriptions s
JOIN workspaces w ON s.workspace_id = w.id
WHERE s.workspace_id = $1
ORDER BY s.created_at DESC
LIMIT 1;

-- 6.3 Update Subscription
-- Purpose: Update subscription details
-- Usage: Plan change, cancellation
UPDATE subscriptions
SET 
    plan_name = COALESCE($1, plan_name),
    status = COALESCE($2, status),
    current_period_end = COALESCE($3, current_period_end),
    cancel_at_period_end = COALESCE($4, cancel_at_period_end),
    metadata = COALESCE($5, metadata),
    updated_at = NOW()
WHERE workspace_id = $6
RETURNING id, plan_name, status, cancel_at_period_end;

-- 6.4 Initialize Usage Quotas
-- Purpose: Set up usage limits for workspace
-- Usage: After subscription creation
INSERT INTO usage_quotas (workspace_id, resource_type, limit_value, current_usage, reset_period)
VALUES 
    ($1, 'ai_requests', $2, 0, 'monthly'),
    ($1, 'conversations', $3, 0, 'monthly'),
    ($1, 'storage_mb', $4, 0, 'monthly'),
    ($1, 'team_members', $5, 1, 'none')
ON CONFLICT (workspace_id, resource_type) 
DO UPDATE SET limit_value = EXCLUDED.limit_value
RETURNING id, resource_type, limit_value;

-- 6.5 Get Usage Quotas
-- Purpose: Check current usage against limits
-- Usage: Usage dashboard
SELECT 
    resource_type,
    limit_value,
    current_usage,
    reset_period,
    last_reset_at,
    CASE 
        WHEN limit_value > 0 THEN 
            ROUND((current_usage::numeric / limit_value::numeric) * 100, 2)
        ELSE 0 
    END as usage_percentage
FROM usage_quotas
WHERE workspace_id = $1
ORDER BY resource_type;

-- 6.6 Increment Usage
-- Purpose: Track resource usage
-- Usage: After each AI request, conversation creation, etc.
UPDATE usage_quotas
SET 
    current_usage = current_usage + $1,
    updated_at = NOW()
WHERE workspace_id = $2 AND resource_type = $3
RETURNING resource_type, current_usage, limit_value;

-- 6.7 Reset Monthly Quotas
-- Purpose: Reset usage counters at period end
-- Usage: Scheduled job (monthly)
UPDATE usage_quotas
SET 
    current_usage = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
WHERE 
    reset_period = 'monthly'
    AND last_reset_at < DATE_TRUNC('month', NOW())
RETURNING workspace_id, resource_type, limit_value;

-- 6.8 Check Quota Availability
-- Purpose: Verify if action is allowed
-- Usage: Before AI request, conversation creation
SELECT 
    resource_type,
    limit_value,
    current_usage,
    (limit_value - current_usage) as remaining,
    CASE 
        WHEN limit_value = -1 THEN true  -- Unlimited
        WHEN current_usage < limit_value THEN true
        ELSE false
    END as is_available
FROM usage_quotas
WHERE workspace_id = $1 AND resource_type = $2;


-- ============================================================================
-- 7. ANALYTICS & REPORTING QUERIES
-- ============================================================================

-- 7.1 Dashboard Overview Statistics
-- Purpose: Get key metrics for dashboard
-- Usage: Dashboard page
SELECT 
    (SELECT COUNT(*) FROM conversations WHERE user_id = $1 AND archived_at IS NULL) as total_conversations,
    (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = $1) as total_messages,
    (SELECT COUNT(*) FROM agent_executions WHERE user_id = $1) as total_agent_executions,
    (SELECT COUNT(*) FROM tool_executions WHERE user_id = $1) as total_tool_executions,
    (SELECT SUM(tokens_used) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = $1) as total_tokens_used,
    (SELECT COUNT(*) FROM conversations WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as conversations_last_7_days,
    (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = $1 AND m.created_at >= NOW() - INTERVAL '7 days') as messages_last_7_days;

-- 7.2 Daily Activity Report
-- Purpose: Get daily usage statistics
-- Usage: Analytics dashboard
SELECT 
    DATE(created_at) as date,
    COUNT(*) as message_count,
    SUM(tokens_used) as total_tokens,
    COUNT(DISTINCT conversation_id) as active_conversations
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE 
    c.user_id = $1
    AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 7.3 Model Usage Statistics
-- Purpose: Track which AI models are used most
-- Usage: Analytics dashboard
SELECT 
    model_used,
    COUNT(*) as usage_count,
    SUM(tokens_used) as total_tokens,
    AVG(tokens_used) as avg_tokens,
    MIN(created_at) as first_used,
    MAX(created_at) as last_used
FROM messages
WHERE 
    conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)
    AND model_used IS NOT NULL
    AND role = 'assistant'
GROUP BY model_used
ORDER BY usage_count DESC;

-- 7.4 Conversation Length Analysis
-- Purpose: Analyze conversation patterns
-- Usage: Analytics dashboard
SELECT 
    CASE 
        WHEN message_count <= 5 THEN '1-5 messages'
        WHEN message_count <= 10 THEN '6-10 messages'
        WHEN message_count <= 20 THEN '11-20 messages'
        WHEN message_count <= 50 THEN '21-50 messages'
        ELSE '50+ messages'
    END as conversation_length,
    COUNT(*) as conversation_count,
    AVG(total_tokens) as avg_tokens
FROM (
    SELECT 
        c.id,
        COUNT(m.id) as message_count,
        SUM(m.tokens_used) as total_tokens
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE c.user_id = $1 AND c.archived_at IS NULL
    GROUP BY c.id
) as conversation_stats
GROUP BY conversation_length
ORDER BY 
    CASE conversation_length
        WHEN '1-5 messages' THEN 1
        WHEN '6-10 messages' THEN 2
        WHEN '11-20 messages' THEN 3
        WHEN '21-50 messages' THEN 4
        ELSE 5
    END;

-- 7.5 Peak Usage Hours
-- Purpose: Identify when users are most active
-- Usage: Analytics dashboard
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as message_count,
    COUNT(DISTINCT conversation_id) as active_conversations
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE 
    c.user_id = $1
    AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- 7.6 Workspace Activity Report
-- Purpose: Get workspace-wide statistics
-- Usage: Admin dashboard
SELECT 
    w.id,
    w.name,
    w.plan_type,
    COUNT(DISTINCT wm.user_id) as member_count,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count,
    SUM(m.tokens_used) as total_tokens,
    COUNT(DISTINCT ae.id) as agent_execution_count,
    MAX(c.updated_at) as last_activity_at
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN conversations c ON w.id = c.workspace_id AND c.archived_at IS NULL
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN agent_executions ae ON c.user_id = ae.user_id
WHERE w.id = $1
GROUP BY w.id;

-- 7.7 Top Users by Activity
-- Purpose: Identify most active users in workspace
-- Usage: Admin analytics
SELECT 
    u.id,
    u.full_name,
    u.email,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count,
    SUM(m.tokens_used) as total_tokens,
    MAX(c.updated_at) as last_activity_at
FROM users u
JOIN workspace_members wm ON u.id = wm.user_id
LEFT JOIN conversations c ON u.id = c.user_id AND c.workspace_id = $1
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE wm.workspace_id = $1
GROUP BY u.id
ORDER BY message_count DESC
LIMIT 10;

-- 7.8 Error Rate Analysis
-- Purpose: Track system reliability
-- Usage: System monitoring
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'failed')::numeric / 
         NULLIF(COUNT(*), 0)::numeric) * 100, 
        2
    ) as error_rate_percentage
FROM agent_executions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;


-- ============================================================================
-- 8. AUDIT & SECURITY QUERIES
-- ============================================================================

-- 8.1 Create Audit Log Entry
-- Purpose: Log important actions for compliance
-- Usage: After any significant action
INSERT INTO audit_logs (
    workspace_id,
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, action, created_at;

-- 8.2 Get User Audit Trail
-- Purpose: View user's action history
-- Usage: Security audit
SELECT 
    al.id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.metadata,
    al.ip_address,
    al.created_at,
    u.full_name as user_name,
    u.email as user_email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.user_id = $1
ORDER BY al.created_at DESC
LIMIT $2 OFFSET $3;

-- 8.3 Get Workspace Audit Trail
-- Purpose: View all workspace actions
-- Usage: Admin security audit
SELECT 
    al.id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.metadata,
    al.ip_address,
    al.created_at,
    u.full_name as user_name,
    u.email as user_email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.workspace_id = $1
ORDER BY al.created_at DESC
LIMIT $2 OFFSET $3;

-- 8.4 Search Audit Logs
-- Purpose: Find specific actions
-- Usage: Security investigation
SELECT 
    al.id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.metadata,
    al.ip_address,
    al.created_at,
    u.full_name as user_name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE 
    al.workspace_id = $1
    AND (
        al.action ILIKE '%' || $2 || '%'
        OR al.resource_type ILIKE '%' || $2 || '%'
        OR u.email ILIKE '%' || $2 || '%'
    )
    AND al.created_at >= $3
    AND al.created_at <= $4
ORDER BY al.created_at DESC
LIMIT $5 OFFSET $6;

-- 8.5 Create API Key
-- Purpose: Generate API key for programmatic access
-- Usage: API key management
INSERT INTO api_keys (
    workspace_id,
    user_id,
    name,
    key_hash,
    key_prefix,
    permissions,
    expires_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, key_prefix, created_at, expires_at;

-- 8.6 Get Active API Keys
-- Purpose: List all active API keys
-- Usage: API key management page
SELECT 
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.permissions,
    ak.last_used_at,
    ak.expires_at,
    ak.created_at,
    u.full_name as created_by_name
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
WHERE 
    ak.workspace_id = $1
    AND ak.revoked_at IS NULL
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
ORDER BY ak.created_at DESC;

-- 8.7 Revoke API Key
-- Purpose: Disable API key
-- Usage: Security or key rotation
UPDATE api_keys
SET revoked_at = NOW()
WHERE id = $1 AND workspace_id = $2
RETURNING id, name, revoked_at;

-- 8.8 Update API Key Last Used
-- Purpose: Track API key usage
-- Usage: On each API request
UPDATE api_keys
SET last_used_at = NOW()
WHERE key_hash = $1 AND revoked_at IS NULL
RETURNING id, workspace_id, user_id, permissions;

-- 8.9 Detect Suspicious Activity
-- Purpose: Identify potential security issues
-- Usage: Security monitoring
SELECT 
    user_id,
    ip_address,
    COUNT(*) as action_count,
    COUNT(DISTINCT action) as unique_actions,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM audit_logs
WHERE 
    created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, ip_address
HAVING COUNT(*) > 100  -- More than 100 actions per hour
ORDER BY action_count DESC;


-- ============================================================================
-- 9. MAINTENANCE & OPTIMIZATION QUERIES
-- ============================================================================

-- 9.1 Clean Up Old Archived Conversations
-- Purpose: Remove old archived data
-- Usage: Scheduled maintenance job
DELETE FROM conversations
WHERE 
    archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '90 days'
RETURNING id;

-- 9.2 Clean Up Old Audit Logs
-- Purpose: Remove old audit logs (keep 1 year)
-- Usage: Scheduled maintenance job
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year'
RETURNING id;

-- 9.3 Vacuum and Analyze Tables
-- Purpose: Optimize database performance
-- Usage: Scheduled maintenance
VACUUM ANALYZE users;
VACUUM ANALYZE conversations;
VACUUM ANALYZE messages;
VACUUM ANALYZE agent_executions;
VACUUM ANALYZE tool_executions;
VACUUM ANALYZE audit_logs;

-- 9.4 Reindex Tables
-- Purpose: Rebuild indexes for better performance
-- Usage: Monthly maintenance
REINDEX TABLE users;
REINDEX TABLE conversations;
REINDEX TABLE messages;
REINDEX TABLE agent_executions;

-- 9.5 Get Table Sizes
-- Purpose: Monitor database growth
-- Usage: Database monitoring
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 9.6 Get Index Usage Statistics
-- Purpose: Identify unused indexes
-- Usage: Performance optimization
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- 9.7 Get Slow Queries
-- Purpose: Identify performance bottlenecks
-- Usage: Performance monitoring
-- Note: Requires pg_stat_statements extension
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 20;

-- 9.8 Get Active Connections
-- Purpose: Monitor database connections
-- Usage: Connection pool monitoring
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start DESC;

-- 9.9 Get Lock Information
-- Purpose: Identify blocking queries
-- Usage: Troubleshooting performance issues
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;


-- ============================================================================
-- 10. BACKUP & RESTORE QUERIES
-- ============================================================================

-- 10.1 Export User Data (GDPR Compliance)
-- Purpose: Export all user data for download
-- Usage: GDPR data export request
SELECT json_build_object(
    'user', (
        SELECT row_to_json(u)
        FROM (
            SELECT id, email, full_name, timezone, locale, created_at
            FROM users WHERE id = $1
        ) u
    ),
    'conversations', (
        SELECT json_agg(row_to_json(c))
        FROM (
            SELECT id, title, created_at, updated_at
            FROM conversations 
            WHERE user_id = $1 AND archived_at IS NULL
        ) c
    ),
    'messages', (
        SELECT json_agg(row_to_json(m))
        FROM (
            SELECT m.id, m.role, m.content, m.created_at, c.title as conversation_title
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.user_id = $1
            ORDER BY m.created_at DESC
        ) m
    ),
    'agent_executions', (
        SELECT json_agg(row_to_json(ae))
        FROM (
            SELECT ae.id, a.name as agent_name, ae.status, ae.created_at
            FROM agent_executions ae
            JOIN agents a ON ae.agent_id = a.id
            WHERE ae.user_id = $1
            ORDER BY ae.created_at DESC
        ) ae
    )
) as user_data;

-- 10.2 Backup Workspace Data
-- Purpose: Create complete workspace backup
-- Usage: Workspace export/migration
SELECT json_build_object(
    'workspace', (
        SELECT row_to_json(w)
        FROM (
            SELECT id, name, slug, plan_type, settings, created_at
            FROM workspaces WHERE id = $1
        ) w
    ),
    'members', (
        SELECT json_agg(row_to_json(m))
        FROM (
            SELECT u.email, wm.role, wm.joined_at
            FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = $1
        ) m
    ),
    'workflows', (
        SELECT json_agg(row_to_json(wf))
        FROM (
            SELECT name, description, trigger_config, steps, is_active
            FROM workflows
            WHERE workspace_id = $1
        ) wf
    )
) as workspace_backup;

-- 10.3 Get Database Statistics
-- Purpose: Monitor database health
-- Usage: System monitoring dashboard
SELECT 
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
    (SELECT COUNT(*) FROM workspaces) as total_workspaces,
    (SELECT COUNT(*) FROM conversations WHERE archived_at IS NULL) as active_conversations,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM agent_executions) as total_agent_executions,
    (SELECT COUNT(*) FROM tool_executions) as total_tool_executions,
    (SELECT COUNT(*) FROM workflows WHERE is_active = true) as active_workflows,
    (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size;


-- ============================================================================
-- PERFORMANCE OPTIMIZATION TIPS
-- ============================================================================

-- 1. Always use LIMIT and OFFSET for pagination
-- 2. Use indexes on frequently queried columns (already created in schema.sql)
-- 3. Use EXPLAIN ANALYZE to understand query performance
-- 4. Avoid SELECT * in production queries
-- 5. Use connection pooling (configured in backend)
-- 6. Cache frequently accessed data in Redis
-- 7. Use prepared statements to prevent SQL injection
-- 8. Regular VACUUM and ANALYZE for optimal performance
-- 9. Monitor slow queries with pg_stat_statements
-- 10. Use partial indexes for filtered queries

-- ============================================================================
-- SECURITY BEST PRACTICES
-- ============================================================================

-- 1. Always use parameterized queries ($1, $2, etc.)
-- 2. Never concatenate user input into SQL strings
-- 3. Use row-level security for multi-tenant isolation
-- 4. Regularly audit access logs
-- 5. Rotate API keys periodically
-- 6. Use SSL/TLS for database connections
-- 7. Implement rate limiting at application level
-- 8. Hash sensitive data (passwords already hashed with bcrypt)
-- 9. Regular security audits of audit_logs table
-- 10. Keep PostgreSQL updated with security patches

-- ============================================================================
-- END OF SQL QUERIES REFERENCE
-- ============================================================================
