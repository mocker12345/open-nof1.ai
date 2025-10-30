import { prisma } from "../prisma";

/**
 * Get the timestamp of the first trading session
 * This looks for the earliest Chat record and uses its createdAt as the start time
 */
export async function getFirstTradeTime(): Promise<Date> {
  try {
    // Find the earliest chat record
    const earliestChat = await prisma.chat.findFirst({
      orderBy: {
        createdAt: 'asc'
      }
    });

    // If we have chat records, use the earliest one
    if (earliestChat) {
      return earliestChat.createdAt;
    }

    // If no chat records exist, return current time (this will be the first trade)
    return new Date();
  } catch (error) {
    console.error('Error getting first trade time:', error);
    // Fallback to current time if there's an error
    return new Date();
  }
}

/**
 * Get minutes elapsed since the first trading session
 */
export async function getMinutesElapsedSinceFirstTrade(): Promise<number> {
  const firstTradeTime = await getFirstTradeTime();
  const now = new Date();
  const minutesElapsed = Math.floor((now.getTime() - firstTradeTime.getTime()) / (1000 * 60));
  return minutesElapsed;
}