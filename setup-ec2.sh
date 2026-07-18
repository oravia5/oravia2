#!/bin/bash
# Automate setup of Ubuntu 24.04 LTS for Oravia Backend + DB

# Exit immediately if any command fails
set -e

echo "========================================="
# 1. Update Package List & Install Base Dependencies
echo "=== 1. Updating packages & installing system utilities ==="
sudo apt-get update -y
sudo apt-get install -y gnupg curl git nginx

echo "========================================="
# 2. Install Node.js v20.x (LTS)
echo "=== 2. Downloading & Installing Node.js v20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "========================================="
# 3. Configure and Install MongoDB 8.0 Community Edition
echo "=== 3. Adding MongoDB keys and repository ==="
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update -y
echo "=== Installing MongoDB packages ==="
sudo apt-get install -y mongodb-org

echo "========================================="
# 4. Start Services and Enable on Boot
echo "=== 4. Starting and enabling database & web server ==="
sudo systemctl daemon-reload
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl start nginx
sudo systemctl enable nginx

echo "========================================="
# 5. Install PM2 Globally
echo "=== 5. Installing PM2 Process Manager globally ==="
sudo npm install -g pm2

echo "========================================="
echo "🎉 SYSTEM UTILITIES & SERVER STACK CONFIGURED SUCCESSFULLY! 🎉"
echo "========================================="
