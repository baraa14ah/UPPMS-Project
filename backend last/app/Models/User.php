<?php

namespace App\Models;

use App\Models\Concerns\HasUniversityVisibility;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUniversityVisibility;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'university_id',
        'track_id',
        'student_number',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /** Returns whether the user account is active (includes graduated alumni). */
    public function isActive(): bool
    {
        return in_array($this->status, ['active', 'graduated'], true);
    }

    /** Returns whether the student has completed the full academic track. */
    public function isGraduated(): bool
    {
        return $this->status === 'graduated';
    }

    /** Returns whether the user account is pending approval. */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /** Returns whether the user account was rejected. */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /** Returns whether the user has the super_admin role. */
    public function isSuperAdmin(): bool
    {
        return $this->role && $this->role->name === 'super_admin';
    }

    /** Returns whether the user is a university or platform admin. */
    public function isAdmin(): bool
    {
        $role = strtolower($this->role?->name ?? '');

        return in_array($role, ['admin', 'super_admin'], true);
    }

    /** Returns the role assigned to this user. */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /** Returns the university this user belongs to. */
    public function university()
    {
        return $this->belongsTo(University::class);
    }

    /** Returns projects where this user is a member. */
    public function projects()
    {
        return $this->belongsToMany(Project::class, 'project_members', 'student_id', 'project_id')
            ->withPivot('status')
            ->withTimestamps();
    }

    /** Returns tasks assigned to this user. */
    public function assignedTasks()
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    /** Returns projects supervised by this user. */
    public function supervisedProjects()
    {
        return $this->hasMany(Project::class, 'supervisor_id');
    }

    /** @deprecated Use projects(); correct table is project_members. */
    public function projectsAsMember()
    {
        return $this->projects();
    }

    /** Returns the profile record for this user. */
    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    /** Returns AI ideation bookmarks saved by this student. */
    public function bookmarkedIdeas()
    {
        return $this->hasMany(BookmarkedIdea::class);
    }

    /** Returns AI ideation request logs for this student. */
    public function ideationRequests()
    {
        return $this->hasMany(IdeationRequest::class);
    }

    /** Returns weekly committee availability windows for this supervisor. */
    public function availabilities()
    {
        return $this->hasMany(DoctorAvailability::class);
    }

    /** Returns project proposals submitted by this student. */
    public function submittedProposals()
    {
        return $this->hasMany(ProjectProposal::class, 'student_id');
    }

    /** Returns project proposals addressed to this supervisor. */
    public function receivedProposals()
    {
        return $this->hasMany(ProjectProposal::class, 'requested_supervisor_id');
    }

    /** Returns the academic track assigned to this student. */
    public function track()
    {
        return $this->belongsTo(Track::class);
    }

    /** Returns progress records for this student across track stages. */
    public function studentProgress()
    {
        return $this->hasMany(StudentProgress::class, 'student_id');
    }

    /** Returns the latest in-progress or most recent progress for the student's track. */
    public function getCurrentProgress(): ?StudentProgress
    {
        if (!$this->track_id) {
            return null;
        }

        return $this->studentProgress()
            ->where('track_id', $this->track_id)
            ->whereIn('status', ['in_progress', 'passed'])
            ->orderByDesc('updated_at')
            ->first();
    }

    /** Returns defense committees this supervisor belongs to. */
    public function committees()
    {
        return $this->belongsToMany(Committee::class, 'committee_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    /** Returns committees where this supervisor is chair. */
    public function chairedCommittees()
    {
        return $this->committees()->wherePivot('role', 'chair');
    }
}
