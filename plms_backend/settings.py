# Django settings for PLMS project
# Location: plms_backend/settings.py

import os
from pathlib import Path
from datetime import timedelta
import dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
dotenv.load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-ab-plus-secret-key-123456')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',  # SECURITY FIX (VULN-06): Enable JWT token blacklisting
    'corsheaders',
    'backend',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'plms_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'plms_backend.wsgi.application'

# Database
# Using MySQL with mysqlclient connection pool
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('MYSQLDATABASE', os.environ.get('MYSQL_DATABASE', os.environ.get('DB_NAME', 'ab_plus'))),
        'USER': os.environ.get('MYSQLUSER', os.environ.get('DB_USER', 'root')),
        'PASSWORD': os.environ.get('MYSQLPASSWORD', os.environ.get('DB_PASSWORD', 'root')),
        'HOST': os.environ.get('MYSQLHOST', os.environ.get('DB_HOST', '127.0.0.1')),
        'PORT': os.environ.get('MYSQLPORT', os.environ.get('DB_PORT', '3306')),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom User Model definition
AUTH_USER_MODEL = 'backend.CustomUser'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # SECURITY FIX (VULN-02): Rate-limit all anonymous requests to prevent brute-force attacks
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/minute',   # Max 10 unauthenticated requests per minute per IP (covers /login/)
        'user': '300/minute',  # Authenticated users: 300 requests/minute (covers 5-sec polling)
    }
}

# Simple JWT Configuration
SIMPLE_JWT = {
    # SECURITY FIX (VULN-06): 16-hour access tokens so staff stay logged in during duty shifts
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=16),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,        # Each refresh issues a new refresh token
    'BLACKLIST_AFTER_ROTATION': True,     # Old refresh token is blacklisted immediately
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# SECURITY FIX (VULN-03): CORS — deny all origins by default.
# In production, set CORS_ALLOWED_ORIGINS in Railway env vars to your Vercel frontend domain.
# e.g. CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'
CORS_ALLOW_CREDENTIALS = True

if os.environ.get('CORS_ALLOWED_ORIGINS'):
    CORS_ALLOWED_ORIGINS = [
        origin.strip().rstrip('/') for origin in os.environ.get('CORS_ALLOWED_ORIGINS').split(',') if origin.strip()
    ]

# CSRF Trusted Origins Configuration
CSRF_TRUSTED_ORIGINS = []

if os.environ.get('CSRF_TRUSTED_ORIGINS'):
    CSRF_TRUSTED_ORIGINS = [
        origin.strip().rstrip('/') for origin in os.environ.get('CSRF_TRUSTED_ORIGINS').split(',') if origin.strip()
    ]

# Auto-add Railway domain to trusted CSRF origins if available
railway_domain = os.environ.get('RAILWAY_STATIC_URL')
if railway_domain:
    for proto in ['http', 'https']:
        origin = f"{proto}://{railway_domain.strip()}"
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)

# Dynamically add all ALLOWED_HOSTS (except wildcard '*') to trusted CSRF origins
for host in ALLOWED_HOSTS:
    host_clean = host.strip()
    if host_clean and host_clean != '*':
        for proto in ['http', 'https']:
            origin = f"{proto}://{host_clean}"
            if origin not in CSRF_TRUSTED_ORIGINS:
                CSRF_TRUSTED_ORIGINS.append(origin)


# Silence Django USERNAME_FIELD global uniqueness requirement check
SILENCED_SYSTEM_CHECKS = ["auth.E003"]

# ─── SECURITY FIX (VULN-07 + VULN-04): HTTPS / Security Headers ───────────────
# These settings only activate in production (when DEBUG=False).
# On Railway, ensure DEBUG is set to False in environment variables.
if not DEBUG:
    # Force all traffic over HTTPS
    SECURE_SSL_REDIRECT = True
    # Tell Railway's proxy that upstream connection is HTTPS
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # HSTS: Tell browsers to only use HTTPS for 1 year
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    # Protect cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Prevent browsers from guessing content type
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Prevent browsers from loading resources from insecure connections
    SECURE_BROWSER_XSS_FILTER = True
