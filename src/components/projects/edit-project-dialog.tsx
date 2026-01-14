/**
 * Edit Project Dialog Component
 *
 * Modal dialog for editing project settings including name, description,
 * language, and research-specific fields like goals, context, deadline, etc.
 * Uses Shadcn Dialog and Radix Select for consistent UX and accessibility.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from '@/lib/constants/languages';
import { MetadataForm } from '@/components/metadata';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    description: string | null;
    language: string;
    workspaceId?: string; // Optional - needed for custom fields tab
    // Project Settings
    projectType?: string | null;
    goals?: string | null;
    context?: string | null;
    deadline?: string | Date | null;
    stakeholder?: string | null;
    researchQuestions?: string | null;
    targetParticipants?: number | null;
    recruitmentCriteria?: string | null;
  };
  /** Callback fired after successful update - use to refresh data */
  onSuccess?: () => void;
}

export function EditProjectDialog({ isOpen, onClose, project, onSuccess }: EditProjectDialogProps) {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [language, setLanguage] = useState<LanguageCode>(
    (project.language as LanguageCode) || DEFAULT_LANGUAGE
  );

  // Research Setup
  const [projectType, setProjectType] = useState(project.projectType || '');
  const [goals, setGoals] = useState(project.goals || '');
  const [context, setContext] = useState(project.context || '');
  const [researchQuestions, setResearchQuestions] = useState(project.researchQuestions || '');

  // Project Management
  const [deadline, setDeadline] = useState(
    project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
  );
  const [stakeholder, setStakeholder] = useState(project.stakeholder || '');
  const [targetParticipants, setTargetParticipants] = useState(
    project.targetParticipants?.toString() || ''
  );
  const [recruitmentCriteria, setRecruitmentCriteria] = useState(project.recruitmentCriteria || '');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'basic' | 'research' | 'management' | 'custom'
  >('basic');

  // Reset form when dialog opens with new project
  useEffect(() => {
    if (isOpen) {
      // Basic Info
      setName(project.name);
      setDescription(project.description || '');
      setLanguage((project.language as LanguageCode) || DEFAULT_LANGUAGE);

      // Research Setup
      setProjectType(project.projectType || '');
      setGoals(project.goals || '');
      setContext(project.context || '');
      setResearchQuestions(project.researchQuestions || '');

      // Project Management
      setDeadline(project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '');
      setStakeholder(project.stakeholder || '');
      setTargetParticipants(project.targetParticipants?.toString() || '');
      setRecruitmentCriteria(project.recruitmentCriteria || '');

      setError(null);
      setActiveSection('basic');
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          language,
          projectType: projectType || null,
          goals: goals || null,
          context: context || null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          stakeholder: stakeholder || null,
          researchQuestions: researchQuestions || null,
          targetParticipants: targetParticipants ? parseInt(targetParticipants, 10) : null,
          recruitmentCriteria: recruitmentCriteria || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update project');
      }

      onClose();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'research', label: 'Research Setup' },
    { id: 'management', label: 'Management' },
    { id: 'custom', label: 'Custom Fields' },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>

        {/* Section Tabs */}
        <div className="-mx-6 flex gap-1 border-b border-gray-800 px-6">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'border-accent-primary border-b-2 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(85vh - 200px)' }}
        >
          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label htmlFor="edit-name" className="mb-2 block text-sm font-medium text-white">
                  Project Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., User Research Q1 2024"
                  required
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                  autoFocus
                />
              </div>

              {/* Description Input */}
              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your research project..."
                  rows={3}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Language Dropdown - Using Radix Select */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Default Language
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  Language for transcribing sources in this project
                </p>
                <Select value={language} onValueChange={(val) => setLanguage(val as LanguageCode)}>
                  <SelectTrigger className="w-full border-gray-800 bg-gray-950 text-white">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-800 bg-gray-950">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang.code}
                        value={lang.code}
                        className="text-gray-300 focus:bg-gray-800 focus:text-white"
                      >
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Research Setup Section */}
          {activeSection === 'research' && (
            <div className="space-y-4">
              {/* Project Type */}
              <div>
                <label
                  htmlFor="edit-project-type"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Project Type / Methodology
                </label>
                <input
                  id="edit-project-type"
                  type="text"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  placeholder="e.g., Usability Testing, JTBD Interview, Diary Study"
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Goals */}
              <div>
                <label htmlFor="edit-goals" className="mb-2 block text-sm font-medium text-white">
                  Research Goals
                </label>
                <textarea
                  id="edit-goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What do you want to achieve with this research?"
                  rows={3}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Context */}
              <div>
                <label htmlFor="edit-context" className="mb-2 block text-sm font-medium text-white">
                  Study Context
                </label>
                <textarea
                  id="edit-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Background information, business context, previous findings..."
                  rows={3}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Research Questions */}
              <div>
                <label
                  htmlFor="edit-research-questions"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Key Research Questions
                </label>
                <textarea
                  id="edit-research-questions"
                  value={researchQuestions}
                  onChange={(e) => setResearchQuestions(e.target.value)}
                  placeholder="The main questions this research aims to answer..."
                  rows={4}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>
            </div>
          )}

          {/* Project Management Section */}
          {activeSection === 'management' && (
            <div className="space-y-4">
              {/* Stakeholder */}
              <div>
                <label
                  htmlFor="edit-stakeholder"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Stakeholder / Client
                </label>
                <input
                  id="edit-stakeholder"
                  type="text"
                  value={stakeholder}
                  onChange={(e) => setStakeholder(e.target.value)}
                  placeholder="e.g., Product Team, CEO, Client: Acme Corp"
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label
                  htmlFor="edit-deadline"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Deadline
                </label>
                <input
                  id="edit-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Target Participants */}
              <div>
                <label
                  htmlFor="edit-target-participants"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Target Participants
                </label>
                <input
                  id="edit-target-participants"
                  type="number"
                  min="1"
                  value={targetParticipants}
                  onChange={(e) => setTargetParticipants(e.target.value)}
                  placeholder="Number of participants needed"
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Recruitment Criteria */}
              <div>
                <label
                  htmlFor="edit-recruitment-criteria"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Recruitment Criteria
                </label>
                <textarea
                  id="edit-recruitment-criteria"
                  value={recruitmentCriteria}
                  onChange={(e) => setRecruitmentCriteria(e.target.value)}
                  placeholder="Who should participate? What criteria must they meet?"
                  rows={4}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>
            </div>
          )}

          {/* Custom Fields Section */}
          {activeSection === 'custom' && (
            <div className="space-y-4">
              {project.workspaceId ? (
                <MetadataForm
                  entityType="PROJECT"
                  entityId={project.id}
                  parentId={project.workspaceId}
                  showCard={false}
                  configureUrl={`/settings/workspace?expand=${project.workspaceId}`}
                />
              ) : (
                <div className="py-8 text-center">
                  <Settings2 className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                  <p className="text-sm text-gray-400">
                    Custom fields are available in the full settings page.
                  </p>
                  <Link
                    href={`/projects/${project.id}/settings`}
                    className="text-accent-primary mt-2 inline-block text-sm hover:underline"
                    onClick={handleClose}
                  >
                    Open Project Settings
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions - hide on custom fields tab since it has auto-save */}
          {activeSection !== 'custom' && (
            <DialogFooter className="mt-6 gap-3 sm:gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
