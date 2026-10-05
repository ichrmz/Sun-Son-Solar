# Sun Son Solar

**Team name:** `<< write your team name here >>`
**Members:** `<< front-end >>`, Ian (back-end), `<< data analyst >>`, `<< documentation >>`

## Description

Sun Son Solar is a family-run solar company website for homes and businesses.
This project is the **registration and login system**. A visitor can create a
**customer** or **employee** account, log in with a username or email, and see
their account page. All data is saved in a MySQL database.

- Front-end: HTML, CSS, JavaScript (`public/`)
- Back-end: CodeIgniter 4 (PHP 8.1+), JSON API
- Database: MySQL / MariaDB (XAMPP), file `database/sunsonsolar.sql`

## How to run it (Windows + XAMPP, no command line needed)

1. Install CodeIgniter's needs: XAMPP with PHP 8.1 or newer. In XAMPP, click **Config > PHP (php.ini)** next to Apache and make sure `extension=mbstring` and `extension=mysqli` have no `;` in front. `extension=intl` is recommended; if it is off, the project loads a small stand-in (`app/Fallback/LocaleFallback.php`) so it still runs.
2. Run `composer install` in the project folder (this downloads the `vendor/` folder, which is not stored in GitHub). If you cannot use a terminal, ask a teammate for a zip of `vendor/`.
3. Put the project folder in `C:\xampp\htdocs\` and name it `sunsonsolar`.
4. Start **Apache** and **MySQL** in the XAMPP Control Panel.
5. Open `http://localhost/phpmyadmin`, click **Import**, choose `database/sunsonsolar.sql`, click **Go**. This also adds the initial users.
6. Open `http://localhost/sunsonsolar/public/`.

Different database password? Copy `env` to `.env` and change the `database.default.*` lines.

## Initial users

From the client's follow-up interview:

| Username | Name | Role | Department |
|----------|------|------|------------|
| KittyKat16 | Katherine Olap Sinagaraw | customer | - |
| admin | Sol Sun Solis | employee | IT (IT head) |

The demo passwords are the ones the client gave (see the interview notes). They are saved as hashes in the database.

## API

All endpoints are under `/api` and use JSON.

| Method | URL | What it does |
|--------|-----|--------------|
| POST | `/api/register` | Validate and save a new customer or employee |
| POST | `/api/login` | Log in with username or email |
| POST | `/api/logout` | End the session |
| GET | `/api/me` | Return the logged-in user, or `ok:false` |

Validation (done on the server, even if the browser check is skipped): every
field is required except middle name; valid email; PH mobile number
(`09XXXXXXXXX`); at least 18 years old; username 4-20 letters/numbers/`_`/`.`;
password at least 8 characters with a letter and a number; passwords must match;
employees must pick one of the 8 departments (Administration, IT, Dispatch,
Accounting, HR, Marketing, Sales, Customer Service); username and email must be unique.

## Database

| Table | Purpose |
|-------|---------|
| `users` | Login info: username, hashed password, role |
| `customers` | Customer profile, linked to `users.user_id` |
| `employees` | Employee profile + department, linked to `users.user_id` |
| `products` | Solar products (not used by the page yet) |

Passwords are stored as bcrypt hashes (`password_hash`), never as plain text.

## Note for the front-end

The website files live in `public/`. In `script.js`, the API calls use `fetch('.' + path ...)`
(with the dot) so the site works both in a XAMPP subfolder and on `php spark serve`.
Please keep that dot.
