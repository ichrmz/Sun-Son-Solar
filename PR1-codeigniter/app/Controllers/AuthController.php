<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

/**
 * JSON API for the Sun Son Solar front-end (script.js).
 *
 *   POST /api/register   create a customer or employee account
 *   POST /api/login      log in with username OR email
 *   POST /api/logout     end the session
 *   GET  /api/me         who is logged in right now
 *
 * Every response is JSON. Errors look like:
 *   { "ok": false, "errors": { "email": "That email is already registered." } }
 * The keys match the field names script.js already understands
 * (firstName, lastName, birthdate, gender, email, phone, address, username,
 * password, confirm, department, loginId, loginPassword). Any other key
 * (like "_form" or "terms") is shown as a general message above the button.
 */
class AuthController extends BaseController
{
    /** Value sent by the dropdown in index.html => value stored in the database enum. */
    private const DEPARTMENTS = [
        'administration'   => 'Administration',
        'it'               => 'IT',
        'dispatch'         => 'Dispatch',
        'accounting'       => 'Accounting',
        'hr'               => 'HR',
        'marketing'        => 'Marketing',
        'sales'            => 'Sales',
        'customer-service' => 'Customer Service',
    ];

    private const GENDERS = [
        'female'  => 'Female',
        'male'    => 'Male',
        'not-say' => 'Prefer not to say',
    ];

    private const MIN_AGE = 18;

    /** A real bcrypt hash of a throwaway string. Used so a wrong username takes the same time as a wrong password. */
    private const DUMMY_HASH = '$2y$10$TXSxdO1E2Ivu3nkKexOABeeE3Cyz2oRT3/pg9SLXOOjPq1aDbYnGW';

    // ------------------------------------------------------------------
    // POST /api/register
    // ------------------------------------------------------------------
    public function register(): ResponseInterface
    {
        $in   = $this->readJson();
        $role = (($in['role'] ?? '') === 'employee') ? 'employee' : 'customer';

        // Clean the input (text is trimmed, passwords are left exactly as typed).
        $d = [];
        foreach (['firstName', 'middleName', 'lastName', 'birthdate', 'gender', 'email', 'phone', 'address', 'username', 'department'] as $key) {
            $d[$key] = (isset($in[$key]) && is_string($in[$key])) ? trim($in[$key]) : '';
        }
        $d['password'] = (isset($in['password']) && is_string($in['password'])) ? $in['password'] : '';
        $d['confirm']  = (isset($in['confirm']) && is_string($in['confirm'])) ? $in['confirm'] : '';
        $d['phone']    = preg_replace('/[\s\-()]+/', '', $d['phone']) ?? '';
        if (str_starts_with($d['phone'], '+63')) {
            $d['phone'] = '0' . substr($d['phone'], 3); // store every PH number as 09xxxxxxxxx
        }
        $d['email']    = strtolower($d['email']);

        // 1) Field rules
        $validation = service('validation');
        $validation->setRules($this->registerRules($role));
        $errors = $validation->run($d) ? [] : $validation->getErrors();

        // 2) Extra checks the built-in rules can't do
        if (! isset($errors['birthdate'])) {
            $msg = $this->birthdateProblem($d['birthdate']);
            if ($msg !== null) {
                $errors['birthdate'] = $msg;
            }
        }
        if (! isset($errors['password']) && strlen($d['password']) > 72) {
            $errors['password'] = 'Use 72 characters or fewer.';
        }
        if (($in['terms'] ?? false) !== true) {
            $errors['terms'] = 'You must agree to the Terms of Service and Privacy Policy.';
        }

        // 3) Duplicates (only worth a query if the format was already fine)
        $db = Database::connect();
        if (! isset($errors['username']) && $db->table('users')->where('username', $d['username'])->countAllResults() > 0) {
            $errors['username'] = 'That username is already taken.';
        }
        if (! isset($errors['email']) && $this->emailExists($d['email'])) {
            $errors['email'] = 'That email is already registered.';
        }

        if ($errors !== []) {
            return $this->json(['ok' => false, 'errors' => $errors], 422);
        }

        // 4) Save: login row in `users`, profile row in `customers` or `employees`. All or nothing.
        $profile = [
            'firstname'  => $d['firstName'],
            'middlename' => $d['middleName'],
            'lastname'   => $d['lastName'],
            'birthdate'  => $d['birthdate'],
            'gender'     => self::GENDERS[$d['gender']],
            'email'      => $d['email'],
            'phonenum'   => $d['phone'],
            'address'    => $d['address'],
        ];
        if ($role === 'employee') {
            $profile['department'] = self::DEPARTMENTS[$d['department']];
        }

        try {
            $db->transBegin();

            $okUser = $db->table('users')->insert([
                'username' => $d['username'],
                'password' => password_hash($d['password'], PASSWORD_DEFAULT),
                'role'     => $role,
            ]);
            if ($okUser === false) {
                throw new \RuntimeException('Could not insert into users.');
            }

            $profile['user_id'] = $db->insertID();
            $okProfile = $db->table($role === 'employee' ? 'employees' : 'customers')->insert($profile);
            if ($okProfile === false) {
                throw new \RuntimeException('Could not insert the profile row.');
            }

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();

            // Two people submitting the same username/email at the same moment end up here.
            if (str_contains($e->getMessage(), 'Duplicate entry')) {
                $field = str_contains($e->getMessage(), 'email') ? 'email' : 'username';
                $text  = $field === 'email' ? 'That email is already registered.' : 'That username is already taken.';

                return $this->json(['ok' => false, 'errors' => [$field => $text]], 422);
            }

            log_message('error', 'Register failed: ' . $e->getMessage());

            return $this->json(['ok' => false, 'errors' => ['_form' => 'We could not save your account. Please try again.']], 500);
        }

        return $this->json(['ok' => true, 'firstName' => $d['firstName'], 'role' => $role], 201);
    }

    // ------------------------------------------------------------------
    // POST /api/login
    // ------------------------------------------------------------------
    public function login(): ResponseInterface
    {
        // Max 10 tries per minute from one IP address.
        $allowed = service('throttler')->check('login_' . md5($this->request->getIPAddress()), 10, MINUTE);
        if ($allowed === false) {
            return $this->json(['ok' => false, 'errors' => ['loginPassword' => 'Too many tries. Please wait a minute and try again.']], 429);
        }

        $in       = $this->readJson();
        $loginId  = (isset($in['loginId']) && is_string($in['loginId'])) ? trim($in['loginId']) : '';
        $password = (isset($in['loginPassword']) && is_string($in['loginPassword'])) ? $in['loginPassword'] : '';

        $errors = [];
        if ($loginId === '') {
            $errors['loginId'] = 'Enter your username or email.';
        }
        if ($password === '') {
            $errors['loginPassword'] = 'Enter your password.';
        }
        if ($errors !== []) {
            return $this->json(['ok' => false, 'errors' => $errors], 422);
        }

        $user = $this->findUserByLoginId($loginId);

        // Always run password_verify, even for unknown users, so timing doesn't reveal which usernames exist.
        $hash  = $user['password'] ?? self::DUMMY_HASH;
        $valid = password_verify($password, $hash) && $user !== null;

        if (! $valid) {
            return $this->json(['ok' => false, 'errors' => ['loginPassword' => 'Incorrect username/email or password.']], 401);
        }

        $session = session();
        $session->regenerate(true); // new session id after login (stops session fixation)
        $session->set(['user_id' => (int) $user['user_id'], 'role' => $user['role']]);

        return $this->json($this->profileFor($user));
    }

    // ------------------------------------------------------------------
    // POST /api/logout
    // ------------------------------------------------------------------
    public function logout(): ResponseInterface
    {
        session()->destroy();

        return $this->json(['ok' => true]);
    }

    // ------------------------------------------------------------------
    // GET /api/me
    // ------------------------------------------------------------------
    public function me(): ResponseInterface
    {
        $userId = session()->get('user_id');

        if (! $userId) {
            // 200 on purpose: "not logged in" is a normal answer here, and it keeps the browser console clean.
            return $this->json(['ok' => false, 'errors' => ['_form' => 'Not logged in.']]);
        }

        $user = Database::connect()->table('users')->where('user_id', $userId)->get()->getRowArray();
        if ($user === null) {
            session()->destroy();

            return $this->json(['ok' => false, 'errors' => ['_form' => 'Not logged in.']]);
        }

        return $this->json($this->profileFor($user));
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** @return array<string, array<string, mixed>> */
    private function registerRules(string $role): array
    {
        $name = "regex_match[/^[\\p{L}][\\p{L} .'\\-]*$/u]";

        return [
            'firstName'  => ['rules' => "required|max_length[100]|{$name}", 'errors' => [
                'required' => 'Enter your first name.', 'max_length' => 'Use 100 characters or fewer.', 'regex_match' => 'Use letters only.']],
            'middleName' => ['rules' => "permit_empty|max_length[100]|{$name}", 'errors' => [
                'max_length' => 'Use 100 characters or fewer.', 'regex_match' => 'Use letters only.']],
            'lastName'   => ['rules' => "required|max_length[100]|{$name}", 'errors' => [
                'required' => 'Enter your last name.', 'max_length' => 'Use 100 characters or fewer.', 'regex_match' => 'Use letters only.']],
            'birthdate'  => ['rules' => 'required|valid_date[Y-m-d]', 'errors' => [
                'required' => 'Enter your birthdate.', 'valid_date' => 'Enter a real date.']],
            'gender'     => ['rules' => 'required|in_list[' . implode(',', array_keys(self::GENDERS)) . ']', 'errors' => [
                'required' => 'Choose one.', 'in_list' => 'Choose one of the options.']],
            'email'      => ['rules' => 'required|valid_email|max_length[100]', 'errors' => [
                'required' => 'Enter a valid email.', 'valid_email' => 'Enter a valid email.', 'max_length' => 'Use 100 characters or fewer.']],
            'phone'      => ['rules' => 'required|regex_match[/^(09\d{9}|\+639\d{9})$/]', 'errors' => [
                'required' => 'Enter a phone number.', 'regex_match' => 'Use a PH mobile number like 09123456789.']],
            'address'    => ['rules' => 'required|min_length[5]|max_length[200]', 'errors' => [
                'required' => 'Enter your address.', 'min_length' => 'Enter your full address.', 'max_length' => 'Use 200 characters or fewer.']],
            'username'   => ['rules' => 'required|min_length[4]|max_length[20]|regex_match[/^[A-Za-z0-9_.]+$/]', 'errors' => [
                'required' => 'Choose a username.', 'min_length' => 'At least 4 characters.', 'max_length' => 'Use 20 characters or fewer.',
                'regex_match' => 'Letters, numbers, underscore and dot only.']],
            'password'   => ['rules' => 'required|min_length[8]|regex_match[/^(?=.*[A-Za-z])(?=.*\d).+$/]', 'errors' => [
                'required' => 'At least 8 characters.', 'min_length' => 'At least 8 characters.', 'regex_match' => 'Use at least one letter and one number.']],
            'confirm'    => ['rules' => 'required|matches[password]', 'errors' => [
                'required' => "Passwords don't match.", 'matches' => "Passwords don't match."]],
            'department' => $role === 'employee'
                ? ['rules' => 'required|in_list[' . implode(',', array_keys(self::DEPARTMENTS)) . ']', 'errors' => [
                    'required' => 'Choose a department.', 'in_list' => 'Choose a department.']]
                : ['rules' => 'permit_empty'],
        ];
    }

    private function birthdateProblem(string $value): ?string
    {
        $dob   = \DateTime::createFromFormat('!Y-m-d', $value);
        $today = new \DateTime('today');

        if ($dob === false || (int) $dob->format('Y') < 1900) {
            return 'Enter a real date.';
        }
        if ($dob > $today) {
            return 'Birthdate cannot be in the future.';
        }
        if ($dob->diff($today)->y < self::MIN_AGE) {
            return 'You must be at least ' . self::MIN_AGE . ' years old to register.';
        }

        return null;
    }

    private function emailExists(string $email): bool
    {
        $db = Database::connect();

        return $db->table('customers')->where('email', $email)->countAllResults() > 0
            || $db->table('employees')->where('email', $email)->countAllResults() > 0;
    }

    /** Find a `users` row by username, or by the email saved on a customer/employee profile. */
    private function findUserByLoginId(string $loginId): ?array
    {
        $db   = Database::connect();
        $user = $db->table('users')->where('username', $loginId)->get()->getRowArray();

        if ($user === null && str_contains($loginId, '@')) {
            foreach (['customers', 'employees'] as $table) {
                $row = $db->table($table)->select('user_id')->where('email', strtolower($loginId))->get()->getRowArray();
                if ($row !== null) {
                    $user = $db->table('users')->where('user_id', $row['user_id'])->get()->getRowArray();
                    break;
                }
            }
        }

        return $user;
    }

    /** What the front-end gets after login or /api/me. Never includes the password. */
    private function profileFor(array $user): array
    {
        $table = $user['role'] === 'employee' ? 'employees' : 'customers';
        $p     = Database::connect()->table($table)->where('user_id', $user['user_id'])->get()->getRowArray() ?? [];

        $out = [
            'ok'         => true,
            'id'         => (int) $user['user_id'],
            'username'   => $user['username'],
            'role'       => $user['role'],
            'firstName'  => $p['firstname'] ?? '',
            'middleName' => $p['middlename'] ?? '',
            'lastName'   => $p['lastname'] ?? '',
            'email'      => $p['email'] ?? '',
            'phone'      => $p['phonenum'] ?? '',
            'address'    => $p['address'] ?? '',
        ];
        if ($user['role'] === 'employee') {
            $out['department'] = $p['department'] ?? '';
        }

        return $out;
    }

    /** @return array<string, mixed> */
    private function readJson(): array
    {
        try {
            $data = $this->request->getJSON(true);
        } catch (\Throwable) {
            return [];
        }

        return is_array($data) ? $data : [];
    }

    private function json(array $payload, int $status = 200): ResponseInterface
    {
        return $this->response
            ->setStatusCode($status)
            ->setHeader('Cache-Control', 'no-store')
            ->setJSON($payload);
    }
}
