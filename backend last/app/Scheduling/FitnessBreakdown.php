<?php

namespace App\Scheduling;

class FitnessBreakdown
{
    public float $totalScore;
    public bool $hardConstraintsPassed;
    public float $workloadBalanceScore;
    public float $restPeriodScore;
    public float $committeeSizeScore;
    public float $compactnessScore;
    public int $hardViolationCount = 0;
    public array $violations;
    public array $recommendations;

    public function __construct(
        float $totalScore = 0.0,
        bool $hardConstraintsPassed = true,
        float $workloadBalanceScore = 0.0,
        float $restPeriodScore = 0.0,
        float $committeeSizeScore = 0.0,
        float $compactnessScore = 0.0,
        array $violations = [],
        array $recommendations = []
    ) {
        $this->totalScore = $totalScore;
        $this->hardConstraintsPassed = $hardConstraintsPassed;
        $this->workloadBalanceScore = $workloadBalanceScore;
        $this->restPeriodScore = $restPeriodScore;
        $this->committeeSizeScore = $committeeSizeScore;
        $this->compactnessScore = $compactnessScore;
        $this->violations = $violations;
        $this->recommendations = $recommendations;
    }

    /** Create a zero-fitness breakdown for hard constraint violation. */
    public static function zero(array $violations): self
    {
        return new self(
            totalScore: 0.0,
            hardConstraintsPassed: false,
            violations: $violations
        );
    }

    /** Add a violation to the breakdown. */
    public function addViolation(Violation $violation): void
    {
        $this->violations[] = $violation;
        if ($violation->isHard()) {
            $this->hardConstraintsPassed = false;
            $this->hardViolationCount++;
        }
    }

    /** Add a recommendation. */
    public function addRecommendation(string $recommendation): void
    {
        $this->recommendations[] = $recommendation;
    }

    /** Calculate total score from component scores minus hard-constraint penalties. */
    public function calculateTotal(int $penaltyPerHardViolation = 5000): void
    {
        $softTotal = $this->workloadBalanceScore
            + $this->restPeriodScore
            + $this->committeeSizeScore
            + $this->compactnessScore;

        $penalty = $this->hardViolationCount * $penaltyPerHardViolation;
        $this->totalScore = max(0.0, $softTotal - $penalty);
    }

    /** Convert to array for JSON serialization. */
    public function toArray(): array
    {
        return [
            'totalScore' => round($this->totalScore, 2),
            'hardViolationCount' => $this->hardViolationCount,
            'hardConstraintsPassed' => $this->hardConstraintsPassed,
            'workloadBalanceScore' => round($this->workloadBalanceScore, 2),
            'restPeriodScore' => round($this->restPeriodScore, 2),
            'committeeSizeScore' => round($this->committeeSizeScore, 2),
            'compactnessScore' => round($this->compactnessScore, 2),
            'violations' => array_map(fn($v) => $v->toArray(), $this->violations),
            'recommendations' => $this->recommendations,
        ];
    }
}
