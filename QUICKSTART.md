# ⚡ Быстрый старт - 5 минут

## Шаг 1: Установка (1 минута)

Добавьте этот код в `<head>` вашего сайта:

```html
<!-- Основной SDK -->
<script src="http://localhost:3000/tracksee-heatmap.js"></script>

<!-- Инициализация -->
<script>
  // Замените на ваш API Key из дашборда
  const TRACKSEE_API_KEY = 'ваш-api-key-здесь';
  
  // Запускаем трекинг
  trackseeHeatmap({
    apiKey: TRACKSEE_API_KEY,
    apiUrl: 'http://localhost:3000/api/ingest'
  });
</script>
```

## Шаг 2: Проверка (2 минуты)

1. Откройте ваш сайт
2. Покликайте по кнопкам
3. Проскролльте страницу
4. Откройте DevTools (F12) → Console

Вы должны увидеть: `Tracksee SDK initialized`

## Шаг 3: Просмотр данных (2 минуты)

1. Откройте http://localhost:3000
2. Войдите в свой аккаунт
3. Выберите проект
4. Перейдите во вкладки:
   - **Heatmaps** — карта кликов
   - **Sessions** — записи сессий
   - **Events** — события в реальном времени

## ✅ Готово!

Данные собираются автоматически. Через 5-10 минут вы увидите первые heatmaps.

---

## 🎯 Примеры использования

### Отслеживание кнопки "Купить"

```javascript
// HTML
<button id="buy-btn" onclick="trackPurchase()">Купить</button>

// JavaScript
function trackPurchase() {
  tracksee.track({
    type: 'purchase',
    name: 'buy_button_clicked',
    properties: {
      product_id: '123',
      product_name: 'iPhone 15',
      price: 999.99,
      currency: 'USD'
    }
  });
}
```

### Отслеживание формы регистрации

```javascript
document.getElementById('signup-form').addEventListener('submit', function(e) {
  tracksee.track({
    type: 'form_submit',
    name: 'registration',
    properties: {
      form_id: 'signup',
      has_referral_code: document.getElementById('referral').value !== ''
    }
  });
});
```

### Идентификация после входа

```javascript
// После успешного входа пользователя
fetch('/api/login', {...})
  .then(response => response.json())
  .then(user => {
    tracksee.identify(user.id, {
      email: user.email,
      name: user.name,
      plan: user.subscription.plan
    });
  });
```

### Отслеживание ошибок

```javascript
window.addEventListener('error', function(e) {
  tracksee.track({
    type: 'error',
    name: 'javascript_error',
    properties: {
      message: e.message,
      filename: e.filename,
      line: e.lineno,
      stack: e.error?.stack
    }
  });
});
```

---

## 🔥 Частые сценарии

### E-commerce

```javascript
// Просмотр товара
tracksee.track({
  type: 'product',
  name: 'product_viewed',
  properties: {
    product_id: 'SKU-123',
    name: 'Nike Air Max',
    category: 'Shoes',
    price: 150.00
  }
});

// Добавление в корзину
tracksee.track({
  type: 'cart',
  name: 'added_to_cart',
  properties: {
    product_id: 'SKU-123',
    quantity: 2,
    cart_value: 300.00
  }
});

// Оформление заказа
tracksee.track({
  type: 'purchase',
  name: 'order_completed',
  properties: {
    order_id: 'ORD-789',
    total: 300.00,
    items: 2,
    coupon: 'SAVE20'
  }
});
```

### SaaS

```javascript
// Регистрация
tracksee.track({
  type: 'signup',
  name: 'user_registered',
  properties: {
    source: 'google_ads',
    plan_selected: 'pro'
  }
});

// Активация фичи
tracksee.track({
  type: 'feature',
  name: 'feature_used',
  properties: {
    feature_name: 'api_integration',
    first_time: true
  }
});

// Апгрейд плана
tracksee.track({
  type: 'billing',
  name: 'plan_upgraded',
  properties: {
    from_plan: 'starter',
    to_plan: 'pro',
    mrr_increase: 50.00
  }
});
```

### Content/Media

```javascript
// Просмотр статьи
tracksee.track({
  type: 'content',
  name: 'article_read',
  properties: {
    article_id: 'post-456',
    title: '10 Tips for Growth',
    category: 'Marketing',
    author: 'John Doe'
  }
});

// Видео
tracksee.track({
  type: 'video',
  name: 'video_watched',
  properties: {
    video_id: 'vid-789',
    duration: 300,
    watch_time: 180,
    percent_watched: 60
  }
});
```

---

## 📱 React/Next.js

```jsx
// hooks/useTracksee.js
import { useEffect } from 'react';

export function useTracksee() {
  useEffect(() => {
    // Загружаем SDK только на клиенте
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'http://localhost:3000/tracksee-heatmap.js';
      script.onload = () => {
        window.trackseeHeatmap({
          apiKey: process.env.NEXT_PUBLIC_TRACKSEE_API_KEY,
          apiUrl: 'http://localhost:3000/api/ingest'
        });
      };
      document.head.appendChild(script);
    }
  }, []);
}

// Использование
function MyApp({ Component, pageProps }) {
  useTracksee();
  return <Component {...pageProps} />;
}
```

---

## 🔧 Отладка

Проверьте, что всё работает:

```javascript
// В консоли браузера
console.log(window.tracksee);
// Должно вывести объект с методами

// Проверьте отправку
tracksee.track({
  type: 'test',
  name: 'debug_event'
});
// В DevTools → Network должен появиться запрос к /api/ingest
```

---

## 🎓 Следующие шаги

1. **Создайте воронку** — отслеживайте путь от регистрации до покупки
2. **Настройте алерты** — получайте уведомления об ошибках
3. **Изучите heatmaps** — узнайте, куда кликают пользователи
4. **Смотрите сессии** — записи действий пользователей

---

**Полная документация:** [SDK-DOCUMENTATION.md](./SDK-DOCUMENTATION.md)

**Поддержка:** support@tracksee.ru
