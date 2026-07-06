# -*- coding: utf-8 -*-
"""
Настройки программы. Читаются из переменных окружения и файла .env
(если он есть). Пароли и секреты хранятся только в .env, который НЕ попадает
в репозиторий.
"""

import os
from pathlib import Path

# Пытаемся загрузить .env рядом с этим файлом (если установлен python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass


def _get(key, default):
    val = os.environ.get(key)
    return val if val not in (None, "") else default


APP_NAME = _get("APP_NAME", "Учёт сходов с линии")
APP_ENV = _get("APP_ENV", "local")  # local | production

# Учётная запись администратора, создаётся при первом запуске
ADMIN_USERNAME = _get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = _get("ADMIN_PASSWORD", "admin")

# Автовыход при простое (в минутах)
SESSION_TIMEOUT_MINUTES = int(_get("SESSION_TIMEOUT_MINUTES", "60"))

# Максимальный размер загружаемого файла (МБ)
MAX_UPLOAD_SIZE_MB = int(_get("MAX_UPLOAD_SIZE_MB", "50"))
