export function resolveVoteCounts({
  upvotes,
  downvotes,
  myVote,
  optimisticMyVote,
}: {
  upvotes: number;
  downvotes: number;
  myVote?: number | null;
  optimisticMyVote?: number | null;
}): {
  displayUpvotes: number;
  displayDownvotes: number;
  displayScore: number;
  isUpvoted: boolean;
  isDownvoted: boolean;
} {
  const prevVote = myVote ?? 0;
  const curVote = optimisticMyVote ?? prevVote;
  const upvoteDiff = (curVote > 0 ? 1 : 0) - (prevVote > 0 ? 1 : 0);
  const downvoteDiff = (curVote < 0 ? 1 : 0) - (prevVote < 0 ? 1 : 0);
  const displayUpvotes = upvotes + upvoteDiff;
  const displayDownvotes = downvotes + downvoteDiff;
  return {
    displayUpvotes,
    displayDownvotes,
    displayScore: displayUpvotes - displayDownvotes,
    isUpvoted: curVote > 0,
    isDownvoted: curVote < 0,
  };
}

/**
 * Sends the votes on one post or comment one at a time, in click order, so
 * they can't reach the server out of order. Votes on different keys still run
 * in parallel.
 *
 * Each vote takes a ticket when it's made. Only the latest ticket's response
 * may clear the optimistic vote; an older response would otherwise undo a
 * newer click until its own response arrives.
 *
 * Exported for testing
 */
export function createVoteQueue() {
  const tails = new Map<string, Promise<unknown>>();
  const latestTickets = new Map<string, number>();
  let nextTicket = 0;

  return {
    ticket(key: string) {
      const ticket = ++nextTicket;
      latestTickets.set(key, ticket);
      return ticket;
    },
    isLatest(key: string, ticket: number) {
      return latestTickets.get(key) === ticket;
    },
    run<T>(key: string, task: () => Promise<T>): Promise<T> {
      const prev = tails.get(key) ?? Promise.resolve();
      const result = prev.then(task);
      // A failed vote mustn't stop the ones after it
      const tail = result.catch(() => {});
      tails.set(key, tail);
      void tail.then(() => {
        if (tails.get(key) === tail) {
          tails.delete(key);
        }
      });
      return result;
    },
  };
}

export const voteQueue = createVoteQueue();

/** For "Couldn't <verb> post" */
export function voteVerb(score: number) {
  switch (score) {
    case 1:
      return "upvote";
    case -1:
      return "downvote";
    default:
      return "remove vote on";
  }
}
