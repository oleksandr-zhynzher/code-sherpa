import type { Task, Topic, Visualization } from '../domain/types.js';

export type AgentChatResult = Readonly<{
  responseMd: string;
  visualization?: Readonly<Omit<Visualization, 'createdAt' | 'id'>>;
}>;

export function explainTopic(topic: Topic): string {
  return [
    `## ${topic.title}`,
    '',
    `This topic focuses on the core patterns behind **${topic.title.toLowerCase()}**.`,
    'Work through the tasks in order: read the prompt, implement the smallest correct solution, run the tests, then commit only after the task is passing.',
    '',
    '### Study loop',
    '',
    '1. Restate the pattern in your own words.',
    '2. Solve the scaffolded task without looking at the answer.',
    '3. Use chat for hints, traces, or a visualization when you get stuck.',
  ].join('\n');
}

export function answerTaskQuestion(task: Task, message: string): AgentChatResult {
  const normalized = message.toLowerCase();

  if (normalized.includes('visual') || normalized.includes('bfs') || normalized.includes('graph')) {
    const payload = [
      'flowchart LR',
      '  A["Start / layer 0"] --> B["Neighbors / layer 1"]',
      '  B --> C["Frontier / layer 2"]',
      '  C --> D["Target reached"]',
    ].join('\n');

    return {
      responseMd: `Here is a layer-by-layer visualization for **${task.title}**. BFS expands all nodes at distance *k* before moving to distance *k + 1*, which is why the first time you reach the target is the shortest path.`,
      visualization: {
        kind: 'mermaid',
        payload,
        prompt: message,
        taskId: task.id,
      },
    };
  }

  if (normalized.includes('hint')) {
    return {
      responseMd: `Hint for **${task.title}**: identify the state you need to carry between iterations before writing code. Then update that state in one small, testable step.`,
    };
  }

  if (task.status === 'passing') {
    return {
      responseMd: `Your tests are passing. The next useful step is to review complexity, then commit the task so progress is captured in your workspace repo.`,
    };
  }

  return {
    responseMd: `For **${task.title}**, start by matching the function name and signature in \`solution.py\`. Then make the first provided test pass before generalizing.`,
  };
}
