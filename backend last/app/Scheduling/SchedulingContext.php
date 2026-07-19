<?php

namespace App\Scheduling;

use App\Models\AcademicStageConfig;
use App\Models\AvailableRoom;
use App\Models\Project;
use App\Models\User;
use App\Support\TrackStageHierarchy;
use Illuminate\Support\Collection;

class SchedulingContext
{
    public int $universityId;
    public int $stageId;
    public AcademicStageConfig $stage;
    public Collection $projects;
    public Collection $eligibleFaculty;
    public Collection $rooms;
    /** @var Collection<int, AvailableRoom> */
    public Collection $standardRooms;
    /** @var Collection<int, AvailableRoom> */
    public Collection $premiumRooms;
    public array $facultyAvailability;
    public array $allowedDefenseDays;
    public AlgorithmConfig $config;
    public ?\Illuminate\Support\Collection $predefinedCommittees = null;

    public function __construct(
        int $universityId,
        int $stageId,
        AcademicStageConfig $stage,
        Collection $projects,
        Collection $eligibleFaculty,
        Collection $rooms,
        array $facultyAvailability,
        AlgorithmConfig $config
    ) {
        $this->universityId = $universityId;
        $this->stageId = $stageId;
        $this->stage = $stage;
        $this->projects = $projects;
        $this->eligibleFaculty = $eligibleFaculty;
        $this->rooms = $rooms;
        $this->standardRooms = $rooms->where('is_premium', false)->values();
        $this->premiumRooms = $rooms->where('is_premium', true)->values();
        $this->facultyAvailability = $facultyAvailability;
        $this->allowedDefenseDays = $stage->getAllowedDefenseDaysList();
        $this->config = $config;
    }

    public function getCommitteeSize(): int
    {
        return $this->stage->default_committee_size ?? 3;
    }

    public function getStageDuration(): int
    {
        return $this->stage->duration_minutes ?? 60;
    }

    public function getProjectCount(): int
    {
        return $this->projects->count();
    }

    public function getFacultyCount(): int
    {
        return $this->eligibleFaculty->count();
    }

    public function getRoomCount(): int
    {
        return $this->rooms->count();
    }

    public function getRooms(): Collection
    {
        return $this->rooms;
    }

    /** Rooms allowed for a project based on its track position (premium = last phase + last step). */
    public function getRoomsForProject(?Project $project = null): Collection
    {
        if ($project && $this->projectUsesPremiumRooms($project)) {
            if ($this->premiumRooms->isNotEmpty()) {
                return $this->premiumRooms;
            }

            return $this->rooms;
        }

        if ($this->standardRooms->isNotEmpty()) {
            return $this->standardRooms;
        }

        $nonPremium = $this->rooms->where('is_premium', false)->values();

        return $nonPremium->isNotEmpty() ? $nonPremium : $this->rooms;
    }

    public function getRoomsForProjectId(?int $projectId): Collection
    {
        if (!$projectId) {
            return $this->getRoomsForProject(null);
        }

        $project = $this->projects->firstWhere('id', $projectId);

        return $this->getRoomsForProject($project instanceof Project ? $project : null);
    }

    public function projectUsesPremiumRooms(Project $project): bool
    {
        $project->loadMissing('proposal.trackStage.track.stages');
        $step = $project->proposal?->trackStage;

        return $step ? TrackStageHierarchy::isLastStepOfLastPhase($step) : false;
    }

    /** @return array<int, string> */
    public function getRoomNamesMap(): array
    {
        return $this->rooms->pluck('name', 'id')->all();
    }

    public function getFacultyById(int $userId): ?User
    {
        return $this->eligibleFaculty->firstWhere('id', $userId);
    }

    public function getFacultyAvailability(int $userId): array
    {
        return $this->facultyAvailability[$userId] ?? [];
    }

    public function isDayAllowed(int $dayOfWeek): bool
    {
        return in_array($dayOfWeek, $this->allowedDefenseDays, true);
    }

    public function isFacultyAvailable(int $userId, TimeSlot $slot): bool
    {
        if (!$this->isDayAllowed($slot->dayOfWeek)) {
            return false;
        }

        $availability = $this->getFacultyAvailability($userId);

        foreach ($availability as $window) {
            if ($window['day_of_week'] === $slot->dayOfWeek) {
                if ($window['start_time'] <= $slot->startTime && $window['end_time'] >= $slot->endTime) {
                    return true;
                }
            }
        }

        return false;
    }

    public function getAvailableTimeSlots(): array
    {
        $slots = [];
        $duration = $this->getStageDuration();

        foreach ($this->facultyAvailability as $windows) {
            foreach ($windows as $window) {
                if (!$this->isDayAllowed($window['day_of_week'])) {
                    continue;
                }

                $startTime = strtotime($window['start_time']);
                $endTime = strtotime($window['end_time']);
                $slotDuration = $duration * 60;

                while ($startTime + $slotDuration <= $endTime) {
                    $slotKey = $window['day_of_week'] . '_' . date('H:i:s', $startTime);
                    if (!isset($slots[$slotKey])) {
                        $slots[$slotKey] = TimeSlot::fromDuration(
                            $window['day_of_week'],
                            date('H:i:s', $startTime),
                            $duration
                        );
                    }
                    $startTime += $slotDuration;
                }
            }
        }

        return array_values($slots);
    }

    public function getSlotsForCommittee(array $committeeMembers): array
    {
        if (empty($committeeMembers)) {
            return [];
        }

        return array_values(array_filter(
            $this->getAvailableTimeSlots(),
            function (TimeSlot $slot) use ($committeeMembers) {
                foreach ($committeeMembers as $member) {
                    if (!$this->isFacultyAvailable($member['userId'], $slot)) {
                        return false;
                    }
                }

                return true;
            }
        ));
    }

    public function pickRandomRoom(?Project $project = null): ?AvailableRoom
    {
        $rooms = $this->getRoomsForProject($project);
        if ($rooms->isEmpty()) {
            return null;
        }

        return $rooms->random();
    }

    public function pickRandomRoomForProjectId(?int $projectId): ?AvailableRoom
    {
        $rooms = $this->getRoomsForProjectId($projectId);
        if ($rooms->isEmpty()) {
            return null;
        }

        return $rooms->random();
    }

    public function needsDynamicReduction(): bool
    {
        if ($this->config->useCommittees) {
            return false;
        }

        $projectCount = $this->getProjectCount();
        $facultyCount = $this->getFacultyCount();
        $minFacultyNeeded = $projectCount * 2;

        return $facultyCount < $minFacultyNeeded;
    }

    public function usesPredefinedCommittees(): bool
    {
        return $this->config->useCommittees
            && $this->predefinedCommittees
            && $this->predefinedCommittees->isNotEmpty();
    }
}
