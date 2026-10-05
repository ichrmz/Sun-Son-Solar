<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Serves public/index.html (the front-end page).
$routes->get('/', 'Home::index');

// JSON API used by script.js
$routes->group('api', static function (RouteCollection $routes): void {
    $routes->post('register', 'AuthController::register');
    $routes->post('login', 'AuthController::login');
    $routes->post('logout', 'AuthController::logout');
    $routes->get('me', 'AuthController::me');
});
