// Full algorithm code templates for visualization

export const BUBBLE_SORT_CODE = `function bubbleSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        // Swap elements
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;
      }
    }
    
    // If no swaps, array is sorted
    if (!swapped) break;
  }
  
  return arr;
}`;

export const SELECTION_SORT_CODE = `function selectionSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    
    if (minIdx !== i) {
      // Swap elements
      let temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;
    }
  }
  
  return arr;
}`;

export const INSERTION_SORT_CODE = `function insertionSort(arr) {
  const n = arr.length;
  
  for (let i = 1; i < n; i++) {
    let key = arr[i];
    let j = i - 1;
    
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    
    arr[j + 1] = key;
  }
  
  return arr;
}`;

export const QUICK_SORT_CODE = `function quickSort(arr, low, high) {
  if (low < high) {
    let pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
}

function partition(arr, low, high) {
  let pivot = arr[high];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++;
      // Swap arr[i] and arr[j]
      let temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
  
  // Swap arr[i+1] and arr[high]
  let temp = arr[i + 1];
  arr[i + 1] = arr[high];
  arr[high] = temp;
  
  return i + 1;
}`;

export const MERGE_SORT_CODE = `function mergeSort(arr, left, right) {
  if (left < right) {
    let mid = Math.floor((left + right) / 2);
    
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
  }
}

function merge(arr, left, mid, right) {
  let leftArr = arr.slice(left, mid + 1);
  let rightArr = arr.slice(mid + 1, right + 1);
  
  let i = 0, j = 0, k = left;
  
  while (i < leftArr.length && j < rightArr.length) {
    if (leftArr[i] <= rightArr[j]) {
      arr[k++] = leftArr[i++];
    } else {
      arr[k++] = rightArr[j++];
    }
  }
  
  while (i < leftArr.length) {
    arr[k++] = leftArr[i++];
  }
  
  while (j < rightArr.length) {
    arr[k++] = rightArr[j++];
  }
}`;

export const LINEAR_SEARCH_CODE = `function linearSearch(arr, target) {
  const n = arr.length;
  
  for (let i = 0; i < n; i++) {
    if (arr[i] === target) {
      return i; // Found at index i
    }
  }
  
  return -1; // Not found
}`;

export const BINARY_SEARCH_CODE = `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid; // Found at index mid
    }
    
    if (arr[mid] < target) {
      left = mid + 1; // Search right half
    } else {
      right = mid - 1; // Search left half
    }
  }
  
  return -1; // Not found
}`;

export const JUMP_SEARCH_CODE = `function jumpSearch(arr, target) {
  const n = arr.length;
  let step = Math.floor(Math.sqrt(n));
  let prev = 0;
  
  while (arr[Math.min(step, n) - 1] < target) {
    prev = step;
    step += Math.floor(Math.sqrt(n));
    
    if (prev >= n) {
      return -1; // Not found
    }
  }
  
  // Linear search in current block
  for (let i = prev; i < Math.min(step, n); i++) {
    if (arr[i] === target) {
      return i; // Found at index i
    }
  }
  
  return -1; // Not found
}`;

// Map algorithm names to their code templates
export const CODE_TEMPLATES: Record<string, string> = {
  bubble: BUBBLE_SORT_CODE,
  selection: SELECTION_SORT_CODE,
  insertion: INSERTION_SORT_CODE,
  quick: QUICK_SORT_CODE,
  merge: MERGE_SORT_CODE,
  linear: LINEAR_SEARCH_CODE,
  binary: BINARY_SEARCH_CODE,
  jump: JUMP_SEARCH_CODE,
};
