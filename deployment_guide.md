# Production Deployment Guide

This guide walks you through deploying the Clinic Management Platform to a production Linux VPS (e.g., Ubuntu on AWS, Render, DigitalOcean, or Linode).

---

## 1. Prerequisites Installation

Connect to your server via SSH and install the required system dependencies:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20+) & NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Install PM2 Process Manager globally
sudo npm install pm2 -g

# Install Nginx Web Server
sudo apt install nginx -y

# Install MongoDB Database Tools (Required for backup script)
sudo apt-get install -y mongodb-database-tools
```

---

## 2. Deploy Code & Setup Directories

Clone your repository to the server (typically under `/var/www/`):

```bash
# Create directory and set permissions
sudo mkdir -p /var/www/carepulse
sudo chown -R $USER:$USER /var/www/carepulse

# Clone code
git clone <your-repo-url> /var/www/carepulse
cd /var/www/carepulse
```

---

## 3. Configure Environment Settings

Create the production environment file in the backend directory:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in your production credentials inside the `.env` file:
*   `NODE_ENV=production`
*   `MONGO_URI` (Your MongoDB Atlas connection URI)
*   `JWT_SECRET` (A strong, unique secret key)
*   `FRONTEND_URL` (Set this to your production domain name, e.g., `https://your-domain.com`)
*   `STRIPE_SECRET_KEY` (Your Stripe production API secret key)
*   `GEMINI_API_KEY` (Your official Google AI Gemini API key)

---

## 4. Install Dependencies & Build Frontend

Run the install and build scripts:

```bash
# Install backend dependencies
cd /var/www/carepulse/backend
npm install --production

# Install frontend dependencies and build static assets
cd /var/www/carepulse/frontend
npm install
npm run build
```

---

## 5. Process Management with PM2

Launch the Express API using the clustered PM2 configuration file:

```bash
cd /var/www/carepulse

# Start the application using PM2 config
pm2 start ecosystem.config.cjs

# Enable PM2 to launch on system boot
pm2 startup
# (Copy and execute the command printed in your terminal by the startup step)

# Save the process list state
pm2 save
```

To monitor your running server, you can use:
*   `pm2 status` (Check active processes)
*   `pm2 logs` (Stream log outputs)

---

## 6. Configure Nginx Reverse Proxy & SSL

Copy the provided Nginx configuration to the server's Nginx sites-available folder:

```bash
# Copy template config
sudo cp /var/www/carepulse/nginx.conf /etc/nginx/sites-available/carepulse

# Enable site config by creating a symbolic link
sudo ln -s /etc/nginx/sites-available/carepulse /etc/nginx/sites-enabled/

# Remove default site config to avoid conflicts
sudo rm /etc/nginx/sites-enabled/default

# Test configuration syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Install SSL Certificates via Let's Encrypt (Certbot)
Ensure your domain's DNS points to the server IP, then secure it with free SSL:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot will automatically verify ownership, fetch the SSL certs, and update Nginx configurations dynamically.

---

## 7. Enable Automated Database Backups

Ensure the database backup script is executable, then configure it to run daily at 2:00 AM using `cron`:

```bash
# Make script executable
chmod +x /var/www/carepulse/backend/backup_db.sh

# Open crontab
crontab -e
```

Append the following line to the crontab:
```cron
0 2 * * * /var/www/carepulse/backend/backup_db.sh > /dev/null 2>&1
```

Save and exit. Your database will now back up automatically every night, keeping the last 7 days of snapshots.
