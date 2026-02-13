# Tracksee Analytics - Полная документация

## 🎯 Что такое Tracksee?

**Tracksee** — это полноценная система аналитики и мониторинга для веб и мобильных приложений, аналогичная Mixpanel, Amplitude или Hotjar.

### Возможности:
- 📊 **Event Tracking** — отслеживание событий пользователей
- 🔥 **Heatmaps** — карты кликов, скролла и rage clicks
- 🎥 **Session Recording** — запись действий пользователей
- 🎯 **Funnels** — анализ воронок конверсии
- 👤 **User Profiles** — профили пользователей с историей
- 📈 **Cohort Analysis** — когортный анализ и retention
- 🧪 **A/B Testing** — сплит-тесты
- 🚨 **Real-time Alerts** — уведомления в Telegram/Slack/Email
- 📱 **React Native SDK** — для мобильных приложений

---

## 🚀 Быстрый старт

### 1. Создайте проект

1. Откройте http://localhost:3000
2. Зарегистрируйтесь или войдите
3. Создайте новый проект в дашборде
4. Получите **API Key** (UUID формат)

### 2. Установите SDK на свой сайт

Добавьте этот код в `<head>` вашего сайта:

```html
<script src="https://tracksee.ru/tracksee-heatmap.js"></script>
<script>
  // Инициализация
  trackseeHeatmap({
    apiKey: 'YOUR-API-KEY',
    apiUrl: 'https://tracksee.ru/api/ingest'
  });
</script>
```

### 3. Готово! 

Данные начнут собираться автоматически. Проверьте:
- Heatmaps: `/projects/[id]/heatmap`
- Sessions: `/projects/[id]/sessions`
- Events: в реальном времени

---

## 📦 JavaScript SDK

### Базовое отслеживание

```javascript
// Отправка события
tracksee.track({
  type: 'custom',
  name: 'button_clicked',
  properties: {
    button_id: 'buy_now',
    product_id: '123',
    price: 99.99
  }
});

// Отслеживание пользователя
tracksee.identify('user_123', {
  email: 'user@example.com',
  plan: 'premium',
  signup_date: '2024-01-15'
});

// Отслеживание страницы
tracksee.screen('Product Page', {
  product_id: '123',
  category: 'electronics'
});
```

### API методы

#### `tracksee.track(event)`
Отправляет событие на сервер.

```javascript
tracksee.track({
  type: 'purchase',        // тип события
  name: 'order_completed', // название
  properties: {            // дополнительные данные
    order_id: 'ORD-123',
    amount: 150.00,
    currency: 'USD',
    items: 3
  }
});
```

#### `tracksee.identify(userId, traits)`
Идентифицирует пользователя.

```javascript
tracksee.identify('user_123', {
  email: 'john@example.com',
  name: 'John Doe',
  company: 'Acme Inc',
  plan: 'enterprise',
  created_at: '2024-01-01'
});
```

#### `tracksee.screen(name, properties)`
Отслеживает просмотр страницы/экрана.

```javascript
tracksee.screen('Checkout Page', {
  step: 2,
  total_items: 5,
  cart_value: 250.00
});
```

---

## 🔥 Heatmap SDK

### Установка

```html
<script src="https://tracksee.ru/tracksee-heatmap.js"></script>
<script>
  const tracker = trackseeHeatmap({
    apiKey: 'YOUR-API-KEY',
    apiUrl: 'https://tracksee.ru/api/ingest',
    rageClickThreshold: 3,  // порог для rage clicks
    scrollThrottle: 500     // интервал скролла (мс)
  });
</script>
```

### Что отслеживается автоматически:

- **Клики** — координаты X, Y, CSS селектор элемента
- **Скролл** — глубина скролла в процентах
- **Rage Clicks** — серия быстрых кликов (3+ за 1 сек)
- **Сессии** — начало/окончание сессии

### Ручной трекинг клика:

```javascript
tracker.track({
  event_type: 'heatmap_click',
  x: 100,
  y: 200,
  selector: '#buy-button',
  text: 'Buy Now',
  page_url: '/product/123'
});
```

### Просмотр heatmaps:

1. Перейдите в проект
2. Откройте вкладку "Heatmaps"
3. Выберите страницу
4. Смотрите:
   - 🔴 Красные точки — много кликов
   - 🟡 Желтые — среднее количество
   - 🟢 Зеленые — мало кликов
   - 📜 График скролла — глубина просмотра

---

## 🎥 Session Recording SDK

### Установка

```html
<script src="https://tracksee.ru/tracksee-recorder.js"></script>
<script>
  const recorder = trackseeSessionRecorder({
    apiKey: 'YOUR-API-KEY',
    apiUrl: 'https://tracksee.ru/api/sessions',
    eventsApiUrl: 'https://tracksee.ru/api/sessions/events',
    batchSize: 50,        // событий в пакете
    batchTimeout: 2000    // интервал отправки (мс)
  });
</script>
```

### Что записывается:

- **Mouse events** — движение, клики, скролл
- **Keyboard events** — нажатия клавиш (без паролей)
- **DOM mutations** — изменения на странице
- **Network requests** — API запросы
- **Console logs** — ошибки и логи
- **Web Vitals** — LCP, FID, CLS

### Ручное управление:

```javascript
// Приостановить запись
recorder.pauseRecording();

// Возобновить
recorder.resumeRecording();

// Остановить полностью
recorder.stopRecording();

// Изменить ID пользователя
recorder.updateUserId('new_user_id');
```

### Просмотр записей:

1. Перейдите в проект
2. Откройте вкладку "Sessions"
3. Выберите сессию
4. Используйте плеер для просмотра:
   - ▶️ Play/Pause
   - ⏪ Назад/Вперед
   - 🔊 Звук (для кликов)
   - ⚡ Скорость воспроизведения

---

## 🎯 Funnels (Воронки)

### Создание воронки через UI:

1. Перейдите в проект → Funnels
2. Нажмите "Создать воронку"
3. Добавьте шаги (события):
   - Step 1: `page_view` (path: /signup)
   - Step 2: `form_submit` (name: registration)
   - Step 3: `purchase` (name: order_completed)
4. Сохраните

### Отправка событий для воронки:

```javascript
// Шаг 1: Просмотр страницы регистрации
tracksee.track({
  type: 'page_view',
  name: 'signup_page',
  path: '/signup'
});

// Шаг 2: Отправка формы
tracksee.track({
  type: 'form_submit',
  name: 'registration',
  properties: {
    form_id: 'signup_form',
    fields_filled: 5
  }
});

// Шаг 3: Покупка
tracksee.track({
  type: 'purchase',
  name: 'order_completed',
  properties: {
    order_id: 'ORD-789',
    amount: 299.99,
    currency: 'USD'
  }
});
```

### Анализ воронки:

- **Conversion Rate** — процент прошедших все шаги
- **Drop-off Rate** — где пользователи "выпадают"
- **Timeline** — динамика по дням/неделям
- **Сравнение** — разные периоды

---

## 👤 User Profiles

### Идентификация пользователя:

```javascript
// При регистрации/входе
tracksee.identify('user_123', {
  email: 'john@example.com',
  name: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
  company: 'Acme Inc',
  plan: 'premium',
  signup_date: '2024-01-01',
  lifetime_value: 1500.00
});
```

### Отслеживание свойств:

```javascript
// Обновление свойств
tracksee.setUserProperties({
  last_login: new Date().toISOString(),
  total_orders: 15,
  preferred_category: 'electronics',
  subscription_status: 'active'
});
```

### Данные в профиле:

- 📊 Общее время на сайте
- 🔄 Количество сессий
- 📱 Устройства и браузеры
- 🌍 Геолокация
- 📈 История событий
- 🎯 Пройденные воронки

---

## 📱 React Native SDK

### Установка

```bash
npm install tracksee-react-native-sdk @react-native-async-storage/async-storage
```

### Инициализация

```javascript
import { useTracksee } from 'tracksee-react-native-sdk';

function App() {
  const { identify, track, screen, trackCrash } = useTracksee({
    apiKey: 'YOUR-API-KEY',
    enableCrashReporting: true,
    enableAnrReporting: true,
    enableNetworkMonitoring: true,
  });

  return <YourApp />;
}
```

### Отслеживание событий

```javascript
// Простое событие
const { track } = useTracksee({ apiKey: 'YOUR-API-KEY' });

track({
  type: 'custom',
  name: 'button_tapped',
  properties: {
    button_id: 'add_to_cart',
    screen: 'ProductDetails'
  }
});

// Просмотр экрана
const { screen } = useTracksee({ apiKey: 'YOUR-API-KEY' });

screen('ProductDetails', {
  product_id: '123',
  category: 'electronics'
});

// Идентификация
const { identify } = useTracksee({ apiKey: 'YOUR-API-KEY' });

identify('user_123', {
  email: 'user@example.com',
  name: 'John Doe'
});
```

### Отслеживание крэшей

```javascript
import { useTracksee } from 'tracksee-react-native-sdk';

function MyComponent() {
  const { trackCrash } = useTracksee({
    apiKey: 'YOUR-API-KEY',
    enableCrashReporting: true
  });

  useEffect(() => {
    try {
      // Ваш код
      riskyOperation();
    } catch (error) {
      trackCrash(error, {
        component: 'MyComponent',
        screen: 'Home'
      });
    }
  }, []);
}
```

### Мобильные метрики

Автоматически отслеживается:
- 📱 **OS Version** — iOS/Android версия
- 💥 **Crashes** — крэши приложения
- ⏱️ **ANR** — зависания (Application Not Responding)
- 🌐 **Network** — API запросы
- 🔋 **App State** — фон/активное состояние
- 📐 **Screen Resolution** — разрешение экрана

---

## 🚨 Real-time Alerts

### Создание алерта через UI:

1. Перейдите в проект → Alerts
2. Нажмите "Создать алерт"
3. Настройте:
   - **Тип**: Ошибки / Крэши / ANR / Падение конверсии
   - **Условие**: > 10 ошибок за 5 минут
   - **Важность**: Warning / Error / Critical
   - **Каналы**: Telegram / Slack / Email / Webhook

### Примеры алертов:

```javascript
// Алерт на ошибки API
{
  "alert_type": "error",
  "condition": {
    "event_name": "api_error",
    "status_code": 500
  },
  "threshold": 10,
  "time_window": 5,
  "severity": "critical"
}

// Алерт на падение конверсии
{
  "alert_type": "conversion_drop",
  "condition": {
    "funnel_id": "uuid-of-funnel"
  },
  "threshold": 20,  // % падения
  "time_window": 60,
  "severity": "warning"
}

// Алерт на крэши
{
  "alert_type": "crash",
  "threshold": 5,
  "time_window": 10,
  "severity": "error"
}
```

### Получение уведомлений:

- 📱 **Telegram**: Мгновенные сообщения с деталями
- 💬 **Slack**: Форматированные сообщения в канал
- 📧 **Email**: HTML письма с контекстом
- 🔗 **Webhook**: POST запрос на ваш URL

---

## 🧪 A/B Testing

### Создание эксперимента:

1. Перейдите в проект → Experiments
2. Создайте эксперимент:
   - **Название**: "Новая кнопка CTA"
   - **Гипотеза**: "Красная кнопка увеличит конверсию на 20%"
   - **Варианты**:
     - Control: текущая кнопка (50% трафика)
     - Variant A: красная кнопка (50% трафика)

### Отслеживание в коде:

```javascript
// Получение варианта для пользователя
const variant = await tracksee.getExperimentVariant('new-cta-button');

if (variant === 'control') {
  showButton('blue');
} else if (variant === 'variant_a') {
  showButton('red');
}

// Отправка конверсии
tracksee.track({
  type: 'conversion',
  name: 'cta_clicked',
  properties: {
    experiment_id: 'new-cta-button',
    variant: variant
  }
});
```

### Метрики эксперимента:

- 👥 **Visitors** — посетители по вариантам
- 🎯 **Conversions** — конверсии по вариантам
- 📊 **Conversion Rate** — процент конверсии
- 📈 **Statistical Significance** — статистическая значимость
- ✅ **Winner** — автоматический выбор победителя

---

## 📊 Дашборды и отчеты

### Основной дашборд:

```
http://localhost:3000/projects/[id]
```

Виджеты:
- 📈 График посещений
- 👥 Уникальные пользователи
- ⏱️ Среднее время сессии
- 🎯 Конверсия
- 🔥 Топ событий
- 📱 Устройства

### Специализированные отчеты:

- **Heatmaps**: `/projects/[id]/heatmap`
- **Sessions**: `/projects/[id]/sessions`
- **Funnels**: `/projects/[id]/funnels`
- **Users**: `/projects/[id]/users`
- **Cohorts**: `/projects/[id]/cohorts`
- **Alerts**: `/projects/[id]/alerts`

---

## 🔧 Продвинутые возможности

### Custom Properties

```javascript
tracksee.track({
  type: 'custom',
  name: 'advanced_event',
  properties: {
    // Стандартные поля
    category: 'engagement',
    
    // Пользовательские поля
    custom_data: {
      experiment_group: 'A',
      referrer_campaign: 'summer_sale',
      user_segment: 'premium'
    }
  }
});
```

### Batch отправка

SDK автоматически группирует события для оптимизации:

```javascript
// Отправляется сразу
tracksee.track({...}, { immediate: true });

// Добавляется в очередь (по умолчанию)
tracksee.track({...}); // отправится через 1 сек или при накоплении 20 событий
```

### Offline mode

События сохраняются в localStorage при отсутствии сети:

```javascript
// Автоматически отправится при восстановлении соединения
tracksee.track({...});
```

---

## 🎓 Best Practices

### 1. Структура событий

```javascript
// ✅ Хорошо — конкретные, структурированные события
tracksee.track({
  type: 'purchase',
  name: 'order_completed',
  properties: {
    order_id: 'ORD-123',
    amount: 99.99,
    currency: 'USD',
    items: [
      { id: 'PROD-1', name: 'T-Shirt', price: 29.99 },
      { id: 'PROD-2', name: 'Jeans', price: 69.99 }
    ],
    coupon_code: 'SUMMER20',
    discount: 10.00
  }
});

// ❌ Плохо — слишком общее
tracksee.track({
  type: 'custom',
  name: 'user_did_something'
});
```

### 2. Идентификация

```javascript
// ✅ Идентифицируйте как можно раньше
tracksee.identify(user.id, {
  email: user.email,
  plan: user.subscription.plan,
  signup_date: user.created_at
});

// ✅ Обновляйте свойства при изменениях
tracksee.setUserProperties({
  last_login: new Date().toISOString(),
  plan: 'premium' // если пользователь апгрейдился
});
```

### 3. Privacy

```javascript
// ❌ Никогда не отправляйте:
// - Пароли
// - Номера кредитных карт
// - Персональные данные без согласия

// ✅ Анонимизируйте:
tracksee.track({
  type: 'form_submit',
  name: 'payment',
  properties: {
    amount: 99.99,
    // НЕ включайте: card_number, cvv, etc.
    payment_method: 'card' // общий тип
  }
});
```

---

## 🆘 Troubleshooting

### Данные не приходят:

1. Проверьте API Key
2. Откройте DevTools → Network → проверьте запросы
3. Проверьте консоль на ошибки
4. Убедитесь, что домен разрешен в настройках проекта

### Ошибки CORS:

```javascript
// Убедитесь, что домен добавлен в проект
trackseeHeatmap({
  apiKey: 'YOUR-KEY',
  apiUrl: 'https://tracksee.ru/api/ingest'
});
```

### Медленная загрузка:

```javascript
// Асинхронная загрузка
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://tracksee.ru/tracksee-heatmap.js';
    script.async = true;
    script.onload = function() {
      trackseeHeatmap({ apiKey: 'YOUR-KEY' });
    };
    document.head.appendChild(script);
  })();
</script>
```

---

## 📞 Поддержка

- 📧 Email: support@tracksee.ru
- 💬 Telegram: @tracksee_support
- 📚 Документация: https://docs.tracksee.ru
- 🐛 GitHub Issues: https://github.com/tracksee/issues

---

## 📄 Лицензия

MIT License © 2024 Tracksee Analytics

---

**Готово!** 🎉 Теперь вы можете отслеживать всё, что происходит в вашем приложении!
