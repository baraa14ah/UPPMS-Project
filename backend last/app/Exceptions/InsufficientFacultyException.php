<?php

namespace App\Exceptions;

use Exception;

class InsufficientFacultyException extends Exception
{
    public function __construct(int $facultyCount, int $facultyWithAvailability)
    {
        parent::__construct(
            "Insufficient faculty: {$facultyCount} total, {$facultyWithAvailability} with availability"
        );
    }
}
