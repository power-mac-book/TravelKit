# TravelKit

A travel platform that converts traveler interest into group bookings through social proof and dynamic pricing.

## Features

- **Interest Expression**: Travelers can express interest in destinations with dates and group size
- **Social Proof**: Display interest counts and recent traveler names to increase conversions
- **Calendar View**: Visual heatmap showing interest levels by date
- **Group Formation**: Automatic clustering of similar interests into groups
- **Dynamic Pricing**: Group discounts based on size with transparent pricing rules
- **Admin Dashboard**: Analytics, content management, and group oversight

## Architecture

### Backend (FastAPI)
- RESTful API with automatic documentation
- PostgreSQL for primary data storage
- Redis for caching and counters
- Celery for background processing
- SQLAlchemy ORM with Alembic migrations

### Frontend (Next.js)
- Server-side rendering for SEO
- TypeScript for type safety
- Tailwind CSS for styling
- React Query for data fetching
- Responsive design

### Background Processing
- Interest clustering algorithms
- Email/WhatsApp notifications
- Analytics aggregation
- Cache warming

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Development Setup

1. **Clone and setup environment**:
   ```bash
   git clone <repository-url>
   cd TravelKit
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start services with Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**:
   ```bash
   docker-compose exec api alembic upgrade head
   ```

4. **Access the application**:
   - API Documentation: http://localhost:8000/docs
   - Frontend: http://localhost:3000
   - Database: localhost:5432
   - Redis: localhost:6379

### API Endpoints

#### Destinations
- `GET /api/v1/destinations` - List destinations with interest summaries
- `GET /api/v1/destinations/{id}` - Get destination details
- `GET /api/v1/destinations/{id}/calendar?month=2025-10` - Calendar data
- `POST /api/v1/destinations` - Create destination (admin)

#### Interests
- `POST /api/v1/interests` - Submit traveler interest
- `GET /api/v1/interests` - List interests (with filters)
- `GET /api/v1/interests/{id}` - Get interest details

#### Social Proof
- `GET /api/v1/socialproof/home` - Homepage messages
- `POST /api/v1/socialproof/messages` - Create message (admin)

### Key Workflows

#### Interest Submission Flow
1. Traveler submits interest via `POST /api/interests`
2. Backend persists to PostgreSQL
3. Redis counters updated: `INCR interest_count:destination:{id}:YYYY-MM-DD`
4. Analytics event emitted
5. Recent interest cache updated

#### Group Formation Flow
1. Celery worker runs clustering job (daily/hourly)
2. Query open interests within date window (±7 days)
3. Apply clustering algorithm (rule-based + optional ML)
4. Create group records with pricing
5. Notify matched travelers
6. Update interest status to 'matched'

#### Social Proof Display
1. Frontend requests destinations with `GET /api/destinations`
2. Backend computes interest summaries from Redis/DB
3. Display "X people interested" and recent names
4. Calendar view shows interest heatmap

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
docker-compose exec api pytest

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
# Create new migration
docker-compose exec api alembic revision --autogenerate -m "Description"

# Apply migrations
docker-compose exec api alembic upgrade head
```

## Deployment

### Production Docker Setup
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
See `.env.example` for required configuration:
- Database connection
- Redis URL
- External service API keys (SendGrid, Twilio, Stripe)
- JWT secrets
- AWS credentials (optional)

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.