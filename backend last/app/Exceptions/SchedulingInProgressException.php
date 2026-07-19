<?php

namespace App\Exceptions;

use Exception;

class SchedulingInProgressException extends Exception
{
    public function __construct(int $universityId, int $stageId)
    {
        parent::__construct(
            "Scheduling is already in progress for university {$universityId}, stage {$stageId}"
        );
    }
}
