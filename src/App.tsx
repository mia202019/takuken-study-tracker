import { useEffect, useMemo, useState } from 'react';
import type * as React from 'react';
import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  Database,
  Download,
  ExternalLink,
  Home,
  LibraryBig,
  NotebookPen,
  Plus,
  RotateCcw,
  Settings,
  Upload,
} from 'lucide-react';
import type { AppData, Material, MaterialUnit, QuestionLog, Resource, ReviewItem, StudyLog, StudyTask, StudyTaskType } from './types';
import { loadData, normalizeData, resetData, saveData } from './data/storage';
import {
  addQuestionLogWithReview,
  addStudyLogWithReview,
  applicationStatusLabel,
  availableMinutesForDate,
  carryOverUnfinishedTasks,
  completeReview,
  daysUntil,
  formatTopicLabel,
  generateTodayTasks,
  getStudyPhase,
  getSubject,
  getTopic,
  materialUnitProgressWeight,
  taskScheduledDate,
  todayString,
} from './data/logic';
import {
  confidenceLabels,
  levelLabels,
  materialStatusLabels,
  materialTypeLabels,
  mistakeReasons,
  priorityLabels,
  resultLabels,
  reviewResultLabels,
  resourceStatusLabels,
  resourceTypeLabels,
  sourceTypeLabels,
  taskTypeLabels,
} from './data/labels';

type Tab = 'home' | 'materials' | 'resources' | 'topics' | 'reviews' | 'mistakes' | 'analytics' | 'settings';

const tabs: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'materials', label: '教材進捗', icon: LibraryBig },
  { id: 'resources', label: 'リソース', icon: ExternalLink },
  { id: 'topics', label: '論点マップ', icon: BookOpenCheck },
  { id: 'reviews', label: '復習', icon: CalendarCheck },
  { id: 'mistakes', label: '間違いノート', icon: NotebookPen },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'settings', label: '設定', icon: Settings },
];

const levelClass = [
  'bg-stone-200 text-stone-700',
  'bg-rose-100 text-rose-800',
  'bg-orange-100 text-orange-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
];

const priorityClass = {
  high: 'bg-[#e7f0ec] text-[#295c4f]',
  medium: 'bg-[#f3eadb] text-[#765f35]',
  low: 'bg-stone-100 text-stone-600',
};

const priorityOrder = { high: 0, medium: 1, low: 2 };
const prioritySort = (a: keyof typeof priorityOrder, b: keyof typeof priorityOrder) => priorityOrder[a] - priorityOrder[b];

export default function App() {
  const [initialState] = useState(() => {
    const initialDate = todayString();
    const loaded = carryOverUnfinishedTasks(loadData(), initialDate);
    const initialMinutes = availableMinutesForDate(initialDate, loaded.settings);
    const hasTodayTasks = loaded.tasks.some((task) => taskScheduledDate(task) === initialDate);
    if (hasTodayTasks || initialDate < loaded.settings.studyStartDate) {
      return { data: loaded, date: initialDate, availableMinutes: initialMinutes, hiddenReviewCount: 0 };
    }
    const generated = generateTodayTasks(loaded, initialDate, initialMinutes);
    return {
      data: generated.data,
      date: initialDate,
      availableMinutes: initialMinutes,
      hiddenReviewCount: generated.hiddenReviewCount,
    };
  });
  const [data, setData] = useState<AppData>(initialState.data);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [date] = useState(initialState.date);
  const [availableMinutes, setAvailableMinutes] = useState(initialState.availableMinutes);
  const [hiddenReviewCount, setHiddenReviewCount] = useState(initialState.hiddenReviewCount);

  useEffect(() => saveData(data), [data]);

  const updateData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const regenerateTasks = () => {
    const result = generateTodayTasks(data, date, availableMinutes);
    setHiddenReviewCount(result.hiddenReviewCount);
    setData(result.data);
  };

  return (
    <div className="min-h-screen pb-24 text-[#303234]">
      <header className="sticky top-0 z-20 border-b border-[#e5ddcf] bg-[#f8f4ec]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[#527067]">TAKUKEN STUDY</p>
            <h1 className="text-2xl font-bold text-[#243735]">今日の宅建</h1>
          </div>
          <button
            type="button"
            onClick={() => setData(resetData())}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ded5c8] bg-white text-[#43504d] shadow-sm"
            aria-label="初期データに戻す"
            title="初期データに戻す"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {activeTab === 'home' && (
          <HomePage
            data={data}
            date={date}
            availableMinutes={availableMinutes}
            setAvailableMinutes={setAvailableMinutes}
            hiddenReviewCount={hiddenReviewCount}
            regenerateTasks={regenerateTasks}
            updateData={updateData}
          />
        )}
        {activeTab === 'materials' && <MaterialProgressPage data={data} updateData={updateData} />}
        {activeTab === 'resources' && <ResourceLibraryPage data={data} updateData={updateData} />}
        {activeTab === 'topics' && <TopicMapPage data={data} updateData={updateData} />}
        {activeTab === 'reviews' && <ReviewPage data={data} updateData={updateData} date={date} />}
        {activeTab === 'mistakes' && <MistakePage data={data} updateData={updateData} />}
        {activeTab === 'analytics' && <AnalyticsPage data={data} date={date} setData={setData} />}
        {activeTab === 'settings' && <SettingsPage data={data} updateData={updateData} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ded5c8] bg-[#fffdf8]">
        <div className="mx-auto grid max-w-5xl grid-cols-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold sm:text-[11px] ${
                  active ? 'text-[#1f5b52]' : 'text-stone-500'
                }`}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#283633]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-[#e5ddcf] bg-[#fffdf8] p-4 shadow-sm ${className}`}>{children}</div>;
}

function TaskCard({ task, onToggle }: { task: StudyTask; onToggle: () => void }) {
  return (
    <Card className={task.isFixedDateTask ? 'border-[#d5b06a] bg-[#fffaf0]' : ''}>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={onToggle}
          className="mt-1 h-5 w-5 accent-[#315f57]"
        />
        <span className="flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#527067]">
            <span>{taskTypeLabels[task.type]}・{task.estimatedMinutes}分</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass[task.priority]}`}>優先 {priorityLabels[task.priority]}</span>
            {task.carriedOverCount > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">持ち越し {task.carriedOverCount}回</span>}
            {task.isFixedDateTask && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">固定日</span>}
          </span>
          <span className={task.status === 'done' ? 'text-stone-400 line-through' : ''}>{task.title}</span>
          {task.originalDate && task.originalDate !== task.scheduledDate && (
            <span className="mt-1 block text-xs text-stone-500">元の予定日：{task.originalDate}</span>
          )}
        </span>
      </label>
    </Card>
  );
}

function HomePage({
  data,
  date,
  availableMinutes,
  setAvailableMinutes,
  hiddenReviewCount,
  regenerateTasks,
  updateData,
}: {
  data: AppData;
  date: string;
  availableMinutes: number;
  setAvailableMinutes: (minutes: number) => void;
  hiddenReviewCount: number;
  regenerateTasks: () => void;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const allTodayTasks = data.tasks.filter((task) => taskScheduledDate(task) === date);
  const urgentFixedTasks = data.tasks
    .filter((task) => task.isFixedDateTask && task.status === 'todo' && taskScheduledDate(task) <= date)
    .sort((a, b) => taskScheduledDate(a).localeCompare(taskScheduledDate(b)));
  const todayTasks = allTodayTasks
    .filter((task) => !urgentFixedTasks.some((fixed) => fixed.id === task.id))
    .sort((a, b) => Number(b.carriedOverCount > 0) - Number(a.carriedOverCount > 0) || prioritySort(a.priority, b.priority));
  const doneCount = allTodayTasks.filter((task) => task.status === 'done').length;
  const overdueCount = data.reviewItems.filter((review) => review.status === 'pending' && review.dueDate < date).length;
  const phase = getStudyPhase(date);
  const countdown = daysUntil(date, data.settings.examDate);
  const weekTarget = (data.settings.weekdayAvailableMinutes * 5) + (data.settings.weekendAvailableMinutes * 2);
  const applicationStatus = applicationStatusLabel(data.settings, date);
  const weakTopics = [...data.topics]
    .filter((topic) => topic.understandingLevel <= 2)
    .sort((a, b) => a.understandingLevel - b.understandingLevel)
    .slice(0, 3);

  const toggleTask = (task: StudyTask) => {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status: item.status === 'done' ? 'todo' : 'done' } : item)),
    }));
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[#d8e8e3] bg-[#fffdf8] p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#527067]">2026年度 宅建試験</p>
        <div className="mt-2 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-3xl font-bold text-[#243735]">試験日まであと{countdown}日</h2>
            <p className="mt-2 font-semibold text-stone-700">2026年10月18日（日）13:00〜15:00</p>
            <p className="mt-1 text-sm text-stone-500">RETIO公式予定に基づく目標日です。</p>
          </div>
          <div className="grid gap-2 text-sm">
            <p><span className="font-semibold text-stone-500">現在：</span>{phase.name}</p>
            <p><span className="font-semibold text-stone-500">今週の目標：</span>{weekTarget}分</p>
            <p><span className="font-semibold text-stone-500">申込状況：</span>{applicationStatus}</p>
            <button
              type="button"
              onClick={() => updateData((current) => ({ ...current, settings: { ...current.settings, applicationStatus: 'completed' } }))}
              className="mt-1 rounded-md bg-[#315f57] px-3 py-2 font-semibold text-white"
            >
              申込み済みにする
            </button>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-lg bg-[#264f49] p-5 text-white shadow-sm">
        <p className="text-sm text-[#d8e8e3]">{date}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">今日の宅建</h2>
            <p className="mt-2 text-[#edf7f3]">進捗：{doneCount} / {allTodayTasks.length} 完了</p>
          </div>
          <label className="grid gap-1 text-sm">
            今日の目標
            <input
              type="number"
              min={15}
              step={15}
              value={availableMinutes}
              onChange={(event) => setAvailableMinutes(Number(event.target.value))}
              className="w-28 rounded-md border border-[#d8e8e3] bg-white px-3 py-2 text-[#243735]"
            />
          </label>
        </div>
      </section>

      {urgentFixedTasks.length > 0 && (
        <Section title="重要な申込・試験タスク">
          <div className="grid gap-3">
            {urgentFixedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task)} />
            ))}
          </div>
        </Section>
      )}

      <Section
        title="今日やること"
        action={
          <button type="button" onClick={regenerateTasks} className="rounded-md bg-[#315f57] px-3 py-2 text-sm font-semibold text-white">
            再生成
          </button>
        }
      >
        <div className="grid gap-3">
          {todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task)} />
          ))}
          {hiddenReviewCount > 0 && <p className="text-sm text-stone-600">時間内に入らない復習が {hiddenReviewCount} 件あります。</p>}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-stone-500">期限超過の復習</p>
          <p className="mt-2 text-3xl font-bold text-[#8f4d3f]">{overdueCount}</p>
        </Card>
        <Card className="md:col-span-2">
          <p className="mb-3 text-sm font-semibold text-stone-600">弱点トップ3</p>
          <div className="grid gap-2">
            {weakTopics.map((topic) => (
              <TopicMiniRow key={topic.id} data={data} topicId={topic.id} />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ManualTaskForm data={data} date={date} updateData={updateData} />
        <StudyLogForm data={data} date={date} updateData={updateData} />
      </div>
    </>
  );
}

function ManualTaskForm({
  data,
  date,
  updateData,
}: {
  data: AppData;
  date: string;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const [type, setType] = useState<StudyTaskType>('new_learning');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const topics = data.topics.filter((topic) => topic.subjectId === subjectId);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const effectiveTopicId = topics.some((topic) => topic.id === topicId) ? topicId : topics[0]?.id ?? '';
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(15);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const topic = getTopic(data, effectiveTopicId);
    const taskTitle = title.trim() || `${taskTypeLabels[type]}：${formatTopicLabel(data, effectiveTopicId)}`;
    updateData((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: crypto.randomUUID(),
          scheduledDate: date,
          type,
          subjectId: topic?.subjectId,
          topicId: topic?.id,
          title: taskTitle,
          estimatedMinutes: minutes,
          priority: 'medium',
          status: 'todo',
          createdAt: new Date().toISOString(),
          carriedOverCount: 0,
          isFixedDateTask: false,
        },
      ],
    }));
    setTitle('');
  };

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Plus size={18} className="text-[#315f57]" aria-hidden="true" />
        <h3 className="font-bold">手動タスク追加</h3>
      </div>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="種類">
            <select value={type} onChange={(event) => setType(event.target.value as StudyTaskType)} className="input">
              {Object.entries(taskTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
          <Field label="目安時間">
            <input type="number" min={5} step={5} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="input" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="科目">
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="input">
              {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </Field>
          <Field label="論点">
            <select value={effectiveTopicId} onChange={(event) => setTopicId(event.target.value)} className="input">
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="タスク名">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" placeholder="空欄なら種類と論点から自動入力" />
        </Field>
        <button type="submit" className="rounded-md bg-[#315f57] px-4 py-3 font-semibold text-white">追加する</button>
      </form>
    </Card>
  );
}

function MaterialProgressPage({
  data,
  updateData,
}: {
  data: AppData;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  return (
    <>
      <Section title="教材進捗">
        <div className="grid gap-4 lg:grid-cols-2">
          <MaterialForm updateData={updateData} />
          <MaterialUnitForm data={data} updateData={updateData} />
        </div>
      </Section>
      <Section title="登録済み教材">
        <div className="grid gap-4">
          {data.materials.map((material) => {
            const units = data.materialUnits.filter((unit) => unit.materialId === material.id);
            const average = units.length
              ? units.reduce((sum, unit) => sum + materialUnitProgressWeight[unit.status], 0) / units.length
              : 0;
            return (
              <Card key={material.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{material.title}</p>
                    <p className="text-sm text-stone-500">{materialTypeLabels[material.type]}・{units.length} 単元</p>
                    {material.note && <p className="mt-2 text-sm text-stone-600">{material.note}</p>}
                  </div>
                  <span className="rounded-full bg-[#e7f0ec] px-3 py-1 text-sm font-semibold text-[#295c4f]">
                    {Math.round(average)}%
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-stone-200">
                  <div className="h-2 rounded-full bg-[#315f57]" style={{ width: `${average}%` }} />
                </div>
                <div className="mt-4 grid gap-3">
                  {units.length === 0 && <p className="text-sm text-stone-500">章・ページなどの参照単元を追加できます。</p>}
                  {units.map((unit) => (
                    <MaterialUnitRow key={unit.id} data={data} unit={unit} updateData={updateData} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function MaterialForm({ updateData }: { updateData: (updater: (current: AppData) => AppData) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Material['type']>('textbook');
  const [note, setNote] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    updateData((current) => ({
      ...current,
      materials: [
        ...current.materials,
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          type,
          note: note.trim() || undefined,
        },
      ],
    }));
    setTitle('');
    setNote('');
  };

  return (
    <Card>
      <h3 className="mb-4 font-bold">教材を追加</h3>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="教材名">
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" placeholder="例：使用中のテキスト名" />
        </Field>
        <Field label="種類">
          <select value={type} onChange={(event) => setType(event.target.value as Material['type'])} className="input">
            {Object.entries(materialTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </Field>
        <Field label="メモ">
          <input value={note} onChange={(event) => setNote(event.target.value)} className="input" placeholder="版や使い方など。本文は入力しない" />
        </Field>
        <button type="submit" className="rounded-md bg-[#315f57] px-4 py-3 font-semibold text-white">教材を追加</button>
      </form>
    </Card>
  );
}

function MaterialUnitForm({
  data,
  updateData,
}: {
  data: AppData;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const [materialId, setMaterialId] = useState(data.materials[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const topics = data.topics.filter((topic) => topic.subjectId === subjectId);
  const [topicId, setTopicId] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [pageRange, setPageRange] = useState('');
  const [status, setStatus] = useState<MaterialUnit['status']>('not_started');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!materialId || !chapterTitle.trim()) return;
    updateData((current) => ({
      ...current,
      materialUnits: [
        ...current.materialUnits,
        {
          id: crypto.randomUUID(),
          materialId,
          subjectId,
          topicId: topicId || undefined,
          chapterTitle: chapterTitle.trim(),
          pageRange: pageRange.trim() || undefined,
          status,
        },
      ],
    }));
    setChapterTitle('');
    setPageRange('');
  };

  return (
    <Card>
      <h3 className="mb-4 font-bold">章・ページ進捗を追加</h3>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="教材">
          <select value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="input">
            {data.materials.map((material) => <option key={material.id} value={material.id}>{material.title}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="科目">
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="input">
              {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </Field>
          <Field label="論点">
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="input">
              <option value="">未指定</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="章・単元名">
          <input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="input" placeholder="例：第1章 免許" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ページ範囲">
            <input value={pageRange} onChange={(event) => setPageRange(event.target.value)} className="input" placeholder="例：p.12-20" />
          </Field>
          <Field label="状態">
            <select value={status} onChange={(event) => setStatus(event.target.value as MaterialUnit['status'])} className="input">
              {Object.entries(materialStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
        </div>
        <button type="submit" className="rounded-md bg-[#315f57] px-4 py-3 font-semibold text-white">進捗を追加</button>
      </form>
    </Card>
  );
}

function MaterialUnitRow({
  data,
  unit,
  updateData,
}: {
  data: AppData;
  unit: MaterialUnit;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const subject = getSubject(data, unit.subjectId);
  const topic = getTopic(data, unit.topicId);

  return (
    <div className="rounded-md border border-[#e5ddcf] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{unit.chapterTitle}</p>
          <p className="text-sm text-stone-500">
            {subject?.name ?? '科目未設定'}{topic ? ` / ${topic.name}` : ''}{unit.pageRange ? `・${unit.pageRange}` : ''}
          </p>
        </div>
        <select
          value={unit.status}
          onChange={(event) =>
            updateData((current) => ({
              ...current,
              materialUnits: current.materialUnits.map((item) =>
                item.id === unit.id ? { ...item, status: event.target.value as MaterialUnit['status'] } : item,
              ),
            }))
          }
          className="rounded-md border border-[#ded5c8] bg-white px-3 py-2 text-sm font-semibold text-[#315f57]"
        >
          {Object.entries(materialStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
    </div>
  );
}

function ResourceLibraryPage({
  data,
  updateData,
}: {
  data: AppData;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredResources = data.resources.filter((resource) => {
    if (typeFilter && resource.type !== typeFilter) return false;
    if (subjectFilter && resource.subjectId !== subjectFilter) return false;
    if (statusFilter && resource.status !== statusFilter) return false;
    return true;
  });

  return (
    <>
      <Section title="リソースライブラリ">
        <ResourceForm data={data} updateData={updateData} />
      </Section>
      <Section title="登録済みリソース">
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="input">
            <option value="">すべての種類</option>
            {Object.entries(resourceTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="input">
            <option value="">すべての科目</option>
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input">
            <option value="">すべての状態</option>
            {Object.entries(resourceStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="grid gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} data={data} resource={resource} updateData={updateData} />
          ))}
        </div>
      </Section>
    </>
  );
}

function ResourceForm({
  data,
  updateData,
}: {
  data: AppData;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Resource['type']>('website');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const topics = data.topics.filter((topic) => topic.subjectId === subjectId);
  const [topicId, setTopicId] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Resource['status']>('not_started');
  const [memo, setMemo] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    updateData((current) => ({
      ...current,
      resources: [
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          type,
          subjectId,
          topicId: topicId || undefined,
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          status,
          memo: memo.trim() || undefined,
        },
        ...current.resources,
      ],
    }));
    setTitle('');
    setUrl('');
    setDescription('');
    setMemo('');
  };

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Plus size={18} className="text-[#315f57]" aria-hidden="true" />
        <h3 className="font-bold">リソースを追加</h3>
      </div>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="タイトル">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" placeholder="例：公式サイト、講義動画、教材名" />
          </Field>
          <Field label="種類">
            <select value={type} onChange={(event) => setType(event.target.value as Resource['type'])} className="input">
              {Object.entries(resourceTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="科目">
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="input">
              {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </Field>
          <Field label="論点">
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="input">
              <option value="">未指定</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </Field>
          <Field label="状態">
            <select value={status} onChange={(event) => setStatus(event.target.value as Resource['status'])} className="input">
              {Object.entries(resourceStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="URL">
          <input value={url} onChange={(event) => setUrl(event.target.value)} className="input" placeholder="https://..." />
        </Field>
        <Field label="説明">
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="input" placeholder="内容のコピーではなく、使い方や参照目的だけを書く" />
        </Field>
        <Field label="メモ">
          <input value={memo} onChange={(event) => setMemo(event.target.value)} className="input" placeholder="自分用メモ" />
        </Field>
        <button type="submit" className="rounded-md bg-[#315f57] px-4 py-3 font-semibold text-white">リソースを追加</button>
      </form>
    </Card>
  );
}

function ResourceCard({
  data,
  resource,
  updateData,
}: {
  data: AppData;
  resource: Resource;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const topics = data.topics.filter((topic) => topic.subjectId === resource.subjectId);
  const updateResource = (patch: Partial<Resource>) => {
    updateData((current) => ({
      ...current,
      resources: current.resources.map((item) => (item.id === resource.id ? { ...item, ...patch } : item)),
    }));
  };

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e7f0ec] px-2 py-1 text-xs font-semibold text-[#295c4f]">
              {resourceTypeLabels[resource.type]}
            </span>
            <span className="rounded-full bg-[#f3eadb] px-2 py-1 text-xs font-semibold text-[#765f35]">
              {resourceStatusLabels[resource.status]}
            </span>
          </div>
          <p className="mt-2 font-bold">{resource.title}</p>
          <p className="text-sm text-stone-500">{formatTopicLabel(data, resource.topicId) === '未設定' ? getSubject(data, resource.subjectId)?.name : formatTopicLabel(data, resource.topicId)}</p>
        </div>
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#315f57] ring-1 ring-[#ded5c8]"
          >
            開く
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="タイトル">
          <input value={resource.title} onChange={(event) => updateResource({ title: event.target.value })} className="input" />
        </Field>
        <Field label="種類">
          <select value={resource.type} onChange={(event) => updateResource({ type: event.target.value as Resource['type'] })} className="input">
            {Object.entries(resourceTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </Field>
        <Field label="科目">
          <select
            value={resource.subjectId}
            onChange={(event) => updateResource({ subjectId: event.target.value, topicId: undefined })}
            className="input"
          >
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </Field>
        <Field label="論点">
          <select value={resource.topicId ?? ''} onChange={(event) => updateResource({ topicId: event.target.value || undefined })} className="input">
            <option value="">未指定</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
        </Field>
        <Field label="状態">
          <select value={resource.status} onChange={(event) => updateResource({ status: event.target.value as Resource['status'] })} className="input">
            {Object.entries(resourceStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </Field>
        <Field label="URL">
          <input value={resource.url ?? ''} onChange={(event) => updateResource({ url: event.target.value || undefined })} className="input" placeholder="https://..." />
        </Field>
        <Field label="説明">
          <input value={resource.description ?? ''} onChange={(event) => updateResource({ description: event.target.value || undefined })} className="input" />
        </Field>
        <Field label="メモ">
          <input value={resource.memo ?? ''} onChange={(event) => updateResource({ memo: event.target.value || undefined })} className="input" />
        </Field>
      </div>
    </Card>
  );
}

function StudyLogForm({
  data,
  date,
  updateData,
}: {
  data: AppData;
  date: string;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const defaultTopic = data.topics.find((item) => item.understandingLevel <= 2) ?? data.topics[0];
  const [topicId, setTopicId] = useState(defaultTopic?.id ?? '');
  const [minutes, setMinutes] = useState(15);
  const [memo, setMemo] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!topicId) return;
    const log: StudyLog = {
      id: crypto.randomUUID(),
      date,
      topicId,
      minutes,
      memo: memo.trim() || undefined,
    };
    updateData((current) => addStudyLogWithReview(current, log));
    setMemo('');
  };

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <CalendarCheck size={18} className="text-[#315f57]" aria-hidden="true" />
        <h3 className="font-bold">学習ログ入力</h3>
      </div>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="論点">
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="input">
            {data.subjects.map((subject) => (
              <optgroup key={subject.id} label={subject.name}>
                {data.topics.filter((topic) => topic.subjectId === subject.id).map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="学習時間">
          <input type="number" min={5} step={5} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="input" />
        </Field>
        <Field label="メモ">
          <input value={memo} onChange={(event) => setMemo(event.target.value)} className="input" placeholder="例：テキスト該当章を読んだ" />
        </Field>
        <button type="submit" className="rounded-md bg-white px-4 py-3 font-semibold text-[#315f57] ring-1 ring-[#ded5c8]">
          学習を記録する
        </button>
      </form>
    </Card>
  );
}

function TopicMapPage({ data, updateData }: { data: AppData; updateData: (updater: (current: AppData) => AppData) => void }) {
  const lastStudyByTopic = useMemo(() => {
    const map = new Map<string, string>();
    data.studyLogs.forEach((log) => {
      if (log.topicId && (!map.has(log.topicId) || map.get(log.topicId)! < log.date)) map.set(log.topicId, log.date);
    });
    return map;
  }, [data.studyLogs]);

  const nextReviewByTopic = useMemo(() => {
    const map = new Map<string, string>();
    data.reviewItems
      .filter((review) => review.status === 'pending')
      .forEach((review) => {
        if (!map.has(review.topicId) || map.get(review.topicId)! > review.dueDate) map.set(review.topicId, review.dueDate);
      });
    return map;
  }, [data.reviewItems]);

  return (
    <Section title="論点マップ">
      <div className="grid gap-5">
        {data.subjects.map((subject) => (
          <div key={subject.id}>
            <h3 className="mb-3 text-base font-bold text-[#314541]">{subject.name}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.topics.filter((topic) => topic.subjectId === subject.id).map((topic) => (
                <Card key={topic.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{topic.name}</p>
                      <p className="text-sm text-stone-500">{subject.name}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${priorityClass[topic.priority]}`}>
                      優先 {priorityLabels[topic.priority]}
                    </span>
                  </div>
                  <label className="mt-4 grid gap-2 text-sm font-semibold">
                    理解度
                    <select
                      value={topic.understandingLevel}
                      onChange={(event) =>
                        updateData((current) => ({
                          ...current,
                          topics: current.topics.map((item) =>
                            item.id === topic.id ? { ...item, understandingLevel: Number(event.target.value) } : item,
                          ),
                        }))
                      }
                      className={`rounded-md border border-[#ded5c8] px-3 py-2 ${levelClass[topic.understandingLevel]}`}
                    >
                      {levelLabels.map((label, index) => (
                        <option key={label} value={index}>{index}：{label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-stone-600">
                    <p>最終学習<br /><span className="font-semibold">{lastStudyByTopic.get(topic.id) ?? '未記録'}</span></p>
                    <p>次回復習<br /><span className="font-semibold">{nextReviewByTopic.get(topic.id) ?? '未定'}</span></p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ReviewPage({ data, updateData, date }: { data: AppData; updateData: (updater: (current: AppData) => AppData) => void; date: string }) {
  const groups = [
    { title: '期限超過', items: data.reviewItems.filter((review) => review.status === 'pending' && review.dueDate < date) },
    { title: '今日の復習', items: data.reviewItems.filter((review) => review.status === 'pending' && review.dueDate === date) },
    { title: 'これからの復習', items: data.reviewItems.filter((review) => review.status === 'pending' && review.dueDate > date).slice(0, 12) },
  ];

  return (
    <Section title="復習">
      <div className="grid gap-5">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-3 font-bold text-[#314541]">{group.title}</h3>
            <div className="grid gap-3">
              {group.items.length === 0 && <Card><p className="text-sm text-stone-500">該当する復習はありません。</p></Card>}
              {group.items.map((review) => (
                <ReviewCard
                  key={review.id}
                  data={data}
                  review={review}
                  onComplete={(result) => updateData((current) => completeReview(current, review, result, date))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ReviewCard({
  data,
  review,
  onComplete,
}: {
  data: AppData;
  review: ReviewItem;
  onComplete: (result: NonNullable<ReviewItem['lastResult']>) => void;
}) {
  const topic = getTopic(data, review.topicId);
  const subject = getSubject(data, topic?.subjectId);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{topic?.name ?? '不明な論点'}</p>
          <p className="text-sm text-stone-500">{subject?.name ?? '科目未設定'}・期限 {review.dueDate}・{review.reviewCount}回目</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['forgot', 'hard', 'normal', 'easy'] as const).map((result) => (
            <button
              key={result}
              type="button"
              onClick={() => onComplete(result)}
              className="rounded-md border border-[#ded5c8] bg-white px-3 py-2 text-sm font-semibold text-[#315f57]"
            >
              {reviewResultLabels[result]}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MistakePage({ data, updateData }: { data: AppData; updateData: (updater: (current: AppData) => AppData) => void }) {
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const topics = data.topics.filter((topic) => topic.subjectId === subjectId);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const [reasonFilter, setReasonFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [memo, setMemo] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [mistakeReason, setMistakeReason] = useState(mistakeReasons[0]);
  const [sourceType, setSourceType] = useState<QuestionLog['sourceType']>('past_exam');
  const [confidence, setConfidence] = useState<QuestionLog['confidence']>('medium');
  const [result, setResult] = useState<QuestionLog['result']>('incorrect');
  const effectiveTopicId = topics.some((topic) => topic.id === topicId) ? topicId : topics[0]?.id ?? '';

  const filteredLogs = data.questionLogs.filter((log) => {
    if (subjectFilter && log.subjectId !== subjectFilter) return false;
    if (reasonFilter && log.mistakeReason !== reasonFilter) return false;
    return true;
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const log: QuestionLog = {
      id: crypto.randomUUID(),
      date: todayString(),
      subjectId,
      topicId: effectiveTopicId,
      sourceType,
      result,
      confidence,
      mistakeReason,
      memo,
      sourceRef,
    };
    updateData((current) => addQuestionLogWithReview(current, log));
    setMemo('');
    setSourceRef('');
  };

  return (
    <>
      <Section title="間違いノート">
        <Card>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="科目">
              <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="input">
                {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </Field>
            <Field label="論点">
              <select value={effectiveTopicId} onChange={(event) => setTopicId(event.target.value)} className="input">
                {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </Field>
            <Field label="出典種別">
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value as QuestionLog['sourceType'])} className="input">
                {Object.entries(sourceTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="参照メモ">
              <input value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} className="input" placeholder="例：過去問 2023 権利関係 問3" />
            </Field>
            <Field label="結果">
              <select value={result} onChange={(event) => setResult(event.target.value as QuestionLog['result'])} className="input">
                {Object.entries(resultLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="自信">
              <select value={confidence} onChange={(event) => setConfidence(event.target.value as QuestionLog['confidence'])} className="input">
                {Object.entries(confidenceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="原因">
              <select value={mistakeReason} onChange={(event) => setMistakeReason(event.target.value)} className="input">
                {mistakeReasons.map((reason) => <option key={reason}>{reason}</option>)}
              </select>
            </Field>
            <Field label="短いメモ">
              <input value={memo} onChange={(event) => setMemo(event.target.value)} className="input" placeholder="自分用メモだけを書く" />
            </Field>
            <button type="submit" className="rounded-md bg-[#315f57] px-4 py-3 font-semibold text-white md:col-span-2">
              記録する
            </button>
          </form>
        </Card>
      </Section>

      <Section title="最近の記録">
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="input">
            <option value="">すべての科目</option>
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)} className="input">
            <option value="">すべての原因</option>
            {mistakeReasons.map((reason) => <option key={reason}>{reason}</option>)}
          </select>
        </div>
        <div className="grid gap-3">
          {filteredLogs.slice(0, 20).map((log) => (
            <Card key={log.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{formatTopicLabel(data, log.topicId)}</p>
                  <p className="text-sm text-stone-500">{log.date}・{sourceTypeLabels[log.sourceType]}・{log.sourceRef || '参照なし'}</p>
                  {log.memo && <p className="mt-2 text-sm">{log.memo}</p>}
                </div>
                <span className="rounded-full bg-[#f3eadb] px-3 py-1 text-sm font-semibold text-[#765f35]">{log.mistakeReason}</span>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

function AnalyticsPage({ data, date, setData }: { data: AppData; date: string; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const weekAgo = new Date(`${date}T00:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);
  const totalMinutes = data.studyLogs.reduce((sum, log) => sum + log.minutes, 0);
  const completedThisWeek = data.tasks.filter((task) => {
    const scheduledDate = taskScheduledDate(task);
    return task.status === 'done' && scheduledDate >= weekStart && scheduledDate <= date;
  }).length;
  const backlog = data.reviewItems.filter((review) => review.status === 'pending' && review.dueDate < date).length;
  const weakRanking = [...data.topics].sort((a, b) => a.understandingLevel - b.understandingLevel || a.name.localeCompare(b.name)).slice(0, 8);
  const reasonCounts = mistakeReasons.map((reason) => ({
    reason,
    count: data.questionLogs.filter((log) => log.mistakeReason === reason).length,
  })).filter((item) => item.count > 0);

  return (
    <>
      <Section title="分析">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="総学習時間" value={`${totalMinutes}分`} />
          <Metric label="今週の完了タスク" value={`${completedThisWeek}件`} />
          <Metric label="復習の滞留" value={`${backlog}件`} />
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="科目別の理解度">
          <div className="grid gap-3">
            {data.subjects.map((subject) => {
              const topics = data.topics.filter((topic) => topic.subjectId === subject.id);
              const average = topics.reduce((sum, topic) => sum + topic.understandingLevel, 0) / Math.max(1, topics.length);
              const completed = topics.filter((topic) => topic.understandingLevel >= 4).length;
              return (
                <Card key={subject.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{subject.name}</p>
                    <p className="text-sm text-stone-500">{completed} / {topics.length} 論点</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-stone-200">
                    <div className="h-2 rounded-full bg-[#315f57]" style={{ width: `${(average / 5) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">平均 {average.toFixed(1)} / 5</p>
                </Card>
              );
            })}
          </div>
        </Section>

        <Section title="間違い理由">
          <div className="grid gap-3">
            {reasonCounts.length === 0 && <Card><p className="text-sm text-stone-500">まだ記録がありません。</p></Card>}
            {reasonCounts.map((item) => (
              <Card key={item.reason}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.reason}</p>
                  <p className="text-lg font-bold text-[#315f57]">{item.count}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>

      <Section title="弱点ランキング">
        <div className="grid gap-3 md:grid-cols-2">
          {weakRanking.map((topic) => <TopicMiniRow key={topic.id} data={data} topicId={topic.id} />)}
        </div>
      </Section>

      <DataManagement data={data} setData={setData} />
    </>
  );
}

function DataManagement({
  data,
  setData,
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}) {
  const [message, setMessage] = useState('');

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `takuken-study-${todayString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('JSONを書き出しました。');
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const normalized = normalizeData(parsed);
      if (!normalized) {
        setMessage('読み込めないJSONです。');
        return;
      }
      setData(normalized);
      setMessage('JSONからデータを読み込みました。');
    } catch {
      setMessage('JSONの読み込みに失敗しました。');
    }
  };

  return (
    <Section title="データ管理">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Database size={18} className="text-[#315f57]" aria-hidden="true" />
          <p className="font-bold">バックアップ</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={exportData}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#315f57] px-4 py-3 font-semibold text-white"
          >
            <Download size={18} aria-hidden="true" />
            JSONエクスポート
          </button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-4 py-3 font-semibold text-[#315f57] ring-1 ring-[#ded5c8]">
            <Upload size={18} aria-hidden="true" />
            JSONインポート
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => void importData(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
        </div>
        {message && <p className="mt-3 text-sm text-stone-600">{message}</p>}
      </Card>
    </Section>
  );
}

function SettingsPage({
  data,
  updateData,
}: {
  data: AppData;
  updateData: (updater: (current: AppData) => AppData) => void;
}) {
  const settings = data.settings;
  return (
    <Section title="設定">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="試験日">
            <input
              type="date"
              value={settings.examDate}
              onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, examDate: event.target.value } }))}
              className="input"
            />
          </Field>
          <Field label="学習開始日">
            <input
              type="date"
              value={settings.studyStartDate}
              onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, studyStartDate: event.target.value } }))}
              className="input"
            />
          </Field>
          <Field label="平日の学習可能時間">
            <input
              type="number"
              min={15}
              step={15}
              value={settings.weekdayAvailableMinutes}
              onChange={(event) =>
                updateData((current) => ({ ...current, settings: { ...current.settings, weekdayAvailableMinutes: Number(event.target.value) } }))
              }
              className="input"
            />
          </Field>
          <Field label="休日の学習可能時間">
            <input
              type="number"
              min={15}
              step={15}
              value={settings.weekendAvailableMinutes}
              onChange={(event) =>
                updateData((current) => ({ ...current, settings: { ...current.settings, weekendAvailableMinutes: Number(event.target.value) } }))
              }
              className="input"
            />
          </Field>
          <Field label="申込状況">
            <select
              value={settings.applicationStatus}
              onChange={(event) =>
                updateData((current) => ({
                  ...current,
                  settings: { ...current.settings, applicationStatus: event.target.value as AppData['settings']['applicationStatus'] },
                }))
              }
              className="input"
            >
              <option value="not_started">申込み前</option>
              <option value="open">申込み期間中</option>
              <option value="completed">申込み済み</option>
              <option value="waiting_ticket">受験票待ち</option>
              <option value="final_check">試験直前</option>
            </select>
          </Field>
          <Field label="申込方法">
            <select
              value={settings.preferredApplicationMethod}
              onChange={(event) =>
                updateData((current) => ({
                  ...current,
                  settings: { ...current.settings, preferredApplicationMethod: event.target.value as AppData['settings']['preferredApplicationMethod'] },
                }))
              }
              className="input"
            >
              <option value="internet">インターネット</option>
              <option value="postal">郵送</option>
              <option value="undecided">未定</option>
            </select>
          </Field>
        </div>
        <div className="mt-5 rounded-md bg-[#f3eadb] p-4 text-sm text-stone-700">
          <p className="font-semibold">申込予定</p>
          <p className="mt-1">インターネット：2026-07-01 09:30〜2026-07-31 23:59</p>
          <p>郵送：2026-07-01〜2026-07-15</p>
          <p>受験手数料：8,200円</p>
          <p>公告予定：2026-06-05</p>
        </div>
      </Card>
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-700">
      {label}
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#315f57]">{value}</p>
    </Card>
  );
}

function TopicMiniRow({ data, topicId }: { data: AppData; topicId: string }) {
  const topic = getTopic(data, topicId);
  const subject = getSubject(data, topic?.subjectId);
  if (!topic) return null;

  return (
    <div className="rounded-md border border-[#e5ddcf] bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{topic.name}</p>
          <p className="text-sm text-stone-500">{subject?.name}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${levelClass[topic.understandingLevel]}`}>
          {topic.understandingLevel}
        </span>
      </div>
    </div>
  );
}
