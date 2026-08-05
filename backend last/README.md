# Backend (Laravel)

UPPMS API. Controllers and Services are grouped by **domain** under:

- `app/Http/Controllers/{Auth,Projects,Scheduling,Tracks,…}/`
- `app/Services/{Auth,Projects,Scheduling,Tracks,…}/`

See **[`app/DOMAINS.md`](app/DOMAINS.md)** for the full map.

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
