# Развёртывание на сервере (Beget VPS или любой Linux)

Инструкция по шагам. Программа запускается в Docker: контейнер приложения
(Streamlit) + контейнер Nginx (принимает запросы с сайта). Данные хранятся в
папках на сервере (`data`, `uploads`, `reports`, `backups`) и переживают
обновления и перезапуски.

> Рекомендуется **VPS** (виртуальный сервер), а не обычный виртуальный хостинг:
> для полноценного Python-приложения с Docker нужен root-доступ. На обычном
> shared-хостинге Beget без поддержки Docker/фоновых процессов приложение
> стабильно работать не будет.

---

## 1. Создать VPS
1. Личный кабинет Beget → раздел **VPS** → создать сервер.
2. ОС: **Ubuntu 22.04** (или новее). Минимум 1–2 ГБ RAM.
3. Запишите **IP-адрес** сервера и **пароль root** (или добавьте SSH-ключ).

## 2. Подключиться по SSH
С вашего компьютера (PowerShell или терминал):
```bash
ssh root@IP-адрес-сервера
```
Введите пароль (или используйте ключ).

## 3. Установить Docker
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

## 4. Загрузить проект из Git
Если проект на GitHub:
```bash
cd /opt
git clone https://github.com/ВАШ_ЛОГИН/line_incidents_app.git
cd line_incidents_app
```
(Как выложить проект на GitHub — см. README.md, раздел «Публикация в GitHub».)

## 5. Настроить `.env`
```bash
cp .env.example .env
nano .env
```
Обязательно задайте:
- `APP_ENV=production`
- `ADMIN_USERNAME` — логин администратора;
- `ADMIN_PASSWORD` — **надёжный** пароль;
- при желании `SESSION_TIMEOUT_MINUTES`, `MAX_UPLOAD_SIZE_MB`.

Сохранить в nano: `Ctrl+O`, `Enter`, затем `Ctrl+X`.

## 6. Запустить приложение
```bash
docker compose up -d --build
```
Проверить, что контейнеры работают:
```bash
docker compose ps
```
Открыть в браузере: `http://IP-адрес-сервера` — появится страница входа.
Войдите под администратором из `.env` и **сразу смените пароль** в разделе
«🔐 Пользователи».

## 7. Привязать домен
1. В настройках домена (DNS) создайте **A-запись**, указывающую на IP сервера.
2. В файле `nginx/nginx.conf` замените `server_name _;` на ваш домен, например:
   `server_name shody.company.ru;`
3. Перезапустите Nginx:
```bash
docker compose restart nginx
```

## 8. Включить HTTPS (SSL)
Вариант с бесплатным сертификатом Let's Encrypt (certbot):
```bash
apt install -y certbot
# временно освободить порт 80
docker compose stop nginx
certbot certonly --standalone -d shody.company.ru
```
Скопируйте сертификаты в проект:
```bash
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/shody.company.ru/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/shody.company.ru/privkey.pem  nginx/ssl/
```
В `nginx/nginx.conf` раскомментируйте блок HTTPS (server 443) и блок
перенаправления с HTTP на HTTPS. В `docker-compose.yml` раскомментируйте
строку `- "443:443"`. Запустите снова:
```bash
docker compose up -d
```
Продление сертификата (раз в 3 месяца) — `certbot renew` + перезапуск Nginx.

## 9. Резервное копирование
- Вручную: в программе раздел «💾 Резервные копии» → «Создать копию» → «Скачать».
- Копии базы лежат на сервере в `backups/`.
- Автоматически (каждый день в 3:00) — добавьте задание cron на сервере:
```bash
crontab -e
```
и строку:
```
0 3 * * * cp /opt/line_incidents_app/data/incidents.db /opt/line_incidents_app/backups/auto_$(date +\%Y\%m\%d).db
```

## 10. Обновление программы
```bash
cd /opt/line_incidents_app
cp data/incidents.db backups/before_update_$(date +%Y%m%d_%H%M).db   # бэкап на всякий случай
git pull
docker compose down
docker compose up -d --build
```

## 11. Просмотр логов
```bash
docker compose logs -f          # все логи
docker compose logs -f app      # только приложение
```

## 12. Перезапуск / остановка
```bash
docker compose restart          # перезапуск
docker compose down             # остановить
docker compose up -d            # запустить снова
```

## 13. Если что-то не работает
- **Сайт не открывается** — проверьте `docker compose ps` (оба контейнера
  должны быть `running`) и `docker compose logs app`.
- **Ошибка порта 80 занят** — остановите то, что его занимает, или измените порт
  в `docker-compose.yml`.
- **Не заходит по домену** — проверьте A-запись DNS (может обновляться до суток).
- **Забыли пароль администратора** — задайте новый в `.env` пункт
  `ADMIN_PASSWORD`, но учтите: новый админ создаётся только если в базе НЕТ
  пользователей. Проще создать/сбросить пользователя через SSH-скрипт или
  восстановить из резервной копии.
- **Данные пропали после обновления** — данные в папках `data/`, `uploads/`,
  `reports/`, `backups/`; они не удаляются при `docker compose down`. Не
  запускайте `docker compose down -v` (флаг `-v` удаляет тома).
