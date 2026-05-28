import type { AppData, ExamSettings, Priority, Resource, StudyTask, Subject, Topic } from '../types';

const subjectSeeds: Array<{ name: string; priority: Priority; topics: string[] }> = [
  {
    name: '宅建業法',
    priority: 'high',
    topics: ['免許', '宅建士', '営業保証金', '保証協会', '媒介契約', '重要事項説明', '37条書面', '8種制限', '報酬額', '監督処分・罰則'],
  },
  {
    name: '権利関係',
    priority: 'high',
    topics: ['意思表示', '代理', '時効', '債務不履行', '売買', '賃貸借', '借地借家法', '区分所有法', '相続', '抵当権'],
  },
  {
    name: '法令上の制限',
    priority: 'medium',
    topics: ['都市計画法', '建築基準法', '国土利用計画法', '農地法', '宅地造成等規制法', '土地区画整理法'],
  },
  {
    name: '税・その他',
    priority: 'medium',
    topics: ['不動産取得税', '固定資産税', '登録免許税', '印紙税', '地価公示', '不動産鑑定評価'],
  },
];

export const defaultExamSettings: ExamSettings = {
  examDate: '2026-10-18',
  studyStartDate: '2026-06-01',
  weekdayAvailableMinutes: 90,
  weekendAvailableMinutes: 120,
  applicationStatus: 'not_started',
  preferredApplicationMethod: 'internet',
};

const addDays = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const daysBetween = (startDate: string, endDate: string) => {
  const days: string[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
};

const makeTask = (task: Omit<StudyTask, 'createdAt' | 'status' | 'carriedOverCount'>): StudyTask => ({
  ...task,
  createdAt: '2026-05-28T00:00:00.000Z',
  status: 'todo',
  carriedOverCount: 0,
});

const phaseForDate = (date: string) => {
  if (date <= '2026-06-30') return 'foundation';
  if (date <= '2026-07-31') return 'basic';
  if (date <= '2026-08-31') return 'past';
  if (date <= '2026-09-30') return 'exam';
  return 'final';
};

const subjectWeightedPoolByPhase: Record<string, string[]> = {
  foundation: ['subject-1', 'subject-1', 'subject-1', 'subject-1', 'subject-1', 'subject-2', 'subject-2', 'subject-2', 'subject-3', 'subject-4'],
  basic: ['subject-1', 'subject-1', 'subject-1', 'subject-1', 'subject-2', 'subject-2', 'subject-2', 'subject-3', 'subject-3', 'subject-4'],
  past: ['subject-1', 'subject-1', 'subject-1', 'subject-2', 'subject-2', 'subject-3', 'subject-3', 'subject-3', 'subject-4', 'subject-4'],
  exam: ['subject-1', 'subject-1', 'subject-2', 'subject-3', 'subject-3', 'subject-4'],
  final: ['subject-1', 'subject-1', 'subject-1', 'subject-3', 'subject-3', 'subject-2'],
};

const createExamMilestoneTasks = (): StudyTask[] => [
  ['2026-06-05', '試験公告・申込案内を確認する'],
  ['2026-06-25', '顔写真・本人確認書類・受験料を準備する'],
  ['2026-07-01', '宅建試験のインターネット申込みをする'],
  ['2026-07-14', '申込み完了確認。未完了なら至急対応する'],
  ['2026-07-31', 'インターネット申込み最終日。未完了なら最優先で対応'],
  ['2026-10-02', '受験票発送・マイページ/郵送状況を確認する'],
  ['2026-10-09', '受験票が届かない場合は問い合わせる'],
  ['2026-10-17', '試験前日チェック'],
  ['2026-10-18', '宅建試験本番'],
].map(([scheduledDate, title]) =>
  makeTask({
    id: `fixed-${scheduledDate}`,
    scheduledDate,
    originalDate: scheduledDate,
    type: 'memo',
    title,
    estimatedMinutes: scheduledDate === '2026-10-18' ? 120 : 20,
    priority: 'high',
    isFixedDateTask: true,
    generated: true,
  }),
);

const createAutoScheduleTasks = (topics: Topic[], settings: ExamSettings): StudyTask[] => {
  const days = daysBetween(settings.studyStartDate, settings.examDate);
  return days.flatMap((date, dayIndex) => {
    const phase = phaseForDate(date);
    const pool = subjectWeightedPoolByPhase[phase];
    const subjectId = pool[dayIndex % pool.length];
    const subjectTopics = topics.filter((topic) => topic.subjectId === subjectId);
    const topic = subjectTopics[dayIndex % Math.max(1, subjectTopics.length)] ?? topics[dayIndex % topics.length];
    const isWeekend = [0, 6].includes(new Date(`${date}T00:00:00`).getDay());
    const mainMinutes = isWeekend ? 45 : 30;
    const questionMinutes = isWeekend ? 45 : 30;
    const reviewMinutes = isWeekend ? 20 : 20;
    const memoMinutes = isWeekend ? 10 : 10;
    const subjectName = subjectId === 'subject-1' ? '宅建業法' : subjectId === 'subject-2' ? '権利関係' : subjectId === 'subject-3' ? '法令上の制限' : '税・その他';
    const finalMode = phase === 'final';
    const examMode = phase === 'exam';

    return [
      makeTask({
        id: `auto-${date}-main`,
        scheduledDate: date,
        type: finalMode ? 'review' : 'new_learning',
        subjectId: topic?.subjectId,
        topicId: topic?.id,
        title: finalMode ? `最終確認：${subjectName} / ${topic?.name ?? '頻出論点'}` : `新規学習：${subjectName} / ${topic?.name ?? '基本論点'}`,
        estimatedMinutes: mainMinutes,
        priority: phase === 'final' ? 'high' : 'medium',
        isFixedDateTask: false,
        generated: true,
      }),
      makeTask({
        id: `auto-${date}-questions`,
        scheduledDate: date,
        type: 'questions',
        subjectId: topic?.subjectId,
        topicId: topic?.id,
        title: examMode ? '年度別過去問・模試演習' : `問題演習：${subjectName} / ${topic?.name ?? '基本論点'}`,
        estimatedMinutes: questionMinutes,
        priority: phase === 'past' || examMode ? 'high' : 'medium',
        isFixedDateTask: false,
        generated: true,
      }),
      makeTask({
        id: `auto-${date}-review`,
        scheduledDate: date,
        type: 'review',
        subjectId: topic?.subjectId,
        topicId: topic?.id,
        title: examMode ? '弱点論点の復習' : `復習：${subjectName} / ${topic?.name ?? '基本論点'}`,
        estimatedMinutes: reviewMinutes,
        priority: finalMode || examMode ? 'high' : 'medium',
        isFixedDateTask: false,
        generated: true,
      }),
      makeTask({
        id: `auto-${date}-memo`,
        scheduledDate: date,
        type: finalMode ? 'mistake_review' : 'memo',
        title: finalMode ? '間違いノート最終確認' : '間違いノート整理',
        estimatedMinutes: memoMinutes,
        priority: finalMode ? 'high' : 'low',
        isFixedDateTask: false,
        generated: true,
      }),
    ];
  });
};

export const seedInitialData = (): AppData => {
  const subjects: Subject[] = subjectSeeds.map((subject, index) => ({
    id: `subject-${index + 1}`,
    name: subject.name,
    priority: subject.priority,
  }));

  const topics: Topic[] = subjectSeeds.flatMap((subject, subjectIndex) =>
    subject.topics.map((topic, topicIndex) => ({
      id: `topic-${subjectIndex + 1}-${topicIndex + 1}`,
      subjectId: `subject-${subjectIndex + 1}`,
      name: topic,
      priority: subjectIndex < 2 || topicIndex < 3 ? 'high' : subject.priority,
      understandingLevel: 0,
    })),
  );

  const resources: Resource[] = [
    {
      id: 'resource-retio-past-exams',
      title: 'RETIO 宅建試験の問題及び正解番号表',
      type: 'official',
      subjectId: 'subject-1',
      url: 'https://www.retio.or.jp/exam/past_ques_ans/other/',
      description: '公式の過去問題・正解番号表ページ。問題文はアプリ内に保存しません。',
      status: 'reference',
    },
    {
      id: 'resource-law-takken',
      title: 'e-Gov 法令検索：宅地建物取引業法',
      type: 'law',
      subjectId: 'subject-1',
      url: 'https://laws.e-gov.go.jp/law/327AC1000000176',
      status: 'reference',
    },
    {
      id: 'resource-law-civil-code',
      title: 'e-Gov 法令検索：民法',
      type: 'law',
      subjectId: 'subject-2',
      url: 'https://laws.e-gov.go.jp/law/129AC0000000089',
      status: 'reference',
    },
    {
      id: 'resource-law-land-lease',
      title: 'e-Gov 法令検索：借地借家法',
      type: 'law',
      subjectId: 'subject-2',
      topicId: 'topic-2-7',
      url: 'https://laws.e-gov.go.jp/law/403AC0000000090',
      status: 'reference',
    },
    {
      id: 'resource-law-building-standard',
      title: 'e-Gov 法令検索：建築基準法',
      type: 'law',
      subjectId: 'subject-3',
      topicId: 'topic-3-2',
      url: 'https://laws.e-gov.go.jp/law/325AC0000000201',
      status: 'reference',
    },
    {
      id: 'resource-law-city-planning',
      title: 'e-Gov 法令検索：都市計画法',
      type: 'law',
      subjectId: 'subject-3',
      topicId: 'topic-3-1',
      url: 'https://laws.e-gov.go.jp/law/343AC0000000100',
      status: 'reference',
    },
    {
      id: 'resource-law-agricultural-land',
      title: 'e-Gov 法令検索：農地法',
      type: 'law',
      subjectId: 'subject-3',
      topicId: 'topic-3-4',
      url: 'https://laws.e-gov.go.jp/law/327AC0000000229',
      status: 'reference',
    },
    {
      id: 'resource-law-national-land-use',
      title: 'e-Gov 法令検索：国土利用計画法',
      type: 'law',
      subjectId: 'subject-3',
      topicId: 'topic-3-3',
      url: 'https://laws.e-gov.go.jp/law/349AC0000000092',
      status: 'reference',
    },
    {
      id: 'resource-mlit-amendments',
      title: '国土交通省：宅地建物取引業法 法令改正・解釈について',
      type: 'official',
      subjectId: 'subject-1',
      url: 'https://www.mlit.go.jp/totikensangyo/const/1_6_bt_000268.html',
      description: '宅建業法の改正・解釈情報を確認するための参照先。',
      status: 'reference',
    },
    {
      id: 'resource-youtube-tanada',
      title: 'YouTube：棚田行政書士の不動産大学',
      type: 'youtube',
      subjectId: 'subject-1',
      description: '視聴管理用プレースホルダー。必要に応じてURLを追加します。',
      status: 'not_started',
    },
    {
      id: 'resource-youtube-yuki',
      title: 'YouTube：ゆーき大学',
      type: 'youtube',
      subjectId: 'subject-1',
      description: '視聴管理用プレースホルダー。必要に応じてURLを追加します。',
      status: 'not_started',
    },
    {
      id: 'resource-youtube-yoshino',
      title: 'YouTube：吉野塾',
      type: 'youtube',
      subjectId: 'subject-1',
      description: '視聴管理用プレースホルダー。必要に応じてURLを追加します。',
      status: 'not_started',
    },
    {
      id: 'resource-textbook-minna-2026',
      title: '2026年度版 みんなが欲しかった！宅建士の教科書',
      type: 'textbook',
      subjectId: 'subject-1',
      description: '進捗管理用プレースホルダー。本文は保存しません。',
      status: 'using',
    },
    {
      id: 'resource-workbook-minna-2026',
      title: '2026年度版 みんなが欲しかった！宅建士の論点別過去問題集',
      type: 'workbook',
      subjectId: 'subject-1',
      description: '演習管理用プレースホルダー。問題文・解説は保存しません。',
      status: 'using',
    },
  ];

  const settings = defaultExamSettings;
  const tasks = [...createExamMilestoneTasks(), ...createAutoScheduleTasks(topics, settings)];

  return {
    subjects,
    topics,
    tasks,
    studyLogs: [],
    questionLogs: [],
    reviewItems: [],
    materials: [
      {
        id: 'material-sample-1',
        title: '使用教材をここに登録',
        type: 'textbook',
        note: '本文ではなく、章・ページなどの参照情報だけを記録します。',
      },
    ],
    materialUnits: [],
    resources,
    settings,
  };
};
