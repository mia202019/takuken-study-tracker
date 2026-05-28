import type { AppData, StudyTask } from '../types';
import { defaultExamSettings, seedInitialData } from './defaults';
import { createId } from '../utils/id';

const STORAGE_KEY = 'takuken-study-tracker:v1';

export const loadData = (): AppData => {
  if (typeof window === 'undefined') return seedInitialData();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedInitialData();
    saveData(seeded);
    return seeded;
  }

  try {
    return normalizeData(JSON.parse(raw)) ?? seedInitialData();
  } catch {
    const seeded = seedInitialData();
    saveData(seeded);
    return seeded;
  }
};

const normalizeTask = (task: Partial<StudyTask>): StudyTask => {
  const scheduledDate = task.scheduledDate ?? task.date ?? new Date().toISOString().slice(0, 10);
  return {
    id: task.id ?? createId(),
    scheduledDate,
    originalDate: task.originalDate,
    type: task.type ?? 'memo',
    subjectId: task.subjectId,
    topicId: task.topicId,
    title: task.title ?? 'メモ',
    estimatedMinutes: task.estimatedMinutes ?? 10,
    priority: task.priority ?? 'medium',
    status: task.status ?? 'todo',
    createdAt: task.createdAt ?? new Date().toISOString(),
    carriedOverCount: task.carriedOverCount ?? 0,
    isFixedDateTask: task.isFixedDateTask ?? false,
    generated: task.generated,
  };
};

export const normalizeData = (input: unknown): AppData | null => {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<AppData>;
  if (!Array.isArray(candidate.subjects) || !Array.isArray(candidate.topics)) return null;

  const seeded = seedInitialData();
  const candidateTasks = Array.isArray(candidate.tasks) ? candidate.tasks.map((task) => normalizeTask(task)) : [];
  const taskIds = new Set(candidateTasks.map((task) => task.id));
  const mergedTasks = [
    ...candidateTasks,
    ...seeded.tasks.filter((task) => !taskIds.has(task.id)),
  ];

  return {
    subjects: candidate.subjects,
    topics: candidate.topics,
    tasks: mergedTasks,
    studyLogs: Array.isArray(candidate.studyLogs) ? candidate.studyLogs : seeded.studyLogs,
    questionLogs: Array.isArray(candidate.questionLogs) ? candidate.questionLogs : seeded.questionLogs,
    reviewItems: Array.isArray(candidate.reviewItems) ? candidate.reviewItems : seeded.reviewItems,
    materials: Array.isArray(candidate.materials) ? candidate.materials : seeded.materials,
    materialUnits: Array.isArray(candidate.materialUnits) ? candidate.materialUnits : seeded.materialUnits,
    resources: Array.isArray(candidate.resources) ? candidate.resources : seeded.resources,
    settings: { ...defaultExamSettings, ...(candidate.settings ?? {}) },
  };
};

export const saveData = (data: AppData) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const resetData = () => {
  const seeded = seedInitialData();
  saveData(seeded);
  return seeded;
};
