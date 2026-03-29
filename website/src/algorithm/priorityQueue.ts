class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  private swap(i: number, j: number): void {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.items[parentIndex].priority >= this.items[currentIndex].priority) {
        break;
      }

      this.swap(parentIndex, currentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const leftChildIndex = 2 * currentIndex + 1;
      const rightChildIndex = 2 * currentIndex + 2;
      let largestIndex = currentIndex;

      if (
        leftChildIndex < this.items.length &&
        this.items[leftChildIndex].priority > this.items[largestIndex].priority
      ) {
        largestIndex = leftChildIndex;
      }

      if (
        rightChildIndex < this.items.length &&
        this.items[rightChildIndex].priority > this.items[largestIndex].priority
      ) {
        largestIndex = rightChildIndex;
      }

      if (largestIndex === currentIndex) {
        break;
      }

      this.swap(currentIndex, largestIndex);
      currentIndex = largestIndex;
    }
  }

  push(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const topItem = this.items[0].item;
    const last = this.items.pop();

    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return topItem;
  }

  top(): T | undefined {
    return this.items[0]?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

export default PriorityQueue;
