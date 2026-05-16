import type { TaskContext } from '../domain/types.js';

export type ScaffoldFiles = Readonly<{
  solution: string;
  test: string;
}>;

function solutionTemplate(task: TaskContext): string {
  if (task.slug === 'valid-palindrome') {
    return `def is_palindrome(text: str) -> bool:\n    raise NotImplementedError("Solve ${task.title}")\n`;
  }

  if (task.slug === 'two-sum-sorted') {
    return `def two_sum_sorted(numbers: list[int], target: int) -> tuple[int, int] | None:\n    raise NotImplementedError("Solve ${task.title}")\n`;
  }

  if (task.slug === 'bfs-shortest-path') {
    return `def shortest_path_grid(grid: list[list[int]]) -> int:\n    raise NotImplementedError("Solve ${task.title}")\n`;
  }

  if (task.slug === 'dfs-connected-components') {
    return `def count_components(n: int, edges: list[tuple[int, int]]) -> int:\n    raise NotImplementedError("Solve ${task.title}")\n`;
  }

  if (task.slug === 'climbing-stairs') {
    return `def climb_stairs(n: int) -> int:\n    raise NotImplementedError("Solve ${task.title}")\n`;
  }

  return `def coin_change(coins: list[int], amount: int) -> int:\n    raise NotImplementedError("Solve ${task.title}")\n`;
}

function testTemplate(task: TaskContext): string {
  if (task.slug === 'valid-palindrome') {
    return `import unittest\nfrom solution import is_palindrome\n\n\nclass ValidPalindromeTest(unittest.TestCase):\n    def test_examples(self):\n        self.assertTrue(is_palindrome("A man, a plan, a canal: Panama"))\n        self.assertFalse(is_palindrome("race a car"))\n        self.assertTrue(is_palindrome(""))\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
  }

  if (task.slug === 'two-sum-sorted') {
    return `import unittest\nfrom solution import two_sum_sorted\n\n\nclass TwoSumSortedTest(unittest.TestCase):\n    def test_examples(self):\n        self.assertEqual(two_sum_sorted([2, 7, 11, 15], 9), (0, 1))\n        self.assertIsNone(two_sum_sorted([1, 2, 4], 8))\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
  }

  if (task.slug === 'bfs-shortest-path') {
    return `import unittest\nfrom solution import shortest_path_grid\n\n\nclass BfsShortestPathTest(unittest.TestCase):\n    def test_examples(self):\n        self.assertEqual(shortest_path_grid([[0, 0], [1, 0]]), 3)\n        self.assertEqual(shortest_path_grid([[0, 1], [1, 0]]), -1)\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
  }

  if (task.slug === 'dfs-connected-components') {
    return `import unittest\nfrom solution import count_components\n\n\nclass DfsConnectedComponentsTest(unittest.TestCase):\n    def test_examples(self):\n        self.assertEqual(count_components(5, [(0, 1), (1, 2), (3, 4)]), 2)\n        self.assertEqual(count_components(3, []), 3)\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
  }

  if (task.slug === 'climbing-stairs') {
    return `import unittest\nfrom solution import climb_stairs\n\n\nclass ClimbingStairsTest(unittest.TestCase):\n    def test_examples(self):\n        self.assertEqual(climb_stairs(1), 1)\n        self.assertEqual(climb_stairs(5), 8)\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
  }

  return `import unittest\nfrom solution import coin_change\n\n\nclass CoinChangeTest(unittest.TestCase):\n    def test_examples(self):\n        self.assertEqual(coin_change([1, 2, 5], 11), 3)\n        self.assertEqual(coin_change([2], 3), -1)\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
}

export function createScaffoldFiles(task: TaskContext): ScaffoldFiles {
  return {
    solution: solutionTemplate(task),
    test: testTemplate(task),
  };
}
