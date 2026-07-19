<?php

namespace App\Scheduling;

class Gene
{
    public int $projectId;
    public string $projectTitle;
    public int $supervisorId;
    public string $supervisorName;
    public array $committeeMembers;
    public ?TimeSlot $timeSlot;
    public ?int $roomId;
    public ?int $committeeId;

    public function __construct(
        int $projectId,
        string $projectTitle,
        int $supervisorId,
        string $supervisorName,
        array $committeeMembers = [],
        ?TimeSlot $timeSlot = null,
        ?int $roomId = null,
        ?int $committeeId = null
    ) {
        $this->projectId = $projectId;
        $this->projectTitle = $projectTitle;
        $this->supervisorId = $supervisorId;
        $this->supervisorName = $supervisorName;
        $this->committeeMembers = $committeeMembers;
        $this->timeSlot = $timeSlot;
        $this->roomId = $roomId;
        $this->committeeId = $committeeId;
    }

    /** Check if supervisor is in the committee (hard constraint violation). */
    public function hasSupervisorOnCommittee(): bool
    {
        foreach ($this->committeeMembers as $member) {
            if ($member['userId'] === $this->supervisorId) {
                return true;
            }
        }
        return false;
    }

    /** Get committee member user IDs. */
    public function getCommitteeMemberIds(): array
    {
        return array_column($this->committeeMembers, 'userId');
    }

    /** Get committee size. */
    public function getCommitteeSize(): int
    {
        return count($this->committeeMembers);
    }

    /** Set committee members. */
    public function setCommitteeMembers(array $members): void
    {
        $this->committeeMembers = $members;
    }

    /** Replace a committee member at index. */
    public function replaceCommitteeMember(int $index, array $newMember): void
    {
        if (isset($this->committeeMembers[$index])) {
            $this->committeeMembers[$index] = $newMember;
        }
    }

    /** Clone the gene for mutation. */
    public function clone(): self
    {
        return new self(
            $this->projectId,
            $this->projectTitle,
            $this->supervisorId,
            $this->supervisorName,
            $this->committeeMembers,
            $this->timeSlot?->clone(),
            $this->roomId,
            $this->committeeId
        );
    }

    /** Convert to array for JSON serialization. */
    public function toArray(?array $roomNames = null): array
    {
        return [
            'projectId' => $this->projectId,
            'projectTitle' => $this->projectTitle,
            'supervisorId' => $this->supervisorId,
            'supervisorName' => $this->supervisorName,
            'committeeMembers' => $this->committeeMembers,
            'committeeId' => $this->committeeId,
            'committeeName' => $this->committeeMembers[0]['committeeName'] ?? null,
            'scheduledDay' => $this->timeSlot?->getDayName(),
            'scheduledTime' => $this->timeSlot?->getTimeRange(),
            'roomId' => $this->roomId,
            'roomName' => $this->roomId && $roomNames
                ? ($roomNames[$this->roomId] ?? null)
                : null,
        ];
    }
}
