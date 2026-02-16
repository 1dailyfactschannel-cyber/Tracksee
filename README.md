# 🎯 Tracksee Analytics

**Современная система аналитики для веб и мобильных приложений**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## 📋 Содержание

- [Что это?](#что-это)
- [Возможности](#возможности)
- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [Документация](#документация)
- [Разработка](#разработка)

---

## 🤔 Что это?

**Tracksee** — это open-source аналитическая платформа, альтернатива платным сервисам вроде:
- 🔥 **Hotjar** (heatmaps, session recording)
- 📊 **Mixpanel/Amplitude** (event tracking, funnels)
- 🧪 **Optimizely** (A/B testing)
- 📱 **Firebase Analytics** (mobile analytics)

### Почему Tracksee?

✅ **Полный контроль данных** — храните данные на своих серверах  
✅ **Без лимитов** — неограниченное количество событий и пользователей  
✅ **Privacy First** — GDPR compliant, храните данные в своей юрисдикции  
✅ **Кастомизация** — изменяйте под свои нужды  
✅ **Интеграции** — Telegram, Slack, Email, Webhooks  

---

## ✨ Возможности

### 📊 Event Tracking
- Автоматический сбор событий
- Кастомные события с properties
- Real-time дашборд

### 🔥 Heatmaps
- **Click maps** — где кликают пользователи
- **Scroll maps** — глубина просмотра страниц
- **Rage clicks** — раздражающие элементы (3+ клика/сек)

### 🎥 Session Recording
- Полная запись сессий
- Replay действий пользователя
- DOM mutations, network requests
- Console logs и ошибки

### 🎯 Funnels (Воронки)
- Визуализация шагов конверсии
- Drop-off analysis
- Сравнение периодов
- Conversion rates

### 👤 User Profiles
- История каждого пользователя
- Сессии и события
- Геолокация и устройства
- Custom properties

### 📈 Cohort Analysis
- Retention curves
- Cohort tables
- Анализ удержания по времени

### 🧪 A/B Testing
- Сплит-тесты
- Statistical significance
- Автоматический winner selection

### 🚨 Real-time Alerts
- Telegram, Slack, Email
- Условия: ошибки, крэши, падение конверсии
- Webhook интеграции

### 📱 Mobile SDK
- **React Native** поддержка
- Crash reporting
- ANR detection
- Network monitoring

---

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone https://github.com/yourusername/tracksee.git
cd tracksee
cd Tracksee

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env.local
# Отредактируйте .env.local
```

### 2. Настройка базы данных

```bash
# Убедитесь, что PostgreSQL запущен
# Выполните миграцию
node scripts/migrate.js
```

### 3. Запуск

```bash
# Режим разработки
npm run dev

# Или сборка и запуск продакшена
npm run build
npm start
```

Приложение доступно по адресу: **http://localhost:3000**

### 4. Первоначальная настройка

1. Откройте http://localhost:3000
2. Зарегистрируйте аккаунт
3. Создайте проект
4. Получите API Key

### 5. Интеграция с сайтом

Добавьте этот код на ваш сайт:

```html
<script src="http://localhost:3000/tracksee-heatmap.js"></script>
<script>
  trackseeHeatmap({
    apiKey: 'YOUR-API-KEY',
    apiUrl: 'http://localhost:3000/api/ingest'
  });
</script>
```

**Готово!** Данные начнут собираться автоматически.

---

## 🏗️ Архитектура

```
Tracksee/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   │   ├── ingest/        # Прием событий
│   │   │   ├── heatmap/       # Heatmap API
│   │   │   ├── sessions/      # Session recording
│   │   │   ├── funnels/       # Funnels API
│   │   │   ├── users/         # User profiles
│   │   │   ├── cohorts/       # Cohort analysis
│   │   │   ├── alerts/        # Real-time alerts
│   │   │   └── ab-experiments/# A/B testing
│   │   └── projects/[id]/     # UI pages
│   ├── components/            # React components
│   └── lib/                   # Utilities & SDK
├── public/                    # Static assets & SDK
│   ├── tracksee-heatmap.js   # Heatmap SDK
│   └── tracksee-recorder.js  # Session SDK
└── packages/                  # Additional packages
    └── tracksee-react-native-sdk/
```

### Технологии

- **Frontend**: Next.js 16, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL 15
- **Real-time**: Server-Sent Events (SSE)
- **Charts**: Recharts
- **UI**: Radix UI, shadcn/ui

---

## 📚 Документация

### Основная документация

- **[QUICKSTART.md](./QUICKSTART.md)** — Быстрый старт за 5 минут
- **[SDK-DOCUMENTATION.md](./SDK-DOCUMENTATION.md)** — Полная документация SDK

### API Endpoints

#### Ingest API (Сбор данных)
```http
POST /api/ingest
Headers:
  x-api-key: YOUR_API_KEY
Body:
  {
    "type": "custom",
    "name": "button_clicked",
    "properties": {...}
  }
```

#### Heatmap API
```http
GET /api/heatmap?heatmap_id=xxx
POST /api/heatmap
```

#### Sessions API
```http
GET /api/sessions?project_id=xxx
POST /api/sessions
GET /api/sessions/events?recording_id=xxx
POST /api/sessions/events
```

### JavaScript SDK

```javascript
// Инициализация
const tracker = trackseeHeatmap({
  apiKey: 'YOUR-KEY',
  apiUrl: 'https://your-domain.com/api/ingest'
});

// Отправка события
tracksee.track({
  type: 'purchase',
  name: 'order_completed',
  properties: {
    order_id: '123',
    amount: 99.99
  }
});

// Идентификация пользователя
tracksee.identify('user_123', {
  email: 'user@example.com',
  plan: 'premium'
});

// Отслеживание страницы
tracksee.screen('Product Page', {
  product_id: '456'
});
```

### React Native SDK

```javascript
import { useTracksee } from 'tracksee-react-native-sdk';

function App() {
  const { track, screen, identify } = useTracksee({
    apiKey: 'YOUR-API-KEY',
    enableCrashReporting: true
  });

  return (
    <Button onPress={() => {
      track({
        type: 'custom',
        name: 'button_tapped',
        properties: { screen: 'Home' }
      });
    }}>
      Track Event
    </Button>
  );
}
```

---

## 💻 Разработка

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

### Сборка

```bash
npm run build
```

### Линтинг

```bash
npm run lint
```

### Структура базы данных

```sql
-- Основные таблицы
users, projects, events

-- Heatmaps
heatmaps, heatmap_clicks, heatmap_scrolls, rage_clicks

-- Session Recording
session_recordings, session_events, session_dom_snapshots

-- Funnels
funnels, funnel_steps, funnel_results

-- User Profiles
user_profiles, user_sessions, user_events

-- Cohort Analysis
cohorts, cohort_members, cohort_retention_data

-- Alerts
alerts, alert_events, alert_notifications

-- A/B Testing
ab_experiments, ab_variants, ab_experiment_results
```

---

## 🔧 Конфигурация

### Переменные окружения (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/tracksee_db

# NextAuth (для аутентификации)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Alerts (опционально)
TELEGRAM_BOT_TOKEN=your-bot-token
RESEND_API_KEY=your-resend-key

# App
NODE_ENV=development
```

### Docker (опционально)

```bash
# Запуск с Docker Compose
docker-compose up -d

# Остановка
docker-compose down
```

---

## 🎯 Use Cases

### E-commerce
- Отслеживание воронки покупок
- Анализ брошенных корзин
- A/B тестирование цен и UI

### SaaS
- Product analytics
- User onboarding funnels
- Feature adoption
- Churn prediction

### Content/Media
- Engagement metrics
- Content performance
- Reader behavior

### Mobile Apps
- Crash reporting
- User flows
- Retention analysis

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 Лицензия

Распространяется под лицензией MIT. См. [LICENSE](./LICENSE)

---

## 🙏 Благодарности

- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [Radix UI](https://www.radix-ui.com/) — Headless UI
- [Recharts](https://recharts.org/) — Charts library

---

## 📞 Поддержка

- 📧 Email: support@tracksee.ru
- 💬 Telegram: @tracksee_support
- 🐛 Issues: [GitHub Issues](https://github.com/tracksee/issues)

---

**Made with ❤️ by Tracksee Team**

---

## 🗺️ Roadmap

- [x] Event Tracking
- [x] Heatmaps
- [x] Session Recording
- [x] Funnels
- [x] User Profiles
- [x] Cohort Analysis
- [x] Real-time Alerts
- [x] A/B Testing
- [x] React Native SDK
- [ ] iOS SDK (Swift)
- [ ] Android SDK (Kotlin)
- [ ] Machine Learning insights
- [ ] Advanced segmentation
- [ ] Custom SQL queries
- [ ] Data export (BigQuery, S3)

---

<p align="center">
  <strong>⭐ Star us on GitHub if you find this useful!</strong>
</p>
