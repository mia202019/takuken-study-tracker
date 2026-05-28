import type { AppData, ExamSettings, MaterialUnit, Priority, QuestionLog, ReviewItem, StudyLog, StudyTask, Topic } from '../types';
import { taskTypeLabels } from './labels';

export const todayString = (date = new Date()) => toDateString(date);

export const toDateString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const addDays = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
};

export const defaultAvailableMinutes = (dateString: string) => {
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return day === 0 || day === 6 ? 120 : 90;
};

export const availableMinutesForDate = (dateString: string, settings: ExamSettings) => {
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return day === 0 || day === 6 ? settings.weekendAvailableMinutes : settings.weekdayAvailableMinutes;
};

export const taskScheduledDate = (task: StudyTask) => task.scheduledDate ?? task.date ?? todayString();

export const daysUntil = (fromDate: string, toDate: string) => {
  const from = new Date(`${fromDate}T00:00:00`).getTime();
  const to = new Date(`${toDate}T00:00:00`).getTime();
  return Math.max(0, Math.ceil((to - from) / 86_400_000));
};

export const getStudyPhase = (dateString: string) => {
  if (dateString < '2026-06-01') return { name: '準備期間', weeklyGoal: '学習開始の準備' };
  if (dateString <= '2026-06-30') return { name: 'Phase 1: Foundation', weeklyGoal: '全体像をつかみ、宅建業法から始める' };
  if (dateString <= '2026-07-31') return { name: 'Phase 2: Basic Practice', weeklyGoal: '基本演習と間違いノート作り' };
  if (dateString <= '2026-08-31') return { name: 'Phase 3: Past Question Practice', weeklyGoal: '論点別過去問と弱点復習' };
  if (dateString <= '2026-09-30') return { name: 'Phase 4: Exam Practice', weeklyGoal: '年度別過去問・模試・弱点補正' };
  if (dateString <= '2026-10-18') return { name: 'Phase 5: Final Review', weeklyGoal: '最終復習と間違いノート確認' };
  return { name: '試験後', weeklyGoal: 'おつかれさまでした' };
};

export const applicationStatusLabel = (settings: ExamSettings, dateString: string) => {
  if (settings.applicationStatus === 'completed') return '申込み済み';
  if (settings.applicationStatus === 'waiting_ticket') return '受験票待ち';
  if (settings.applicationStatus === 'final_check') return '試験直前';
  if (dateString >= '2026-07-01' && dateString <= '2026-07-31') return '申込み期間中';
  if (dateString >= '2026-10-01') return '試験直前';
  return '申込み前';
};

const increasePriority = (priority: Priority): Priority => {
  if (priority === 'low') return 'medium';
  return 'high';
};

export const byPriority = (a: { priority: string }, b: { priority: string }) => {
  const weight = { high: 0, medium: 1, low: 2 };
  return weight[a.priority as keyof typeof weight] - weight[b.priority as keyof typeof weight];
};

export const getSubject = (data: AppData, subjectId?: string) =>
  data.subjects.find((subject) => subject.id === subjectId);

export const getTopic = (data: AppData, topicId?: string) =>
  data.topics.find((topic) => topic.id === topicId);

export const getMaterial = (data: AppData, materialId?: string) =>
  data.materials.find((material) => material.id === materialId);

export const formatTopicLabel = (data: AppData, topicId?: string) => {
  const topic = getTopic(data, topicId);
  const subject = getSubject(data, topic?.subjectId);
  return topic && subject ? `${subject.name} / ${topic.name}` : '未設定';
};

const createGeneratedTask = (
  date: string,
  type: StudyTask['type'],
  title: string,
  estimatedMinutes: number,
  topic?: Topic,
): StudyTask => ({
  id: crypto.randomUUID(),
  scheduledDate: date,
  type,
  title,
  estimatedMinutes,
  priority: type === 'review' || type === 'mistake_review' ? 'high' : 'medium',
  status: 'todo',
  createdAt: new Date().toISOString(),
  carriedOverCount: 0,
  isFixedDateTask: false,
  generated: true,
  subjectId: topic?.subjectId,
  topicId: topic?.id,
});

export const generateTodayTasks = (
  data: AppData,
  date: string,
  availableMinutes = defaultAvailableMinutes(date),
) => {
  const manualTasks = data.tasks.filter((task) => taskScheduledDate(task) === date && !task.generated);
  const existingDoneGenerated = data.tasks.filter(
    (task) => taskScheduledDate(task) === date && task.generated && (task.status === 'done' || task.isFixedDateTask),
  );
  const tasks: StudyTask[] = [...manualTasks, ...existingDoneGenerated];
  let minutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  let hiddenReviewCount = 0;

  const pushIfFits = (task: StudyTask) => {
    if (minutes + task.estimatedMinutes <= availableMinutes || tasks.length === 0) {
      tasks.push(task);
      minutes += task.estimatedMinutes;
      return true;
    }
    return false;
  };

  const pendingReviews = data.reviewItems
    .filter((review) => review.status === 'pending' && review.dueDate <= date)
    .sort((a, b) => {
      const topicA = getTopic(data, a.topicId);
      const topicB = getTopic(data, b.topicId);
      return a.dueDate.localeCompare(b.dueDate) || byPriority(topicA ?? { priority: 'low' }, topicB ?? { priority: 'low' });
    });

  pendingReviews.forEach((review) => {
    const topic = getTopic(data, review.topicId);
    const label = formatTopicLabel(data, review.topicId);
    const added = pushIfFits(createGeneratedTask(date, 'review', `復習：${label}`, 15, topic));
    if (!added) hiddenReviewCount += 1;
  });

  const usedTopicIds = new Set(tasks.map((task) => task.topicId).filter(Boolean));
  const weakTopic = data.topics
    .filter((topic) => topic.understandingLevel <= 2 && !usedTopicIds.has(topic.id))
    .sort((a, b) => byPriority(a, b) || a.understandingLevel - b.understandingLevel)[0];

  if (weakTopic) {
    pushIfFits(createGeneratedTask(date, 'new_learning', `弱点補強：${formatTopicLabel(data, weakTopic.id)}`, 25, weakTopic));
    usedTopicIds.add(weakTopic.id);
  }

  const unfinishedTopic = data.topics
    .filter((topic) => topic.priority === 'high' && topic.understandingLevel < 4 && !usedTopicIds.has(topic.id))
    .sort((a, b) => a.understandingLevel - b.understandingLevel)[0];

  if (unfinishedTopic) {
    pushIfFits(createGeneratedTask(date, 'new_learning', `新規学習：${formatTopicLabel(data, unfinishedTopic.id)}`, 30, unfinishedTopic));
    usedTopicIds.add(unfinishedTopic.id);
  }

  const questionTopic = data.topics
    .filter((topic) => !usedTopicIds.has(topic.id))
    .sort((a, b) => byPriority(a, b) || a.understandingLevel - b.understandingLevel)[0];

  if (questionTopic) {
    pushIfFits(createGeneratedTask(date, 'questions', `問題演習：${formatTopicLabel(data, questionTopic.id)} 10問`, 20, questionTopic));
  }

  pushIfFits(createGeneratedTask(date, 'memo', `${taskTypeLabels.memo}：間違いノート 5分`, 5));

  const otherDayTasks = data.tasks.filter((task) => taskScheduledDate(task) !== date);
  return {
    data: { ...data, tasks: [...otherDayTasks, ...tasks] },
    hiddenReviewCount,
  };
};

export const carryOverUnfinishedTasks = (data: AppData, date: string): AppData => {
  const todayTaskKeys = new Set(
    data.tasks
      .filter((task) => taskScheduledDate(task) === date)
      .map((task) => `${task.title}-${task.topicId ?? ''}-${task.type}`),
  );

  return {
    ...data,
    tasks: data.tasks.map((task) => {
      const scheduledDate = taskScheduledDate(task);
      if (task.status !== 'todo' || task.isFixedDateTask || scheduledDate >= date) return task;

      const key = `${task.title}-${task.topicId ?? ''}-${task.type}`;
      if (todayTaskKeys.has(key)) {
        return { ...task, status: 'skipped' };
      }
      todayTaskKeys.add(key);
      return {
        ...task,
        scheduledDate: date,
        originalDate: task.originalDate ?? scheduledDate,
        carriedOverCount: task.carriedOverCount + 1,
        priority: increasePriority(task.priority),
      };
    }),
  };
};

export const nextReviewDateForQuestion = (log: QuestionLog) => {
  if (log.result === 'incorrect') return addDays(log.date, 1);
  if (log.confidence === 'low') return addDays(log.date, 3);
  if (log.confidence === 'medium') return addDays(log.date, 7);
  return addDays(log.date, 14);
};

export const addQuestionLogWithReview = (data: AppData, log: QuestionLog): AppData => ({
  ...data,
  questionLogs: [log, ...data.questionLogs],
  reviewItems: [
    {
      id: crypto.randomUUID(),
      topicId: log.topicId,
      dueDate: nextReviewDateForQuestion(log),
      status: 'pending',
      reviewCount: 0,
    },
    ...data.reviewItems,
  ],
});

export const addStudyLogWithReview = (data: AppData, log: StudyLog): AppData => ({
  ...data,
  studyLogs: [log, ...data.studyLogs],
  reviewItems: log.topicId
    ? [
        {
          id: crypto.randomUUID(),
          topicId: log.topicId,
          dueDate: addDays(log.date, 1),
          status: 'pending',
          reviewCount: 0,
        },
        ...data.reviewItems,
      ]
    : data.reviewItems,
});

export const completeReview = (
  data: AppData,
  review: ReviewItem,
  result: NonNullable<ReviewItem['lastResult']>,
  date = todayString(),
): AppData => {
  const days = result === 'easy' ? 30 : result === 'normal' ? 7 : 1;
  const updatedReviews = data.reviewItems.map((item) =>
    item.id === review.id
      ? {
          ...item,
          status: 'done' as const,
          lastResult: result,
          reviewCount: item.reviewCount + 1,
        }
      : item,
  );

  return {
    ...data,
    reviewItems: [
      {
        id: crypto.randomUUID(),
        topicId: review.topicId,
        dueDate: addDays(date, days),
        status: 'pending',
        reviewCount: review.reviewCount + 1,
        lastResult: result,
      },
      ...updatedReviews,
    ],
  };
};

export const materialUnitProgressWeight: Record<MaterialUnit['status'], number> = {
  not_started: 0,
  in_progress: 25,
  read: 50,
  practicing: 65,
  needs_review: 70,
  completed: 100,
};
