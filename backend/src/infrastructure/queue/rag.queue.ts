import { Queue, Worker, Job } from 'bullmq'

export interface RAGJobData {
  documentId: string
  userId: string
  s3Key: string
}

export function createRAGQueue(redisUrl: string): Queue {
  return new Queue('rag-pipeline', {
    connection: {
      url: redisUrl,
    },
  })
}

export function createRAGWorker(
  redisUrl: string,
  processor: (job: Job<RAGJobData>) => Promise<void>
): Worker {
  return new Worker<RAGJobData>('rag-pipeline', processor, {
    connection: {
      url: redisUrl,
    },
    concurrency: 5,
  })
}
