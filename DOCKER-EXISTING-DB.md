# Подключение к существующей базе данных в Portainer

## Шаг 1: Узнайте имя контейнера с базой

1. Зайдите в Portainer: http://89.208.14.253:9000/
2. Перейдите в раздел **Containers**
3. Найдите ваш контейнер с PostgreSQL
4. Запомните его **имя** (например: `postgres`, `db`, `postgresql`)

## Шаг 2: Создайте Stack в Portainer

1. **Stacks** → **Add stack**
2. **Build method:** Repository
3. **Name:** `tracksee`
4. **Repository URL:** `https://github.com/1dailyfactschannel-cyber/Tracksee.git`
5. **Repository reference:** `refs/heads/main`
6. **Compose path:** `docker-compose.yml`

## Шаг 3: Укажите Environment Variables

В разделе **Environment variables** добавьте:

```
DATABASE_URL=postgres://postgres:D2rGkB6CaIwpb@ИМЯ_КОНТЕЙНЕРА_БД:5432/tracksee
NEXTAUTH_SECRET=asdasdLskksak111LLS
NEXTAUTH_URL=http://89.208.14.253:5440
```

**Замените** `ИМЯ_КОНТЕЙНЕРА_БД` на реальное имя из Шага 1!

### Примеры DATABASE_URL:

Если контейнер БД называется `postgres`:
```
DATABASE_URL=postgres://postgres:D2rGkB6CaIwpb@postgres:5432/tracksee
```

Если контейнер БД называется `db`:
```
DATABASE_URL=postgres://postgres:D2rGkB6CaIwpb@db:5432/tracksee
```

Если контейнер БД называется `postgresql`:
```
DATABASE_URL=postgres://postgres:D2rGkB6CaIwpb@postgresql:5432/tracksee
```

## Шаг 4: Deploy

Нажмите **Deploy the stack**

## Проверка

После запуска:
- Приложение: http://89.208.14.253:5440
- API endpoint: http://89.208.14.253:5440/api/ingest

## Если не работает

1. Проверьте логи контейнера tracksee-app в Portainer
2. Убедитесь, что имя контейнера БД указано правильно
3. Проверьте, что БД доступна по имени контейнера
