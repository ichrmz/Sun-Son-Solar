<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;

class Home extends BaseController
{
    /**
     * Serve the front-end (public/index.html) at "/".
     * style.css, script.js and logo.png are normal static files in public/.
     */
    public function index(): ResponseInterface
    {
        $file = FCPATH . 'index.html';

        if (! is_file($file)) {
            return $this->response
                ->setStatusCode(404)
                ->setBody('index.html was not found in the public/ folder.');
        }

        return $this->response
            ->setContentType('text/html', 'UTF-8')
            ->setBody((string) file_get_contents($file));
    }
}
