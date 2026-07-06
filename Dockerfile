# Образ приложения «Учёт сходов с линии»
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Сначала зависимости — так кэш Docker переиспользуется при изменении кода
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Каталоги для данных (монтируются как тома в docker-compose)
RUN mkdir -p data uploads reports backups logs

EXPOSE 8501

# Проверка здоровья контейнера
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8501/_stcore/health')" || exit 1

CMD ["streamlit", "run", "app.py"]
