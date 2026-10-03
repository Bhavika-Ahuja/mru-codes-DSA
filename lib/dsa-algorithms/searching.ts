import { AnimationStep, ArrayElement } from "@/types/dsa-visualizer";

function createArrayElement(value: number, index: number): ArrayElement {
  return {
    value,
    id: `${value}-${index}-${Date.now()}`,
    state: "default",
  };
}

function cloneArray(arr: ArrayElement[]): ArrayElement[] {
  return arr.map((el) => ({ ...el }));
}

export function linearSearch(arr: number[], target: number): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: `Starting Linear Search for ${target}`,
    code: "function linearSearch(arr, target) {",
    lineNumber: 1,
    complexity: "Time: O(n) | Space: O(1)",
    variables: { target },
  });

  for (let i = 0; i < array.length; i++) {
    array[i].state = "comparing";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [i],
      description: `Checking index ${i}: ${array[i].value} === ${target}?`,
      code: "if (arr[i] === target) {",
      lineNumber: 3,
      variables: { i, target },
    });

    if (array[i].value === target) {
      array[i].state = "found";
      steps.push({
        array: cloneArray(array),
        highlightIndices: [i],
        description: `Found ${target} at index ${i}!`,
        code: "return i;",
        lineNumber: 4,
        variables: { i, target },
      });
      return steps;
    }

    array[i].state = "notfound";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [i],
      description: `${array[i].value} ≠ ${target}, continue searching...`,
      code: "// Continue to next element",
      lineNumber: 6,
      variables: { i, target },
    });
  }

  steps.push({
    array: cloneArray(array),
    description: `${target} not found in array`,
    code: "return -1;",
    lineNumber: 8,
    variables: { target },
  });

  return steps;
}

export function binarySearch(arr: number[], target: number): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: `Starting Binary Search for ${target} (array must be sorted)`,
    code: "function binarySearch(arr, target) {",
    lineNumber: 1,
    complexity: "Time: O(log n) | Space: O(1)",
    variables: { target },
  });

  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    // Highlight search space
    for (let i = 0; i < array.length; i++) {
      if (i >= left && i <= right) {
        array[i].state = i === mid ? "pivot" : "comparing";
      } else {
        array[i].state = "notfound";
      }
    }

    steps.push({
      array: cloneArray(array),
      highlightIndices: [left, mid, right],
      description: `Search space: [${left}..${right}], checking middle index ${mid}`,
      code: "let mid = Math.floor((left + right) / 2);",
      lineNumber: 4,
      variables: { left, mid, right, target },
    });

    steps.push({
      array: cloneArray(array),
      highlightIndices: [mid],
      description: `Comparing ${array[mid].value} with target ${target}`,
      code: "if (arr[mid] === target) {",
      lineNumber: 5,
      variables: { left, mid, right, target },
    });

    if (array[mid].value === target) {
      array[mid].state = "found";
      steps.push({
        array: cloneArray(array),
        highlightIndices: [mid],
        description: `Found ${target} at index ${mid}!`,
        code: "return mid;",
        lineNumber: 6,
        variables: { mid, target },
      });
      return steps;
    }

    if (array[mid].value < target) {
      steps.push({
        array: cloneArray(array),
        highlightIndices: [mid],
        description: `${array[mid].value} < ${target}, search right half`,
        code: "left = mid + 1;",
        lineNumber: 8,
        variables: { left, mid, right, target },
      });
      left = mid + 1;
    } else {
      steps.push({
        array: cloneArray(array),
        highlightIndices: [mid],
        description: `${array[mid].value} > ${target}, search left half`,
        code: "right = mid - 1;",
        lineNumber: 10,
        variables: { left, mid, right, target },
      });
      right = mid - 1;
    }
  }

  array.forEach((el) => (el.state = "notfound"));
  steps.push({
    array: cloneArray(array),
    description: `${target} not found in array`,
    code: "return -1;",
    lineNumber: 13,
    variables: { target },
  });

  return steps;
}

export function jumpSearch(arr: number[], target: number): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));
  const n = array.length;
  const jump = Math.floor(Math.sqrt(n));

  steps.push({
    array: cloneArray(array),
    description: `Starting Jump Search for ${target} (jump size: ${jump})`,
    code: "function jumpSearch(arr, target) {",
    lineNumber: 1,
    complexity: "Time: O(√n) | Space: O(1)",
    variables: { target, jump },
  });

  let prev = 0;

  while (prev < n && array[Math.min(jump, n) - 1].value < target) {
    const jumpIdx = Math.min(jump + prev, n - 1);

    array[jumpIdx].state = "comparing";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [jumpIdx],
      description: `Jump to index ${jumpIdx}: ${array[jumpIdx].value} < ${target}?`,
      code: "while (arr[min(jump, n) - 1] < target) {",
      lineNumber: 4,
      variables: { prev, jump: prev + jump, target },
    });

    if (array[jumpIdx].value >= target) {
      break;
    }

    array[jumpIdx].state = "notfound";
    prev += jump;

    if (prev >= n) {
      array.forEach((el) => (el.state = "notfound"));
      steps.push({
        array: cloneArray(array),
        description: `${target} not found in array`,
        code: "return -1;",
        lineNumber: 10,
        variables: { target },
      });
      return steps;
    }
  }

  steps.push({
    array: cloneArray(array),
    description: `Linear search in block starting at index ${prev}`,
    code: "// Linear search in current block",
    lineNumber: 7,
    variables: { prev, target },
  });

  for (let i = prev; i < Math.min(prev + jump, n); i++) {
    array[i].state = "comparing";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [i],
      description: `Checking index ${i}: ${array[i].value} === ${target}?`,
      code: "if (arr[i] === target) {",
      lineNumber: 8,
      variables: { i, target },
    });

    if (array[i].value === target) {
      array[i].state = "found";
      steps.push({
        array: cloneArray(array),
        highlightIndices: [i],
        description: `Found ${target} at index ${i}!`,
        code: "return i;",
        lineNumber: 9,
        variables: { i, target },
      });
      return steps;
    }

    array[i].state = "notfound";
  }

  array.forEach((el) => (el.state = "notfound"));
  steps.push({
    array: cloneArray(array),
    description: `${target} not found in array`,
    code: "return -1;",
    lineNumber: 12,
    variables: { target },
  });

  return steps;
}
