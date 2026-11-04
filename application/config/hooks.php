<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$hook['post_controller_constructor'][] = array(
    'class' => 'VisitorLogger',
    'function' => 'log_document_view',
    'filename' => 'VisitorLogger.php',
    'filepath' => 'hooks',
    'params' => array(),
);
