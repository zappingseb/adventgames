# Deployment Guide for Advent Games

This guide explains how to deploy Advent Games to production using Docker Compose and SWAG (Let's Encrypt).

## Prerequisites

- EC2 instance (or any server with Docker and Docker Compose)
- Domain name (e.g., `keepoala.com`)
- Ports 80 and 443 open in your firewall

## Setup Instructions

### 1. Prepare the Server

```bash
# Clone or upload your project to the server
git clone <your-repo-url> /opt/adventgames
cd /opt/adventgames
```

### 2. Data Files

The default `scores.json` and `games.json` files are included in the repository. These will be used as defaults in the Docker container. When you mount the data volume, any changes will persist on the host.

### 3. Configure SWAG

```bash
# Create swag config directory
mkdir -p swag/config

# Copy the nginx configuration
# Option 1: Use the provided config file
cp swag-nginx-config.conf swag/config/nginx/proxy-confs/adventgames.subdomain.conf

# Option 2: Or add it to your existing default.conf
# Edit swag/config/nginx/site-confs/default.conf and add the server block
```

### 4. Update docker-compose.yml

Make sure to update the following in `docker-compose.yml`:
- `SUBDOMAINS=adventgames` (or your desired subdomain)
- `URL=keepoala.com` (your domain)
- `EMAIL=sebastian@keepoala.com` (your email)

### 5. Build and Start

```bash
# Build the Docker image
docker-compose build

# Start the services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 6. Verify Deployment

1. Check that containers are running:
   ```bash
   docker-compose ps
   ```

2. Check SWAG logs for SSL certificate generation:
   ```bash
   docker-compose logs swag
   ```

3. Visit `https://adventgames.keepoala.com` in your browser

## File Structure

```
adventgames/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── swag-nginx-config.conf
├── data/
│   ├── scores.json
│   └── games.json
└── swag/
    └── config/
        └── nginx/
            └── proxy-confs/
                └── adventgames.subdomain.conf
```

## Data Persistence

The `scores.json` and `games.json` files are stored in the `./data/` directory and mounted as volumes. This ensures your game data persists across container restarts.

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Or just restart if no code changes
docker-compose restart app
```

## Troubleshooting

### SSL Certificate Issues

If SSL certificates aren't generating:
1. Check that ports 80 and 443 are open
2. Verify DNS is pointing to your server
3. Check SWAG logs: `docker-compose logs swag`
4. Ensure the subdomain is correct in docker-compose.yml

### App Not Accessible

1. Check app logs: `docker-compose logs app`
2. Verify nginx config: `docker-compose exec swag nginx -t`
3. Check network connectivity: `docker-compose exec app ping swag`

### Data Not Persisting

1. Verify volume mounts: `docker-compose config`
2. Check file permissions in `./data/` directory
3. Ensure files exist before mounting

## Environment Variables

You can add environment variables to the `app` service in `docker-compose.yml`:

```yaml
app:
  environment:
    - NODE_ENV=production
    - PORT=3000
```

## Backup

To backup your data:

```bash
# Backup data files
tar -czf adventgames-backup-$(date +%Y%m%d).tar.gz data/
```

## Notes

- The app runs on port 3000 internally and is only accessible through SWAG
- SWAG handles SSL/TLS termination
- All HTTP traffic is redirected to HTTPS
- The React app is built during the Docker image build process

