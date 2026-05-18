import { createHash, randomUUID } from 'node:crypto';

import type { Task, Topic } from './types.js';

type GeneratedTopic = Readonly<
  Omit<Topic, 'explanationMd' | 'id' | 'planId' | 'quizPassed' | 'status' | 'theoryRead'> &
    Readonly<{
      tasks: ReadonlyArray<
        Omit<
          Task,
          'id' | 'lastRunAt' | 'lastRunPass' | 'solutionPath' | 'status' | 'testPath' | 'topicId'
        >
      >;
    }>
>;

const topicTemplates: ReadonlyArray<GeneratedTopic> = [
  {
    position: 1,
    slug: 'arrays-two-pointers',
    tasks: [
      {
        difficulty: 'easy',
        language: 'python',
        position: 1,
        promptMd:
          'Implement `is_palindrome(text: str) -> bool` using two pointers. Ignore non-alphanumeric characters and case.',
        slug: 'valid-palindrome',
        title: 'Valid Palindrome',
      },
      {
        difficulty: 'easy',
        language: 'python',
        position: 2,
        promptMd:
          'Implement `two_sum_sorted(numbers: list[int], target: int) -> tuple[int, int] | None` for a sorted array.',
        slug: 'two-sum-sorted',
        title: 'Two Sum Sorted',
      },
    ],
    title: 'Arrays & Two Pointers',
  },
  {
    position: 2,
    slug: 'graphs-foundations',
    tasks: [
      {
        difficulty: 'medium',
        language: 'python',
        position: 1,
        promptMd:
          'Implement `shortest_path_grid(grid: list[list[int]]) -> int` using BFS. 0 is open, 1 is blocked.',
        slug: 'bfs-shortest-path',
        title: 'BFS Shortest Path',
      },
      {
        difficulty: 'medium',
        language: 'python',
        position: 2,
        promptMd:
          'Implement `count_components(n: int, edges: list[tuple[int, int]]) -> int` using DFS or BFS.',
        slug: 'dfs-connected-components',
        title: 'DFS Connected Components',
      },
    ],
    title: 'Graph Foundations',
  },
  {
    position: 3,
    slug: 'dynamic-programming',
    tasks: [
      {
        difficulty: 'easy',
        language: 'python',
        position: 1,
        promptMd: 'Implement `climb_stairs(n: int) -> int` using dynamic programming.',
        slug: 'climbing-stairs',
        title: 'Climbing Stairs',
      },
      {
        difficulty: 'medium',
        language: 'python',
        position: 2,
        promptMd:
          'Implement `coin_change(coins: list[int], amount: int) -> int` returning the fewest coins or -1.',
        slug: 'coin-change',
        title: 'Coin Change',
      },
    ],
    title: 'Dynamic Programming',
  },
];

export function createPlanTitle(goal: string): string {
  const normalizedGoal = goal.trim();
  if (normalizedGoal.length === 0) {
    return 'Algorithms Practice Plan';
  }

  return `${normalizedGoal.slice(0, 48)} Plan`;
}

export function generatePlanTemplate(goal: string): Readonly<{
  id: string;
  title: string;
  topics: ReadonlyArray<GeneratedTopic>;
}> {
  const digest = createHash('sha256').update(goal.trim().toLowerCase()).digest('hex').slice(0, 8);

  return {
    id: `plan-${digest}-${randomUUID().slice(0, 8)}`,
    title: createPlanTitle(goal),
    topics: topicTemplates,
  };
}
