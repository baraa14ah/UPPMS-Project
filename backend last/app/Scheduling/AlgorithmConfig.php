<?php

namespace App\Scheduling;

class AlgorithmConfig
{
    public int $populationSize;
    public int $maxGenerations;
    public float $mutationRate;
    public float $elitismRate;
    public int $tournamentSize;
    public float $maxTimeSeconds;
    public int $minRestMinutes;
    public bool $useCommittees;

    public function __construct(
        int $populationSize = 100,
        int $maxGenerations = 50,
        float $mutationRate = 0.10,
        float $elitismRate = 0.05,
        int $tournamentSize = 3,
        float $maxTimeSeconds = 30.0,
        int $minRestMinutes = 30,
        bool $useCommittees = false
    ) {
        $this->populationSize = $populationSize;
        $this->maxGenerations = $maxGenerations;
        $this->mutationRate = $mutationRate;
        $this->elitismRate = $elitismRate;
        $this->tournamentSize = $tournamentSize;
        $this->maxTimeSeconds = $maxTimeSeconds;
        $this->minRestMinutes = $minRestMinutes;
        $this->useCommittees = $useCommittees;
    }

    /** Get number of elite chromosomes to preserve each generation. */
    public function getEliteCount(): int
    {
        return (int) ceil($this->populationSize * $this->elitismRate);
    }
}
