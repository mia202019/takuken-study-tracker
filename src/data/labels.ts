import type { Material, MaterialUnit, Priority, QuestionLog, Resource, ReviewItem, StudyTaskType } from '../types';

export const taskTypeLabels: Record<StudyTaskType, string> = {
  new_learning: '新規学習',
  review: '復習',
  questions: '問題演習',
  mistake_review: '間違い復習',
  memo: 'メモ整理',
};

export const priorityLabels: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const levelLabels = [
  '未着手',
  '読んだが不明',
  'なんとなく分かる',
  '問題が少し解ける',
  'だいたい解ける',
  '安定して解ける',
];

export const sourceTypeLabels: Record<QuestionLog['sourceType'], string> = {
  past_exam: '過去問',
  workbook: '問題集',
  mock_exam: '模試',
  self_made: '自作',
};

export const confidenceLabels: Record<QuestionLog['confidence'], string> = {
  high: '高い',
  medium: '普通',
  low: '低い',
};

export const resultLabels: Record<QuestionLog['result'], string> = {
  correct: '正解',
  incorrect: '不正解',
};

export const reviewResultLabels: Record<NonNullable<ReviewItem['lastResult']>, string> = {
  forgot: '忘れた',
  hard: '難しい',
  normal: '普通',
  easy: '簡単',
};

export const mistakeReasons = [
  '知識不足',
  '暗記不足',
  '問題文の読み間違い',
  '似た論点と混同',
  '条件を見落とした',
  '数字を覚えていない',
  '理解できていない',
  'ケアレスミス',
];

export const materialTypeLabels: Record<Material['type'], string> = {
  textbook: 'テキスト',
  workbook: '問題集',
  video: '動画',
  website: 'Webサイト',
  mock_exam: '模試',
};

export const materialStatusLabels: Record<MaterialUnit['status'], string> = {
  not_started: '未着手',
  in_progress: '途中',
  read: '読了',
  practicing: '演習中',
  needs_review: '要復習',
  completed: '完了',
};

export const resourceTypeLabels: Record<Resource['type'], string> = {
  official: '公式',
  law: '法令',
  youtube: 'YouTube',
  textbook: 'テキスト',
  workbook: '問題集',
  website: 'Web',
};

export const resourceStatusLabels: Record<Resource['status'], string> = {
  not_started: '未着手',
  using: '使用中',
  completed: '完了',
  reference: '参照用',
};
