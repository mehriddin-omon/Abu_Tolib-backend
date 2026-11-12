#!/usr/bin/env bash
# DigitalOcean Droplet (Ubuntu 24.04) uchun bir martalik sozlash.
# Ishlatish (root sifatida):  bash setup-droplet.sh "<github-actions-public-key>"
set -euo pipefail

DEPLOY_KEY="${1:-}"
APP_DIR=/opt/abu-tolib

echo "==> Tizimni yangilash"
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl ufw fail2ban unattended-upgrades

echo "==> Docker o'rnatish"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> 'deploy' foydalanuvchisi"
if ! id deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy
fi
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
if [ -n "$DEPLOY_KEY" ]; then
  grep -qxF "$DEPLOY_KEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$DEPLOY_KEY" >> /home/deploy/.ssh/authorized_keys
fi
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true

echo "==> Ilova papkasi: $APP_DIR"
mkdir -p "$APP_DIR/backups"
chown -R deploy:deploy "$APP_DIR"

echo "==> Swap (2 GB) — kichik Droplet'da build/migratsiya uchun"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall: faqat SSH, HTTP, HTTPS"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> Avtomatik xavfsizlik yangilanishlari"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Kunlik baza zaxirasi (03:30, 14 kun saqlanadi)"
cat > /etc/cron.d/abu-tolib-backup <<'CRON'
30 3 * * * deploy cd /opt/abu-tolib && docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backups/db-$(date +\%F).sql.gz && find backups -name 'db-*.sql.gz' -mtime +14 -delete
CRON

echo
echo "Tayyor. Keyingi qadam: $APP_DIR/.env faylini to'ldiring (deploy/.env.production.example asosida)."
