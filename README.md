# Cloud Migration Strategy Planner

A comprehensive web application that helps businesses plan and execute their migration to AWS cloud services. This tool provides infrastructure discovery, migration analysis, cost estimation, and roadmap generation.

## Features

- **Infrastructure Discovery**: Collect data on your on-premises infrastructure
- **Migration Analysis**: Get recommendations for migration strategies (rehost, replatform, rearchitect)
- **Cost Estimation**: Calculate projected AWS migration and operational costs
- **Migration Roadmap**: Generate detailed migration timelines with phases and tasks

## Technology Stack

### Backend
- AWS Lambda (Node.js)
- Amazon DynamoDB
- Amazon S3
- AWS API Gateway
- AWS CloudFormation
- AWS SAM

### Frontend
- HTML5, CSS3, JavaScript
- Bootstrap 5
- Chart.js

## Getting Started

### Prerequisites
- Node.js (v14.x or higher)
- AWS CLI configured with appropriate credentials
- AWS SAM CLI

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cloud-migration-strategy-planner.git
   cd cloud-migration-strategy-planner
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Deploy the backend:
   ```
   npm run deploy
   ```

4. Set up post-deployment resources:
   ```
   npm run post-deploy
   ```

5. Deploy the frontend:
   ```
   npm run deploy-frontend
   ```

### Local Development

To run the application locally:

1. Start the development server:
   ```
   cd local-app
   python3 -m http.server 8000
   ```

2. Open your browser and navigate to `http://localhost:8000`

## Architectural Overview

The application follows a serverless architecture:

1. **Discovery Layer**: Uses AWS Application Discovery Service APIs to collect infrastructure data
2. **Processing Layer**: Lambda functions process discovery data and generate recommendations
3. **Storage Layer**: DynamoDB tables store metadata and analysis results
4. **Presentation Layer**: Web interface provides visualization and interactive features

## Deployment

The application can be deployed using the AWS SAM CLI:

```
npm run deploy          # Backend deployment
npm run post-deploy     # Post-deployment configuration
npm run deploy-frontend # Frontend deployment
```

## Demo Mode

When running locally or without backend connectivity, the application operates in a demo mode using mock data, allowing you to test all features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 