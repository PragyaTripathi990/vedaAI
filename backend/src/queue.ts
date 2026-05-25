import { Queue, QueueEvents } from "bullmq";
import { redisConnection } from "./redis";

export const ASSIGNMENT_QUEUE = "assignment-generation";

export const assignmentQueue = new Queue(ASSIGNMENT_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export const assignmentQueueEvents = new QueueEvents(ASSIGNMENT_QUEUE, {
  connection: redisConnection,
});
