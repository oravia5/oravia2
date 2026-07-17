# AWS Deployment Guide — Oravia

This guide explains how to deploy the Oravia application (React frontend + Node.js/Express backend) to Amazon Web Services (AWS). It details the requirements, hosting options, and existing code configurations that make deployment seamless.

---

## 🏗️ Architecture Design

For maximum speed, scalability, and cost-efficiency, we recommend a **separated hosting architecture**:

1. **Frontend (React/Vite SPA)**: Hosted on **AWS S3** (Static Website Hosting) fronted by **AWS CloudFront** (CDN with SSL certificate).
2. **Backend (Node.js/Express Server)**: Hosted on **AWS Elastic Beanstalk (EBS)** or an **AWS EC2** instance running PM2 behind an Application Load Balancer (ALB).
3. **Database**: **MongoDB Atlas** (recommended for Node/Mongo stack) or **AWS DocumentDB**.
4. **Media Storage**: **AWS S3 Bucket** (for user-uploaded posts, reels, and avatars).

---

## 🛠️ What is ALREADY in the Codebase?

We have already configured several features to make AWS deployment smooth:

### 1. Dynamic Environment Base URL (`client.js`)
The API helper ([client.js](file:///c:/oravia/frontend/src/api/client.js)) dynamically resolves the backend URL. In production, it will look for the domain it is hosted on, or you can supply the `VITE_API_URL` environment variable during the Vite build process.

### 2. Built-in AWS S3 Media Support
The backend's [StorageService.js](file:///c:/oravia/backend/services/storage.service.js) is **already pre-written with AWS SDK integration**. 
* If S3 environment variables are supplied, it automatically uploads all image/video posts directly to S3.
* If they are missing, it safely falls back to local storage in `./uploads/`.

### 3. Ably Chat Integration
The real-time messaging uses **Ably** serverless presence and transport, meaning you **do not** need to configure complex WebSockets or sticky sessions on the AWS Load Balancer!

---

## 📋 Requirements & Setup Checklist

To deploy Oravia, you will need the following accounts/credentials:

### 1. Database (MongoDB)
* Create a free cluster on **MongoDB Atlas** (or an AWS DocumentDB instance).
* Whitelist the IP of your AWS Backend server (or allow `0.0.0.0/0`).
* Copy the connection string: `mongodb+srv://<username>:<password>@cluster.mongodb.net/oravia`.

### 2. Media Storage (AWS S3)
* Create an S3 Bucket (e.g., `oravia-media-bucket`).
* Configure **CORS** on the S3 bucket to allow access from your frontend domain:
  ```json
  [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": []
    }
  ]
  ```
* Create an **IAM User** in AWS with `AmazonS3FullAccess` permission policy, and generate an Access Key & Secret Key.

### 3. Ably Real-time Key
* Register a free developer account on [Ably](https://ably.com/).
* Copy the Ably API key to your backend configuration.

---

## 🚀 Step-by-Step Deployment Instructions

### Phase 1: Deploy Backend (AWS EC2 / Elastic Beanstalk)

We recommend **AWS Elastic Beanstalk** because it auto-configures Node.js, load balancers, and environment variables automatically.

1. Go to the AWS Elastic Beanstalk console and click **Create Application**.
2. Select Platform: **Node.js** (v18 or v20).
3. Zip your `backend` directory (exclude `node_modules`).
4. Upload the zip and set the following **Environment Properties** in the configuration:
   * `PORT`: `5000`
   * `MONGODB_URI`: `mongodb+srv://...`
   * `JWT_SECRET`: `your_random_jwt_secret_key`
   * `ABLY_API_KEY`: `your_ably_api_key`
   * `AWS_ACCESS_KEY_ID`: `your_aws_iam_access_key`
   * `AWS_SECRET_ACCESS_KEY`: `your_aws_iam_secret_key`
   * `AWS_REGION`: `us-east-1` (or your preferred region)
   * `AWS_BUCKET_NAME`: `oravia-media-bucket`
5. Click Deploy. Note down the backend URL provided by AWS (e.g. `http://oravia-env.eba-xxxx.amazonaws.com`).

---

### Phase 2: Build & Deploy Frontend (AWS S3 + CloudFront)

1. Open `c:/oravia/frontend/.env.production` (or create it) and set your backend API URL:
   ```env
   VITE_API_URL=https://your-backend-api-domain.com
   ```
2. Build the static bundle:
   ```bash
   cd frontend
   npm run build
   ```
   This compiles everything into a `dist/` directory.
3. Create an S3 bucket for the static website (e.g. `oravia-frontend`).
4. Enable **Static Website Hosting** in S3 properties, setting `index.html` as both the index and error document (critical for React Router fallback routing).
5. Upload all files from the `frontend/dist/` directory into this bucket.
6. Create an **AWS CloudFront Distribution**:
   * Point the origin domain to your S3 bucket website endpoint.
   * Redirect HTTP to HTTPS.
   * Set custom error responses: redirect `404 Error` to `/index.html` with a response code of `200` (to support React client-side routing).
7. Deploy CloudFront. Your app is now live!
