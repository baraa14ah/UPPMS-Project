<?php

namespace App\Exceptions;

use Exception;

class InvalidStageException extends Exception
{
    public function __construct(int $stageId, int $universityId)
    {
        parent::__construct(
            "Stage {$stageId} not found for university {$universityId}"
        );
    }
}
