//MinHeap - keeps top-n highest scored items, smallest at root for easy eviction

export interface HeapItem<T> { score: number; sequence: number; data: T; }

export class MinHeap<T> {
  private heap: HeapItem<T>[] = [];
  private maxSize: number;
  constructor(maxSize: number) { this.maxSize = maxSize; }

  get size() { return this.heap.length; }

  insert(item: HeapItem<T>): boolean {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
      return true;
    }
    if (item.score > this.heap[0].score || (item.score === this.heap[0].score && item.sequence > this.heap[0].sequence)) {
      this.heap[0] = item;
      this.sinkDown(0);
      return true;
    }
    return false;
  }

  extractSorted(): T[] {
    return [...this.heap]
      .sort((a, b) => b.score !== a.score ? b.score - a.score : b.sequence - a.sequence)
      .map(item => item.data);
  }

  private less(a: HeapItem<T>, b: HeapItem<T>) {
    return a.score !== b.score ? a.score < b.score : a.sequence < b.sequence;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.less(this.heap[i], this.heap[p])) {
        [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
        i = p;
      } else break;
    }
  }

  private sinkDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let s = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.less(this.heap[l], this.heap[s])) s = l;
      if (r < n && this.less(this.heap[r], this.heap[s])) s = r;
      if (s !== i) { [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]]; i = s; }
      else break;
    }
  }
}