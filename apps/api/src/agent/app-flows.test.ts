import { describe, expect, it } from 'vitest';

import {
  answerTaskChatWithAgent,
  generateLearningPathDraftWithAgent,
  generateTopicExplanationWithAgent,
} from './app-flows.js';
import type { AgentSessionService } from './session-service.js';

const bfsPrompt = 'Implement BFS shortest path.';
const bfsTitle = 'BFS Shortest Path';
const graphFoundationsTitle = 'Graph Foundations';
const pythonLanguage = 'python';
const setup = {
  agentDriver: 'copilot',
  autoSaveProgress: true,
  claudePath: null,
  copilotPath: null,
  exerciseLanguage: pythonLanguage,
  guideTone: 'direct',
  repoUrl: null,
  safeRunChecks: true,
  workspacePath: '/tmp/code-sherpa',
} as const;

const task = {
  difficulty: 'medium',
  id: 'task-1',
  language: pythonLanguage,
  lastRunAt: null,
  lastRunPass: null,
  position: 1,
  promptMd: bfsPrompt,
  slug: 'bfs-shortest-path',
  solutionPath: null,
  status: 'todo',
  testPath: null,
  title: bfsTitle,
  topicId: 'topic-1',
} as const;

const topic = {
  explanationMd: null,
  id: 'topic-1',
  planId: 'plan-1',
  position: 1,
  slug: 'graphs',
  status: 'todo',
  tasks: [task],
  title: graphFoundationsTitle,
} as const;

function createService(contentMd: string): AgentSessionService {
  return {
    healthCheck: async () => ({ ok: true }),
    run: async () => ({ contentMd }),
    stream: async function* () {},
  };
}

describe('app agent flows', () => {
  it('parses agent-generated learning path drafts', async () => {
    const service = createService(
      JSON.stringify({
        title: 'Graph Interview Path',
        topics: [
          {
            tasks: [
              {
                difficulty: 'medium',
                language: pythonLanguage,
                promptMd: bfsPrompt,
                title: bfsTitle,
              },
            ],
            title: graphFoundationsTitle,
          },
        ],
      }),
    );

    await expect(
      generateLearningPathDraftWithAgent({ goal: 'graphs', service, setup }),
    ).resolves.toEqual({
      title: 'Graph Interview Path',
      topics: [
        {
          tasks: [
            {
              difficulty: 'medium',
              language: pythonLanguage,
              promptMd: bfsPrompt,
              title: bfsTitle,
            },
          ],
          title: graphFoundationsTitle,
        },
      ],
    });
  });

  it('fails closed when structured agent JSON is malformed', async () => {
    const service = createService('not json');

    await expect(
      generateLearningPathDraftWithAgent({ goal: 'graphs', service, setup }),
    ).rejects.toThrow('learning path agent response was not valid JSON');
  });

  it('uses agent output for topic explanation and task chat', async () => {
    await expect(
      generateTopicExplanationWithAgent({
        service: createService(`## ${graphFoundationsTitle}\nUse BFS for shortest paths.`),
        setup,
        topic,
      }),
    ).resolves.toContain('Use BFS');

    await expect(
      answerTaskChatWithAgent({
        message: 'visualize BFS',
        service: createService(
          JSON.stringify({
            responseMd: 'BFS expands by layers.',
            visualization: {
              kind: 'mermaid',
              payload: 'flowchart LR\nA-->B',
            },
          }),
        ),
        setup,
        task,
      }),
    ).resolves.toEqual({
      responseMd: 'BFS expands by layers.',
      visualization: {
        kind: 'mermaid',
        payload: 'flowchart LR\nA-->B',
        prompt: 'visualize BFS',
        taskId: 'task-1',
      },
    });
  });
});
