# Copilot Instructions for TravelKit

## Project Overview
TravelKit is a travel platform that converts traveler interest into group bookings through social proof and dynamic pricing.

**Core Flow:**
1. Travelers express interest for destinations/dates
2. Surface social proof and calendar availability to increase conversions
3. Automatically cluster similar interests into groups
4. Compute group pricing offers
5. Surface analytics to admins and send targeted social-proof messages on homepage and to users

## Architecture Components

### Frontend — Traveler UI
Modern website with destination discovery and interest expression:
- Destination list/detail pages with social proof widgets
- Interest submission form (date range/exact date, #people, contact)
- Interest-based calendar view (heatmap showing interest counts)
- Homepage messaging area for social proof banners and CTAs
- Destination detail pages showing "X people interested" and upcoming grouped trips

### Frontend — Admin UI
Administrative interface for content and analytics:
- CMS to create/edit destinations, itineraries, galleries
- Analytics dashboard (interest trends, conversion funnels, group matches)
- Manual override for group pricing, confirm groups, notify travelers

### Backend API (FastAPI)
Core REST API handling:
- CRUD for destinations, content, images, videos
- Interest creation/reading endpoints (travel requests)
- Calendar data and social proof summary endpoints
- Admin analytics and group/promo management endpoints
- JWT auth for admin users

### Async/Worker Layer (Celery)
Background processing for:
- Periodic interest clustering job
- Notification job (email/WhatsApp) + follow-ups
- Group offer generator + pricing recalculation
- Cache warmers and summary counters

### Data Storage
- **PostgreSQL**: Primary datastore for destinations, interests, users
- **Redis**: Counters, short-term caching, distributed locking
- **Object Storage**: AWS S3 or MinIO for images/videos

### ML/Clustering Service (Optional)
Microservice for interest clustering:
- Takes interest records, returns groupings
- Start with Python sklearn or custom heuristics

### Third-party Integrations
- **Email**: SendGrid/Mailgun for notifications
- **WhatsApp**: Twilio or Meta Business API for messaging
- **Payments**: Stripe/Razorpay for group booking deposits
- **Analytics**: DataDog/Metabase/direct Postgres queries

## Core Feature Flows

### 1. Social Proof Interest Display (Traveler-Facing)
When interest is posted (`POST /api/interests`):
- Persist to PostgreSQL
- Increment Redis counters: `INCR interest_count:destination:{id}:YYYY-MM-DD`
- Emit event to analytics queue
- Store recent-interests list in Redis LRU for "recent people" slider

`GET /api/destinations` includes `interest_summary` with:
- `total_interested_last_30_days`, `next_30_day_count`
- `recent_names_sample` (e.g., "Anita and 3 others are interested")

### 2. Interest-Based Date Calendar
`GET /api/destinations/{id}/calendar?month=2025-10` returns `{date: count, ...}`
- Backend computes from Redis (fast), falls back to SQL if cache miss
- Frontend shows heatmap with tooltips; clicking pre-fills interest modal

### 3. Interest Clustering (Group Matching)
Batch job (daily/hourly):
- Query open interests for destination within sliding window (±7 days)
- **Stage 0**: Rule-based clustering by overlapping dates, similar group size
- **Stage 1**: Optional ML clustering (KMeans/Agglomerative) on date, num_people, lead_time
- Create `groups` record with `proposed_price_per_person` for qualifying clusters
- Notify matched members, mark `interests.status = 'matched'`

### 4. Group Pricing Rules
```
price_per_person = base_price * (1 - discount_for_size)
discount_for_size = min(max_discount, k * (members_count - 1))
```
Example: base_price=₹40,000, k=0.03 (3% per member), max_discount=0.25 (25%)

Store calculation rationale in `groups.price_calc` JSON for audit.

### 5. Social-Proof Homepage Messaging
Generate scheduled summaries with signal metrics:
- `trending_score` (7-day interest growth)
- `shortage_score` (high interest on close dates)
- Messages: "10 people interested in Goa Oct 12–15 — join for group pricing!"
- Store in `homepage_messages` table, serve via `GET /api/socialproof/home`

### 6. Admin Analytics Dashboard
Pre-computed daily aggregates in `analytics_materialized`:
- Interest trends per destination/month
- Conversion funnel (interest → matched → converted)
- Cluster success rates and revenue potential

## Implementation Patterns

### Caching Strategy
- **Redis counters**: Fast calendar queries (`interest_count:destination:{id}:date`)
- **Calendar fallback**: SQL `SELECT count(*) FROM interests WHERE date_from <= date <= date_to`
- **LRU lists**: Recent interest samples for social proof

### Event-Driven Architecture
- Use Redis streams/Kafka for analytics events
- Decouple frontend response from heavy background processing
- Emit events on interest creation for counter updates

### Data Integrity
- **Idempotency**: Client-generated UUIDs for interest submissions
- **Audit trails**: Store original pricing calculations and cluster inputs
- **Privacy**: Show only first names in social proof displays

### ML/Clustering Evolution
1. **Day 0**: Rule-based date overlap grouping
2. **Week 2**: sklearn agglomerative clustering on [date_center, num_people, lead_time]
3. **Month 2**: Supervised model predicting group conversion success

## Recommended Technology Stack

**✅ Latest Dependencies (Updated September 2025)**
This project uses the latest stable versions of all dependencies with no deprecated packages. All dependencies are regularly updated to ensure security, performance, and modern development practices.

### Frontend (Traveler UI)
- **React** with **Next.js** - SEO-friendly destination pages and server-side rendering
- **TypeScript** - Type safety for complex data flows
- **Tailwind CSS** - Rapid UI development with consistent design
- **React Query/TanStack Query** - Efficient data fetching and caching
- **Chart.js** or **Recharts** - Calendar heatmaps and interest visualizations

### Frontend (Admin UI)
- **React Admin** or **Refine** - Quick admin dashboard with CRUD operations
- **Material-UI** or **Ant Design** - Professional admin interface components

### Backend API
- **Python FastAPI 0.115.0** - Latest high performance, automatic API docs, async support
- **Pydantic 2.9.2** - Latest data validation and serialization with modern patterns
- **Pydantic Settings 2.6.0** - Modern configuration management (replaces deprecated BaseSettings)
- **SQLAlchemy 2.0.35** - Latest ORM for PostgreSQL interactions with modern async support
- **Alembic 1.13.3** - Latest database migrations
- **Uvicorn 0.30.6** - Latest ASGI server for production deployment
- **JWT** - Token-based authentication

### Background Processing
- **Celery 5.4.0** - Latest reliable task queue for clustering jobs
- **Redis 5.1.1** - Latest version for broker and caching
- **Celery Beat** - Scheduled tasks for periodic clustering and analytics

### Databases & Caching
- **PostgreSQL 15** - Latest primary database with JSON support for flexible schemas
- **Redis 7 Alpine** - Latest caching, counters, and message broker
- **AWS S3** or **MinIO** - Object storage for images/videos

### ML/Analytics
- **scikit-learn 1.5.2** - Latest clustering algorithms (KMeans, Agglomerative)
- **pandas 2.2.3** - Latest data processing for analytics
- **NumPy 2.1.2** - Latest numerical computations

### Third-Party Services
- **SendGrid 6.11.0** - Latest email notifications with good deliverability
- **Twilio 9.3.6** - Latest WhatsApp messaging and SMS APIs
- **Stripe** - Payment processing (international support)
- **Cloudinary** - Image optimization and CDN

### Infrastructure & Deployment
- **Docker** - Containerization for consistent deployments across environments
- **Docker Compose** - Local development environment orchestration
- **AWS ECS** or **Railway** - Container hosting for production
- **AWS RDS** - Managed PostgreSQL
- **AWS ElastiCache** - Managed Redis
- **Vercel** - Frontend deployment with global CDN

### Container Strategy
- **Multi-stage builds** - Optimize image sizes for production
- **Service isolation** - Separate containers for API, workers, frontend
- **Development setup** - Docker Compose with hot reloading for local dev
- **Production deployment** - Container orchestration with health checks

### Monitoring & Analytics
- **Sentry** - Error tracking
- **DataDog** or **New Relic** - Application performance monitoring
- **Google Analytics** - User behavior tracking

## Docker Architecture

### Container Services
- **travelkit-api** - FastAPI backend with Gunicorn/Uvicorn
- **travelkit-worker** - Celery workers for background tasks
- **travelkit-scheduler** - Celery Beat for scheduled jobs
- **travelkit-frontend** - Next.js application (if not using Vercel)
- **postgres** - PostgreSQL database
- **redis** - Redis for caching and message broker
- **nginx** - Reverse proxy and static file serving

### Development Environment
Use `docker-compose.yml` for local development:
- Hot reloading for API and frontend
- Volume mounts for source code
- Environment variable configuration
- Database initialization scripts

### Production Deployment
- Multi-stage Dockerfiles for optimized images
- Health checks for container orchestration
- Secrets management for environment variables
- Container registries (AWS ECR, Docker Hub)

## SEO & Analytics Features

### SEO-Friendly Implementation

#### Meta Tags & Social Sharing
- **Dynamic meta tags**: Implement per-page meta titles, descriptions using `next-seo`
- **OpenGraph & Twitter Cards**: Social media preview optimization for destination sharing
- **Structured data**: JSON-LD schema markup for travel/destination pages
- **Canonical URLs**: Prevent duplicate content issues

#### Technical SEO
- **Clean URLs**: `/destinations/goa-beaches` format with slug-based routing
- **XML Sitemap**: Auto-generated with `next-sitemap` for all destinations
- **Server-side rendering**: Next.js SSR for search engine indexing
- **Image optimization**: Next.js Image component with proper alt text

#### Performance & Core Web Vitals
- **Code splitting**: Dynamic imports for non-critical components
- **Bundle optimization**: Tree shaking and minification
- **CDN integration**: Static asset delivery optimization
- **Caching strategies**: API response caching with Redis

### Analytics Implementation

#### User Behavior Tracking
```typescript
// Event tracking structure
interface AnalyticsEvent {
  event: 'interest_submitted' | 'destination_viewed' | 'social_proof_clicked'
  properties: {
    destination_id: string
    user_id?: string
    timestamp: Date
    metadata?: Record<string, any>
  }
}
```

#### Conversion Funnel Analytics
1. **Interest Expression** → Track form submissions and abandonment
2. **Group Matching** → Monitor cluster formation success rates
3. **Booking Conversion** → Measure final conversion from interest to booking

#### Business Intelligence Dashboard
- **Real-time metrics**: Interest trends, geographic distribution
- **Seasonal analysis**: Demand patterns by destination and time
- **Social proof effectiveness**: A/B testing of messaging impact
- **Group formation analytics**: Success rates and optimization opportunities

### Implementation Files Structure
```
src/
├── lib/
│   ├── seo.ts              # SEO utilities and meta generators
│   ├── analytics.ts        # Event tracking utilities
│   └── schema.ts           # Structured data generators
├── components/
│   ├── SEO/
│   │   ├── MetaTags.tsx    # Reusable meta component
│   │   └── StructuredData.tsx
│   └── Analytics/
│       └── EventTracker.tsx
├── hooks/
│   ├── useAnalytics.ts     # Analytics event hook
│   └── useSEO.ts          # SEO data hook
└── pages/
    ├── sitemap.xml.ts      # Dynamic sitemap
    └── robots.txt.ts       # Robots configuration
```

### Third-Party Integration Guidelines
- **Google Analytics 4**: Core web analytics with custom events
- **Mixpanel/Amplitude**: User behavior and conversion tracking
- **Hotjar**: Heatmaps and session recordings for UX optimization
- **Internal analytics**: PostgreSQL-based custom dashboard

## Dependency Management

### Python Backend Dependencies
All Python packages are pinned to specific latest versions in `backend/requirements.txt`:
```
fastapi==0.115.0          # Latest API framework
pydantic==2.9.2           # Latest data validation
pydantic-settings==2.6.0  # Modern configuration (replaces deprecated BaseSettings)
sqlalchemy==2.0.35        # Latest ORM with async support
alembic==1.13.3           # Latest database migrations
uvicorn==0.30.6           # Latest ASGI server
celery==5.4.0             # Latest task queue
redis==5.1.1              # Latest Redis client
```

### Frontend Dependencies
All Node.js packages use latest compatible versions in `frontend/package.json`:
- Dependencies are regularly audited with `npm audit`
- ESLint configuration uses latest compatible rules
- Package-lock.json is kept in sync for reproducible builds

### Docker Optimization
- `.dockerignore` files exclude `node_modules`, build artifacts, and cache directories
- Build context reduced from 337MB+ to ~2KB for efficient container builds
- Multi-stage builds optimize final image sizes

### Key Migration Notes
- **Pydantic v2**: Uses `pydantic-settings` package for configuration classes
- **SQLAlchemy**: Renamed `metadata` field to `meta_data` to avoid reserved word conflicts
- **ESLint**: Compatible versions maintained for Next.js integration

## AI Agent Guidance

## Copilot Suggest-Only Mode
**Important:** Copilot agents should operate in "suggest-only" mode for this project. Agents must provide suggestions and code samples, but should NOT make direct changes to files or the codebase.

- When responding to requests, always show the recommended code or command in markdown, but do not apply edits or run commands.
- If a user requests an edit, reply with the suggested patch or code and wait for explicit approval before making changes.
- Document all suggestions clearly, referencing relevant files and lines.

## AI Agent Guidance
- No existing conventions, build systems, or integration points are present yet.
- When initializing, follow standard best practices for the chosen language/framework.
- Document any new patterns, workflows, or dependencies in this file as the project evolves.

## Next Steps
- After adding initial code, update this file to reflect project-specific conventions, build/test commands, and architectural decisions.
- Reference key files and directories as they are created.

---

**Example update (after code is added):**
- "Run tests with: `npm test`"
- "Main API logic in `src/api/`"
- "Use `requests` for HTTP calls (see `src/utils/http.py`)"

Please revise this file as the project grows to keep AI agents productive and aligned with current practices.