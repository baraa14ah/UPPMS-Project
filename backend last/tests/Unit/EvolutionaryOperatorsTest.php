<?php

namespace Tests\Unit;

use App\Scheduling\Chromosome;
use App\Scheduling\EvolutionaryOperators;
use App\Scheduling\Gene;
use App\Scheduling\TimeSlot;
use Tests\TestCase;

class EvolutionaryOperatorsTest extends TestCase
{
    private EvolutionaryOperators $operators;

    protected function setUp(): void
    {
        parent::setUp();
        $this->operators = new EvolutionaryOperators();
    }

    /** @test */
    public function tournament_select_returns_chromosome_from_population(): void
    {
        $population = $this->createTestPopulation(10);

        $selected = $this->operators->tournamentSelect($population, 3);

        $this->assertInstanceOf(Chromosome::class, $selected);
        $this->assertContains($selected, $population);
    }

    /** @test */
    public function crossover_produces_two_offspring(): void
    {
        $parent1 = $this->createTestChromosome(5, 100);
        $parent2 = $this->createTestChromosome(5, 50);

        $offspring = $this->operators->crossover($parent1, $parent2);

        $this->assertCount(2, $offspring);
        $this->assertInstanceOf(Chromosome::class, $offspring[0]);
        $this->assertInstanceOf(Chromosome::class, $offspring[1]);
        $this->assertCount(5, $offspring[0]->genes);
        $this->assertCount(5, $offspring[1]->genes);
    }

    /** @test */
    public function crossover_offspring_have_incremented_generation(): void
    {
        $parent1 = $this->createTestChromosome(3, 100);
        $parent1->generation = 5;
        $parent2 = $this->createTestChromosome(3, 50);
        $parent2->generation = 7;

        $offspring = $this->operators->crossover($parent1, $parent2);

        $this->assertEquals(8, $offspring[0]->generation);
        $this->assertEquals(8, $offspring[1]->generation);
    }

    /** Create a test population. */
    private function createTestPopulation(int $size): array
    {
        $population = [];
        for ($i = 0; $i < $size; $i++) {
            $population[] = $this->createTestChromosome(3, rand(0, 1000));
        }

        return $population;
    }

    /** Create a test chromosome with specified fitness. */
    private function createTestChromosome(int $geneCount, float $fitness): Chromosome
    {
        $genes = [];
        for ($i = 0; $i < $geneCount; $i++) {
            $genes[] = new Gene(
                projectId: $i + 1,
                projectTitle: 'Project ' . ($i + 1),
                supervisorId: 100 + $i,
                supervisorName: 'Supervisor ' . ($i + 1),
                committeeMembers: [
                    ['userId' => 200 + $i, 'name' => 'Faculty A', 'email' => 'a@test.com'],
                    ['userId' => 201 + $i, 'name' => 'Faculty B', 'email' => 'b@test.com'],
                ],
                timeSlot: new TimeSlot(0, '09:00:00', '10:00:00')
            );
        }

        $chromosome = new Chromosome($genes, 0);
        $chromosome->fitness = $fitness;

        return $chromosome;
    }
}
