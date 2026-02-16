# 🚀 Installation Guide

Полное руководство по установке Tracksee Analytics для продакшена.

---

## 📋 Требования

### Минимальные
- **Node.js**: 18.x или выше
- **PostgreSQL**: 14.x или выше
- **RAM**: 2GB минимум, 4GB рекомендуется
- **Диск**: 20GB свободного места

### Рекомендуемые
- **Node.js**: 20.x LTS
- **PostgreSQL**: 15.x
- **RAM**: 8GB
- **SSD**: 50GB+
- **OS**: Ubuntu 22.04 LTS / CentOS 8 / Debian 11

---

## 🛠️ Шаг 1: Подготовка сервера

### Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### Установка Node.js

```bash
# Используем NVM (рекомендуется)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Установка Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Проверка
node -v  # v20.x.x
npm -v   # 10.x.x
```

### Установка PostgreSQL

```bash
# Ubuntu 22.04
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib

# Запуск сервиса
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка
sudo -u postgres psql -c "SELECT version();"
```

---

## 🗄️ Шаг 2: Настройка базы данных

### Создание пользователя и базы

```bash
# Переключаемся на postgres пользователя
sudo -u postgres psql

# Создаем пользователя
CREATE USER tracksee_user WITH PASSWORD 'your_secure_password';

# Создаем базу данных
CREATE DATABASE tracksee_db OWNER tracksee_user;

# Даем права
GRANT ALL PRIVILEGES ON DATABASE tracksee_db TO tracksee_user;

# Выходим
\q
```

### Настройка PostgreSQL

```bash
# Открываем конфиг
sudo nano /etc/postgresql/15/main/postgresql.conf

# Меняем настройки производительности
max_connections = 200
shared_buffers = 512MB
work_mem = 16MB
maintenance_work_mem = 128MB
effective_cache_size = 1536MB

# Разрешаем внешние подключения (если нужно)
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Добавляем строку:
host    tracksee_db    tracksee_user    0.0.0.0/0    md5

# Перезапускаем
sudo systemctl restart postgresql
```

---

## 📦 Шаг 3: Установка приложения

### Клонирование репозитория

```bash
# Создаем директорию
sudo mkdir -p /opt/tracksee
cd /opt/tracksee

# Клонируем (или загружаем архив)
sudo git clone https://github.com/yourusername/tracksee.git .
# или
sudo wget https://github.com/yourusername/tracksee/archive/main.tar.gz
sudo tar -xzf main.tar.gz

# Переходим в директорию проекта
cd Tracksee

# Устанавливаем зависимости
sudo npm install --production
```

### Настройка переменных окружения

```bash
# Создаем .env файл
sudo nano .env.local
```

Добавьте следующее:

```env
# Database
DATABASE_URL=postgresql://tracksee_user:your_secure_password@localhost:5432/tracksee_db

# NextAuth
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com

# App
NODE_ENV=production
PORT=3000

# Optional: Alerts
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
RESEND_API_KEY=your_resend_api_key

# Optional: Redis (для кэширования)
REDIS_URL=redis://localhost:6379
```

### Выполнение миграций

```bash
# Запускаем миграцию
node scripts/migrate.js

# Должно вывести:
# Connected to database
# Found 92 SQL statements
# ...........................................................................................
# ✅ Migration completed successfully!
```

---

## 🚀 Шаг 4: Запуск приложения

### Сборка

```bash
# Сборка приложения
npm run build

# Проверка
ls -la .next/
```

### PM2 (рекомендуется)

```bash
# Установка PM2 глобально
sudo npm install -g pm2

# Создаем конфиг
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tracksee',
    script: 'npm',
    args: 'start',
    cwd: '/opt/tracksee/Tracksee',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
EOF

# Создаем директорию для логов
mkdir -p logs

# Запуск
pm2 start ecosystem.config.js

# Сохраняем конфигурацию
pm2 save
pm2 startup
```

### Docker (альтернатива)

```bash
# Сборка образа
docker build -t tracksee:latest .

# Запуск
docker run -d \
  --name tracksee \
  -p 3000:3000 \
  -v $(pwd)/.env.local:/app/.env.local \
  --restart unless-stopped \
  tracksee:latest
```

---

## 🌐 Шаг 5: Настройка Nginx

### Установка Nginx

```bash
sudo apt install -y nginx
```

### SSL сертификат (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Получаем сертификат
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Автообновление
sudo systemctl enable certbot.timer
```

### Конфигурация Nginx

```bash
sudo nano /etc/nginx/sites-available/tracksee
```

```nginx
upstream tracksee {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (from Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://tracksee;
    }

    # API routes
    location /api/ {
        proxy_pass http://tracksee;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /_next/webpack-hmr {
        proxy_pass http://tracksee;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Main app
    location / {
        proxy_pass http://tracksee;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активация конфига
sudo ln -s /etc/nginx/sites-available/tracksee /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Шаг 6: Безопасность

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Проверка
sudo ufw status
```

### Fail2ban

```bash
sudo apt install -y fail2ban

# Настройка
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF

sudo systemctl restart fail2ban
```

### Автоматические обновления безопасности

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 Шаг 7: Мониторинг

### Логи

```bash
# Просмотр логов приложения
pm2 logs tracksee

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Мониторинг PostgreSQL

```bash
# Размер базы данных
sudo -u postgres psql -d tracksee_db -c "
SELECT pg_size_pretty(pg_database_size('tracksee_db'));
"

# Количество таблиц
sudo -u postgres psql -d tracksee_db -c "
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
"
```

### Резервное копирование

```bash
# Создаем скрипт бэкапа
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/tracksee"
mkdir -p $BACKUP_DIR

# Бэкап базы данных
sudo -u postgres pg_dump tracksee_db > $BACKUP_DIR/tracksee_db_$DATE.sql

# Архивация
 tar -czf $BACKUP_DIR/tracksee_db_$DATE.tar.gz -C $BACKUP_DIR tracksee_db_$DATE.sql
rm $BACKUP_DIR/tracksee_db_$DATE.sql

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Лог
logger "Tracksee backup completed: $BACKUP_DIR/tracksee_db_$DATE.tar.gz"
EOF

chmod +x /opt/backup.sh

# Добавляем в cron (ежедневно в 2:00 AM)
echo "0 2 * * * /opt/backup.sh" | sudo crontab -
```

---

## 🔄 Шаг 8: Обновление

```bash
# Остановка приложения
pm2 stop tracksee

# Бэкап перед обновлением
/opt/backup.sh

# Обновление кода
cd /opt/tracksee/Tracksee
git pull origin main

# Установка новых зависимостей
npm install --production

# Выполнение миграций
node scripts/migrate.js

# Пересборка
npm run build

# Запуск
pm2 restart tracksee

# Проверка статуса
pm2 status
pm2 logs tracksee --lines 50
```

---

## 🆘 Troubleshooting

### Приложение не запускается

```bash
# Проверка логов
pm2 logs tracksee --lines 100

# Проверка порта
sudo lsof -i :3000

# Проверка переменных окружения
cat .env.local

# Пересоздание node_modules
rm -rf node_modules package-lock.json
npm install --production
```

### Ошибки базы данных

```bash
# Проверка подключения
sudo -u postgres psql -d tracksee_db -c "SELECT 1;"

# Проверка прав пользователя
sudo -u postgres psql -c "\du tracksee_user"

# Пересоздание базы (осторожно!)
sudo -u postgres psql -c "DROP DATABASE tracksee_db;"
sudo -u postgres psql -c "CREATE DATABASE tracksee_db OWNER tracksee_user;"
node scripts/migrate.js
```

### Nginx ошибки

```bash
# Проверка конфигурации
sudo nginx -t

# Проверка синтаксиса
sudo nginx -c /etc/nginx/nginx.conf -t

# Перезапуск
sudo systemctl restart nginx

# Статус
sudo systemctl status nginx
```

---

## ✅ Проверка установки

Откройте браузер и перейдите по адресу:

```
https://your-domain.com
```

Должны работать:
- [ ] Главная страница
- [ ] Регистрация/вход
- [ ] Создание проекта
- [ ] Получение API Key
- [ ] Тестовая отправка события
- [ ] Heatmaps
- [ ] Session Recording
- [ ] Real-time dashboards

---

## 📞 Поддержка

При проблемах:
1. Проверьте логи: `pm2 logs`
2. Проверьте статус: `pm2 status`
3. Откройте issue на GitHub
4. Напишите в Telegram: @tracksee_support

---

**Готово!** Ваш Tracksee Analytics работает в продакшене! 🎉
