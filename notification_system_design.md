# Notification System Design

## Stage 1

### How I'm scoring notifications

I wanted a way to rank notifications so that the most important ones show up first. The idea is pretty simple — each notification gets a score based on two things:

1. **What type it is** (placement notices are way more urgent than random events)
2. **How recent it is** (newer stuff should generally rank higher)

The formula:
```
score = typeWeight * 0.6 + recencyScore * 0.4
```

I went with 0.6/0.4 split because the type of notification matters more than when it was posted. A placement notice from yesterday is still more important than a campus event from today.

**Type weights I'm using:**
- Placement = 3 (these directly affect job opportunities, can't miss them)
- Result = 2 (exam results are important but not as time-critical)
- Event = 1 (campus events, cultural stuff — nice to know but not urgent)

**Recency** is normalized between 0 and 1 using min-max scaling:
```
recencyScore = (timestamp - oldest) / (newest - oldest)
```
So the newest notification gets ~1.0 and the oldest gets ~0.0. If everything has the same timestamp they all get 1.0.

### Why I used a min-heap

The problem is basically "find the top n items out of m total". Two ways to do this:

**Option 1 — Sort everything:** O(m log m) time, O(m) space. Simple but wasteful when m is large and we only need a few.

**Option 2 — Min-heap of size n:** O(m log n) time, O(n) space. This is what I went with.

How it works:
1. Go through each notification one by one
2. If the heap has less than n items, just add it
3. If the heap is full, check if the new notification scores higher than the lowest one in the heap. If yes, swap them out.
4. At the end the heap has exactly the top n notifications

The reason it's a *min*-heap (not max) is because we need quick access to the smallest item — that's the one we might want to kick out when something better comes along.

When n=10 and m=60 (which is roughly what the API gives us), the difference isn't huge. But the heap approach scales better if the dataset grows.

### Handling ties

If two notifications end up with the exact same score:
1. The more recent one wins
2. If same timestamp too, placement > result > event
3. If still tied, whichever came first in the data stays (I track insertion order with a counter)
