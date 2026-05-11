export class UnreadCountCacheService {
  private readonly cache = new Map<string, number>();

  get(userId: string) {
    return this.cache.get(userId);
  }

  set(userId: string, count: number) {
    this.cache.set(userId, count);
    return count;
  }

  increment(userId: string) {
    const nextValue = (this.cache.get(userId) ?? 0) + 1;
    this.cache.set(userId, nextValue);
    return nextValue;
  }

  decrement(userId: string) {
    const nextValue = Math.max((this.cache.get(userId) ?? 0) - 1, 0);
    this.cache.set(userId, nextValue);
    return nextValue;
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
  }
}

export const unreadCountCache = new UnreadCountCacheService();
