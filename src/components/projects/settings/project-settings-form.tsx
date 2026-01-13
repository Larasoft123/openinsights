'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from '@/lib/constants/languages';
import { MetadataFieldsManager, MetadataForm } from '@/components/metadata';

interface ProjectSettingsFormProps {
  projectId: string;
  workspaceId: string;
  initialData: {
    name: string;
    description: string | null;
    language: string;
    projectType?: string | null;
    goals?: string | null;
    context?: string | null;
    deadline?: Date | null;
    stakeholder?: string | null;
    researchQuestions?: string | null;
    targetParticipants?: number | null;
    recruitmentCriteria?: string | null;
  };
}

export function ProjectSettingsForm({
  projectId,
  workspaceId,
  initialData,
}: ProjectSettingsFormProps) {
  const router = useRouter();
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Basic Info
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description || '');
  const [language, setLanguage] = useState<LanguageCode>(
    (initialData.language as LanguageCode) || DEFAULT_LANGUAGE
  );
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  // Research Setup
  const [projectType, setProjectType] = useState(initialData.projectType || '');
  const [goals, setGoals] = useState(initialData.goals || '');
  const [context, setContext] = useState(initialData.context || '');
  const [researchQuestions, setResearchQuestions] = useState(initialData.researchQuestions || '');

  // Project Management
  const [deadline, setDeadline] = useState(
    initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : ''
  );
  const [stakeholder, setStakeholder] = useState(initialData.stakeholder || '');
  const [targetParticipants, setTargetParticipants] = useState(
    initialData.targetParticipants?.toString() || ''
  );
  const [recruitmentCriteria, setRecruitmentCriteria] = useState(
    initialData.recruitmentCriteria || ''
  );

  // Save function
  const saveSettings = useCallback(async () => {
    // Don't save if name is empty
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    // Show loading toast
    toastIdRef.current = toast.loading('Saving...');

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
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

      toast.success('Saved', { id: toastIdRef.current });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save', {
        id: toastIdRef.current,
      });
    }
  }, [
    projectId,
    name,
    description,
    language,
    projectType,
    goals,
    context,
    deadline,
    stakeholder,
    researchQuestions,
    targetParticipants,
    recruitmentCriteria,
    router,
  ]);

  // Debounced auto-save effect
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save (800ms delay)
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings();
    }, 800);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    name,
    description,
    language,
    projectType,
    goals,
    context,
    deadline,
    stakeholder,
    researchQuestions,
    targetParticipants,
    recruitmentCriteria,
    saveSettings,
  ]);

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-white';
  const descClass = 'text-xs text-gray-500 mb-2';

  return (
    <div className="space-y-6 pb-8">
      {/* Basic Information Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Basic Information</CardTitle>
          <CardDescription>Project name, description, and default language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className={labelClass}>
              Project Name *
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User Research Q1 2024"
              required
              className={inputClass}
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your research project..."
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Language Dropdown */}
          <div>
            <label htmlFor="language" className={labelClass}>
              Default Language
            </label>
            <p className={descClass}>Language for transcribing sources in this project</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className={`${inputClass} flex items-center justify-between`}
              >
                <span>
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'Select language'}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {languageDropdownOpen && (
                <div className="absolute right-0 left-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setLanguageDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                        language === lang.code
                          ? 'bg-accent-primary/20 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Research Setup Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Research Setup</CardTitle>
          <CardDescription>Define your research methodology and objectives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Type */}
          <div>
            <label htmlFor="projectType" className={labelClass}>
              Project Type / Methodology
            </label>
            <Input
              id="projectType"
              type="text"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              placeholder="e.g., Usability Testing, JTBD Interview, Diary Study"
              className={inputClass}
            />
          </div>

          {/* Goals */}
          <div>
            <label htmlFor="goals" className={labelClass}>
              Research Goals
            </label>
            <textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="What do you want to achieve with this research?"
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Context */}
          <div>
            <label htmlFor="context" className={labelClass}>
              Study Context
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Background information, business context, previous findings..."
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Research Questions */}
          <div>
            <label htmlFor="researchQuestions" className={labelClass}>
              Key Research Questions
            </label>
            <textarea
              id="researchQuestions"
              value={researchQuestions}
              onChange={(e) => setResearchQuestions(e.target.value)}
              placeholder="The main questions this research aims to answer..."
              rows={4}
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Management Card */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Project Management</CardTitle>
          <CardDescription>Timeline, stakeholders, and participant targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stakeholder */}
          <div>
            <label htmlFor="stakeholder" className={labelClass}>
              Stakeholder / Client
            </label>
            <Input
              id="stakeholder"
              type="text"
              value={stakeholder}
              onChange={(e) => setStakeholder(e.target.value)}
              placeholder="e.g., Product Team, CEO, Client: Acme Corp"
              className={inputClass}
            />
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className={labelClass}>
              Deadline
            </label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Target Participants */}
          <div>
            <label htmlFor="targetParticipants" className={labelClass}>
              Target Participants
            </label>
            <Input
              id="targetParticipants"
              type="number"
              min="1"
              value={targetParticipants}
              onChange={(e) => setTargetParticipants(e.target.value)}
              placeholder="Number of participants needed"
              className={inputClass}
            />
          </div>

          {/* Recruitment Criteria */}
          <div>
            <label htmlFor="recruitmentCriteria" className={labelClass}>
              Recruitment Criteria
            </label>
            <textarea
              id="recruitmentCriteria"
              value={recruitmentCriteria}
              onChange={(e) => setRecruitmentCriteria(e.target.value)}
              placeholder="Who should participate? What criteria must they meet?"
              rows={4}
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Custom Metadata (defined at workspace level) */}
      <MetadataForm
        entityType="PROJECT"
        entityId={projectId}
        parentId={workspaceId}
        title="Custom Project Fields"
        description="Additional fields defined at the workspace level"
        configureUrl={`/settings/workspace?expand=${workspaceId}`}
      />

      {/* Source Metadata Fields Manager (defines fields for sources in this project) */}
      <div id="source-metadata">
        <MetadataFieldsManager
          entityType="SOURCE"
          parentId={projectId}
          title="Source Metadata Fields"
          description="Define custom fields that can be filled for each source in this project"
        />
      </div>
    </div>
  );
}
