# Watch Test Backend

A robust Node.js backend service built with Fastify, featuring authentication, todo management, and Kafka integration. The project includes comprehensive unit tests, integration tests, and load tests.

## 🚀 Features

- User authentication (register, login)
- Todo management (create, list, delete)
- JWT-based authorization
- Kafka event publishing
- PostgreSQL database integration
- OpenTelemetry instrumentation
- Comprehensive test suite (unit, integration, load)
- AWS Infrastructure
  - S3 bucket for storage
  - Lambda functions for serverless operations
- Infrastructure as Code with Terraform
- Automated deployments via GitHub Actions

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Apache Kafka
- k6 (for load testing)

Optional (for containerized setup):
- Docker Desktop
  - Provides containerized Kafka
  - Includes Jaeger for trace visualization

For infrastructure management:
- AWS CLI configured with appropriate credentials
- Terraform CLI
- GitHub account for CI/CD

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/leonardoAbreu30/watchTestBackend.git
cd watchTestBackend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=watchTest
DB_PASSWORD=postgres
DB_PORT=5432
JWT_SECRET=your-secret-key
KAFKA_BROKER=localhost:9092
```

4. Start the infrastructure (if using Docker):
```bash
# Start Kafka, and Jaeger
docker compose up -d
```

5. Run database migrations:
```bash
npm run migrate
```

## 🏃‍♂️ Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 🧪 Testing

### Unit Tests

Run all unit tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

Coverage report:
```bash
npm run test:coverage
```

### Integration Tests

Run integration tests:
```bash
npm test src/__tests__/integration/app.test.ts
```

### Load Testing

The project includes k6 load tests with different scenarios:

1. **Smoke Test**
   - 1 user for 1 minute
   - Basic functionality verification

2. **Load Test**
   - Ramps up to 10 users over 9 minutes
   - Tests normal operating conditions

3. **Stress Test**
   - Ramps up to 30 users over 12 minutes
   - Tests system behavior under heavy load

4. **Spike Test**
   - Quick ramp up to 50 users over 4 minutes
   - Tests system behavior under sudden load

Running load tests:
```bash
# Run all scenarios
./load-tests/run-tests.sh

# Run specific scenario
./load-tests/run-tests.sh smoke
./load-tests/run-tests.sh load
./load-tests/run-tests.sh stress
./load-tests/run-tests.sh spike
```

Performance Thresholds:
- 95% of all requests: < 2 seconds
- 95% of auth requests: < 3 seconds
- 95% of todo requests: < 1.5 seconds
- Error rate: < 10%

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "name": "string"
}
```

#### Login
```http
POST /login
Content-Type: application/json

{
  "usernameOrEmail": "string",
  "password": "string"
}
```

### Todo Endpoints

#### Create Todo
```http
POST /todos
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "string"
}
```

#### List Todos
```http
GET /todos
Authorization: Bearer <token>
```

#### Delete Todo
```http
DELETE /todos/:id
Authorization: Bearer <token>
```

## 🏗️ Project Structure

```
watchTestBackend/
├── src/
│   ├── __tests__/           # Test files
│   │   ├── integration/     # Integration tests
│   │   ├── services/        # Service unit tests
│   │   └── routes/          # Route unit tests
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── db.ts               # Database configuration
│   ├── server.ts           # Server setup
│   └── tracing.ts          # OpenTelemetry setup
├── load-tests/             # k6 load tests
├── migrations/             # Database migrations
├── terraform/              # IaC for AWS resources
│   ├── main.tf            # Main Terraform configuration
│   ├── variables.tf       # Variable definitions
├── .github/
│   └── workflows/         # GitHub Actions workflows
└── package.json
```

## 📊 Monitoring

The application includes OpenTelemetry instrumentation for:
- HTTP requests
- Database queries
- Kafka operations

Traces are exported via OTLP HTTP protocol.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
