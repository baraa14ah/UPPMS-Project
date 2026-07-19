<?php

namespace App\Scheduling;

use Illuminate\Support\Str;

class Chromosome
{
    public string $id;
    public array $genes;
    public float $fitness;
    public ?FitnessBreakdown $fitnessBreakdown;
    public bool $isValid;
    public int $generation;

    public function __construct(array $genes = [], int $generation = 0)
    {
        $this->id = Str::uuid()->toString();
        $this->genes = $genes;
        $this->fitness = 0.0;
        $this->fitnessBreakdown = null;
        $this->isValid = true;
        $this->generation = $generation;
    }

    /** Get number of projects (genes) in this schedule. */
    public function getProjectCount(): int
    {
        return count($this->genes);
    }

    /** Get a gene by index. */
    public function getGene(int $index): ?Gene
    {
        return $this->genes[$index] ?? null;
    }

    /** Set a gene at index. */
    public function setGene(int $index, Gene $gene): void
    {
        $this->genes[$index] = $gene;
    }

    /** Get all committee member IDs across all genes. */
    public function getAllCommitteeMemberIds(): array
    {
        $ids = [];
        foreach ($this->genes as $gene) {
            $ids = array_merge($ids, $gene->getCommitteeMemberIds());
        }
        return $ids;
    }

    /** Count assignments per faculty member. */
    public function countAssignmentsPerFaculty(): array
    {
        $counts = [];
        foreach ($this->genes as $gene) {
            foreach ($gene->committeeMembers as $member) {
                $userId = $member['userId'];
                $counts[$userId] = ($counts[$userId] ?? 0) + 1;
            }
        }
        return $counts;
    }

    /** Lexicographic compare: fewer hard violations first, then higher fitness. */
    public static function compare(self $a, self $b): int
    {
        $aViolations = $a->fitnessBreakdown?->hardViolationCount ?? ($a->isValid ? 0 : PHP_INT_MAX);
        $bViolations = $b->fitnessBreakdown?->hardViolationCount ?? ($b->isValid ? 0 : PHP_INT_MAX);

        if ($aViolations !== $bViolations) {
            return $aViolations <=> $bViolations;
        }

        return $b->fitness <=> $a->fitness;
    }

    /** Set fitness and breakdown. */
    public function setFitness(FitnessBreakdown $breakdown): void
    {
        $this->fitnessBreakdown = $breakdown;
        $this->fitness = $breakdown->totalScore;
        $this->isValid = $breakdown->hardConstraintsPassed;
    }

    /** Clone the chromosome for crossover/mutation. */
    public function clone(): self
    {
        $clonedGenes = array_map(fn($gene) => $gene->clone(), $this->genes);
        $clone = new self($clonedGenes, $this->generation);
        $clone->fitness = $this->fitness;
        $clone->fitnessBreakdown = $this->fitnessBreakdown;
        $clone->isValid = $this->isValid;
        return $clone;
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'fitness' => round($this->fitness, 2),
            'isValid' => $this->isValid,
            'generation' => $this->generation,
            'projectCount' => $this->getProjectCount(),
            'assignments' => array_map(fn($gene) => $gene->toArray(), $this->genes),
        ];
    }
}
