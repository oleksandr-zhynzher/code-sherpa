export type GuideAction = 'break_it_down' | 'explain_concept' | 'explain_error' | 'small_hint';

export type GuideActionContext = Readonly<{
  code?: string | undefined;
  exercisePrompt?: string | undefined;
  selectedText?: string | undefined;
  testOutput?: string | undefined;
  topicMd?: string | undefined;
}>;

const BASE_INSTRUCTION =
  'You are a coding tutor. Do not reveal full solutions unless the learner explicitly asks for one. Be concise and encouraging.';

const CURRENT_CODE_LABEL = 'Current code';

function section(label: string, value: string | undefined): string {
  return value === undefined || value.trim().length === 0 ? '' : `\n\n${label}:\n${value.trim()}`;
}

function buildSmallHint(context: GuideActionContext): string {
  return [
    BASE_INSTRUCTION,
    '\nGive the learner one small hint to move forward without spoiling the solution.',
    section('Exercise', context.exercisePrompt),
    section(CURRENT_CODE_LABEL, context.code),
  ]
    .filter(Boolean)
    .join('');
}

function buildExplainError(context: GuideActionContext): string {
  return [
    BASE_INSTRUCTION,
    '\nExplain what the failing test output means and which concept the learner needs to revisit.',
    section('Exercise', context.exercisePrompt),
    section(CURRENT_CODE_LABEL, context.code),
    section('Test output', context.testOutput),
  ]
    .filter(Boolean)
    .join('');
}

function buildBreakItDown(context: GuideActionContext): string {
  return [
    BASE_INSTRUCTION,
    '\nBreak this exercise into 3-5 smaller, concrete sub-problems the learner can tackle one at a time.',
    section('Exercise', context.exercisePrompt),
    section(CURRENT_CODE_LABEL, context.code),
  ]
    .filter(Boolean)
    .join('');
}

function buildExplainConcept(context: GuideActionContext): string {
  return [
    BASE_INSTRUCTION,
    '\nExplain the selected concept clearly. Use a short example if it helps.',
    section('Concept', context.selectedText),
    section('Topic context', context.topicMd),
  ]
    .filter(Boolean)
    .join('');
}

export function buildGuideActionPrompt(action: GuideAction, context: GuideActionContext): string {
  switch (action) {
    case 'small_hint':
      return buildSmallHint(context);
    case 'explain_error':
      return buildExplainError(context);
    case 'break_it_down':
      return buildBreakItDown(context);
    case 'explain_concept':
      return buildExplainConcept(context);
  }
}
