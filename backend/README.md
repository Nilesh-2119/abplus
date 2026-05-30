# AB+ Pathology SaaS - Backend Architecture (DRF + PostgreSQL)

This directory contains the production-style Django REST Framework (DRF) backend structure mapped for PostgreSQL. It provides a multi-tenant workspace architecture built to scale to millions of records.

## Database Schema & Indexing Strategy

To maintain sub-second response times as the platform scales:
1. **Tenant Separation**: Labs are mapped to individual tenants. Every user and data entry includes a `lab_id` foreign key.
2. **Dashboard Optimization**: To prevent massive queries, dashboard counters use simple count aggregations on indexed columns.
3. **Database Indexes**:
   - **`Lab.status`**: Indexed to accelerate dashboard aggregation (`active_labs`, `suspended_labs`).
   - **`Lab.created_at`**: Indexed to support fast descending sorts in lists.
   - **`CustomUser.role` & `CustomUser.lab`**: Compound index optimized for filtering staff lists per lab workspace.
   - **`ActivityLog.timestamp`**: Indexed to accelerate cursor pagination retrieval for timeline feeds.

### PostgreSQL Index Definitions (Django equivalents)
```python
# Models index configuration (backend/models.py)
class Meta:
    indexes = [
        models.Index(fields=['status', 'created_at']), # Optimized for list + status filter
    ]
```

---

## Scalability Guidelines

### 1. Cursor-Based Pagination
For tables with high write volume (such as `ActivityLog`), offset pagination (`LIMIT X OFFSET Y`) forces PostgreSQL to scan all preceding records. To prevent database degradation, enforce cursor pagination in `settings.py`:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.CursorPagination',
    'PAGE_SIZE': 100,
}
```

### 2. Lightweight Summaries (`GET /api/labs/:id/summary/`)
Clicking active or inactive cards on the frontend triggers a query to the lightweight `summary` action. This action:
- Restricts selection to only `'id'`, `'name'`, and `'status'` fields using Django's `.only()` method.
- Uses `select_related()` and `prefetch_related()` where appropriate.
- Annotates specific counts without doing full inner table joins.

---

## Deployment & Hookup Steps

To swap the frontend from simulated mock data to this live Django API:

1. **Set Environment variables**:
   In `Frontend/ab-plus-landing/.env.local`, set:
   ```env
   NEXT_PUBLIC_API_URL=http://your-django-server-url/api
   ```
2. **Toggle Mock Mode**:
   In `Frontend/ab-plus-landing/src/services/api.ts`, change:
   ```typescript
   export const IS_MOCK = false;
   ```
3. **Run Django Migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. **Launch Server**:
   ```bash
   python manage.py runserver
   ```
