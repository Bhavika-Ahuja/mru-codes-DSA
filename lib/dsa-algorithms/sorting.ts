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

export function bubbleSort(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: "Starting Bubble Sort",
    code: "function bubbleSort(arr) {",
    lineNumber: 1,
    complexity: "Time: O(n²) | Space: O(1)",
  });

  const n = array.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;

    steps.push({
      array: cloneArray(array),
      description: `Pass ${i + 1}: Starting new pass through the array`,
      code: "for (let i = 0; i < n - 1; i++) {",
      lineNumber: 4,
      variables: { i, n, swapped },
    });

    for (let j = 0; j < n - i - 1; j++) {
      // Comparing
      array[j].state = "comparing";
      array[j + 1].state = "comparing";

      steps.push({
        array: cloneArray(array),
        highlightIndices: [j, j + 1],
        description: `Comparing ${array[j].value} and ${array[j + 1].value}`,
        code: "if (arr[j] > arr[j + 1]) {",
        lineNumber: 8,
        variables: { i, j, swapped },
      });

      if (array[j].value > array[j + 1].value) {
        // Swapping
        array[j].state = "swapping";
        array[j + 1].state = "swapping";

        steps.push({
          array: cloneArray(array),
          highlightIndices: [j, j + 1],
          description: `Swapping ${array[j].value} and ${array[j + 1].value}`,
          code: "swap(arr, j, j + 1);",
          lineNumber: 10,
          variables: { i, j, swapped: true },
        });

        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        swapped = true;
      }

      array[j].state = "default";
      array[j + 1].state = "default";
    }

    // Mark last element as sorted
    array[n - i - 1].state = "sorted";

    steps.push({
      array: cloneArray(array),
      description: `Element ${array[n - i - 1].value} is now in correct position`,
      code: "// Mark as sorted",
      lineNumber: 7,
      variables: { i, swapped },
    });

    if (!swapped) {
      steps.push({
        array: cloneArray(array),
        description: "No swaps made - array is sorted!",
        code: "if (!swapped) break;",
        lineNumber: 18,
      });
      break;
    }
  }

  // Mark all as sorted
  array.forEach((el) => (el.state = "sorted"));
  steps.push({
    array: cloneArray(array),
    description: "Bubble Sort Complete!",
    code: "}",
    lineNumber: 21,
  });

  return steps;
}

export function selectionSort(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: "Starting Selection Sort",
    code: "function selectionSort(arr) {",
    lineNumber: 1,
    complexity: "Time: O(n²) | Space: O(1)",
  });

  const n = array.length;

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    array[minIdx].state = "pivot";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [i],
      description: `Finding minimum element from index ${i}`,
      code: "let minIdx = i;",
      lineNumber: 2,
      variables: { i, minIdx },
    });

    for (let j = i + 1; j < n; j++) {
      array[j].state = "comparing";

      steps.push({
        array: cloneArray(array),
        highlightIndices: [minIdx, j],
        description: `Comparing ${array[minIdx].value} with ${array[j].value}`,
        code: "if (arr[j] < arr[minIdx]) {",
        lineNumber: 4,
        variables: { i, j, minIdx },
      });

      if (array[j].value < array[minIdx].value) {
        array[minIdx].state = "default";
        minIdx = j;
        array[minIdx].state = "pivot";

        steps.push({
          array: cloneArray(array),
          highlightIndices: [minIdx],
          description: `New minimum found: ${array[minIdx].value}`,
          code: "minIdx = j;",
          lineNumber: 5,
          variables: { i, j, minIdx },
        });
      } else {
        array[j].state = "default";
      }
    }

    if (minIdx !== i) {
      array[i].state = "swapping";
      array[minIdx].state = "swapping";

      steps.push({
        array: cloneArray(array),
        highlightIndices: [i, minIdx],
        description: `Swapping ${array[i].value} with minimum ${array[minIdx].value}`,
        code: "swap(arr, i, minIdx);",
        lineNumber: 7,
        variables: { i, minIdx },
      });

      [array[i], array[minIdx]] = [array[minIdx], array[i]];
    }

    array[i].state = "sorted";

    steps.push({
      array: cloneArray(array),
      description: `Element ${array[i].value} placed in correct position`,
      code: "// Mark as sorted",
      lineNumber: 8,
      variables: { i },
    });
  }

  array.forEach((el) => (el.state = "sorted"));
  steps.push({
    array: cloneArray(array),
    description: "Selection Sort Complete!",
    code: "}",
    lineNumber: 10,
  });

  return steps;
}

export function insertionSort(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: "Starting Insertion Sort",
    code: "function insertionSort(arr) {",
    lineNumber: 1,
    complexity: "Time: O(n²) | Space: O(1)",
  });

  for (let i = 1; i < array.length; i++) {
    const key = array[i].value;
    array[i].state = "pivot";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [i],
      description: `Selecting ${key} to insert into sorted portion`,
      code: "let key = arr[i];",
      lineNumber: 2,
      variables: { i, key },
    });

    let j = i - 1;

    while (j >= 0 && array[j].value > key) {
      array[j].state = "comparing";
      array[j + 1].state = "swapping";

      steps.push({
        array: cloneArray(array),
        highlightIndices: [j, j + 1],
        description: `${array[j].value} > ${key}, shifting right`,
        code: "while (j >= 0 && arr[j] > key) {",
        lineNumber: 4,
        variables: { i, j, key },
      });

      [array[j], array[j + 1]] = [array[j + 1], array[j]];
      array[j].state = "default";
      j--;
    }

    array.forEach((el, idx) => {
      if (idx <= i) el.state = "sorted";
      else el.state = "default";
    });

    steps.push({
      array: cloneArray(array),
      description: `${key} inserted at correct position`,
      code: "arr[j + 1] = key;",
      lineNumber: 7,
      variables: { i, j: j + 1, key },
    });
  }

  steps.push({
    array: cloneArray(array),
    description: "Insertion Sort Complete!",
    code: "}",
    lineNumber: 9,
  });

  return steps;
}

export function quickSort(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: "Starting Quick Sort",
    code: "function quickSort(arr, low, high) {",
    lineNumber: 1,
    complexity: "Time: O(n log n) | Space: O(log n)",
  });

  function partition(low: number, high: number): number {
    const pivot = array[high].value;
    array[high].state = "pivot";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [high],
      description: `Pivot selected: ${pivot}`,
      code: "let pivot = arr[high];",
      lineNumber: 2,
      variables: { low, high, pivot },
    });

    let i = low - 1;

    for (let j = low; j < high; j++) {
      array[j].state = "comparing";

      steps.push({
        array: cloneArray(array),
        highlightIndices: [j, high],
        description: `Comparing ${array[j].value} with pivot ${pivot}`,
        code: "if (arr[j] < pivot) {",
        lineNumber: 5,
        variables: { low, high, i, j, pivot },
      });

      if (array[j].value < pivot) {
        i++;
        if (i !== j) {
          array[i].state = "swapping";
          array[j].state = "swapping";

          steps.push({
            array: cloneArray(array),
            highlightIndices: [i, j],
            description: `Swapping ${array[i].value} and ${array[j].value}`,
            code: "swap(arr, i, j);",
            lineNumber: 6,
            variables: { low, high, i, j, pivot },
          });

          [array[i], array[j]] = [array[j], array[i]];
        }
      }

      array[j].state = "default";
      if (i >= 0) array[i].state = "default";
    }

    array[i + 1].state = "swapping";
    array[high].state = "swapping";

    steps.push({
      array: cloneArray(array),
      highlightIndices: [i + 1, high],
      description: `Placing pivot ${pivot} at correct position`,
      code: "swap(arr, i + 1, high);",
      lineNumber: 9,
      variables: { low, high, i, pivot },
    });

    [array[i + 1], array[high]] = [array[high], array[i + 1]];
    array[i + 1].state = "sorted";

    return i + 1;
  }

  function quickSortHelper(low: number, high: number) {
    if (low < high) {
      const pi = partition(low, high);

      quickSortHelper(low, pi - 1);
      quickSortHelper(pi + 1, high);
    } else if (low === high) {
      array[low].state = "sorted";
    }
  }

  quickSortHelper(0, array.length - 1);

  array.forEach((el) => (el.state = "sorted"));
  steps.push({
    array: cloneArray(array),
    description: "Quick Sort Complete!",
    code: "}",
    lineNumber: 15,
  });

  return steps;
}

export function mergeSort(arr: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  const array = arr.map((val, idx) => createArrayElement(val, idx));

  steps.push({
    array: cloneArray(array),
    description: "Starting Merge Sort",
    code: "function mergeSort(arr, left, right) {",
    lineNumber: 1,
    complexity: "Time: O(n log n) | Space: O(n)",
  });

  function merge(left: number, mid: number, right: number) {
    const leftArr = array.slice(left, mid + 1).map((el) => ({ ...el }));
    const rightArr = array.slice(mid + 1, right + 1).map((el) => ({ ...el }));

    leftArr.forEach((el) => (el.state = "comparing"));
    rightArr.forEach((el) => (el.state = "comparing"));

    steps.push({
      array: cloneArray(array),
      description: `Merging subarrays [${left}..${mid}] and [${mid + 1}..${right}]`,
      code: "merge(arr, left, mid, right);",
      lineNumber: 5,
      variables: { left, mid, right },
    });

    let i = 0,
      j = 0,
      k = left;

    while (i < leftArr.length && j < rightArr.length) {
      if (leftArr[i].value <= rightArr[j].value) {
        array[k] = { ...leftArr[i], state: "swapping" };
        i++;
      } else {
        array[k] = { ...rightArr[j], state: "swapping" };
        j++;
      }

      steps.push({
        array: cloneArray(array),
        highlightIndices: [k],
        description: `Placing ${array[k].value} at position ${k}`,
        code: "arr[k] = (leftArr[i] <= rightArr[j]) ? leftArr[i++] : rightArr[j++];",
        lineNumber: 7,
        variables: { left, mid, right, i, j, k },
      });

      k++;
    }

    while (i < leftArr.length) {
      array[k] = { ...leftArr[i], state: "swapping" };
      steps.push({
        array: cloneArray(array),
        highlightIndices: [k],
        description: `Copying remaining element ${array[k].value}`,
        code: "arr[k++] = leftArr[i++];",
        lineNumber: 9,
      });
      i++;
      k++;
    }

    while (j < rightArr.length) {
      array[k] = { ...rightArr[j], state: "swapping" };
      steps.push({
        array: cloneArray(array),
        highlightIndices: [k],
        description: `Copying remaining element ${array[k].value}`,
        code: "arr[k++] = rightArr[j++];",
        lineNumber: 11,
      });
      j++;
      k++;
    }

    for (let idx = left; idx <= right; idx++) {
      array[idx].state = "sorted";
    }
  }

  function mergeSortHelper(left: number, right: number) {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);

      steps.push({
        array: cloneArray(array),
        description: `Dividing array at index ${mid}`,
        code: "let mid = (left + right) / 2;",
        lineNumber: 3,
        variables: { left, right, mid },
      });

      mergeSortHelper(left, mid);
      mergeSortHelper(mid + 1, right);
      merge(left, mid, right);
    } else if (left === right) {
      array[left].state = "sorted";
    }
  }

  mergeSortHelper(0, array.length - 1);

  steps.push({
    array: cloneArray(array),
    description: "Merge Sort Complete!",
    code: "}",
    lineNumber: 14,
  });

  return steps;
}
