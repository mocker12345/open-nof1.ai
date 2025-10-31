import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ModelType } from "@prisma/client";

export const GET = async (request: NextRequest) => {
  const chat = await prisma.chat.findMany({
    where: {
      model: ModelType.Deepseek,
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tradings: {
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  console.log('🔍 Chat API debug:');
  console.log(`- Found ${chat.length} chats`);

  chat.forEach((c, index) => {
    console.log(`Chat ${index + 1}: ${c.id}, ${c.tradings.length} trades`);
    c.tradings.forEach((trade, tIndex) => {
      console.log(`  Trade ${tIndex + 1}: ${trade.symbol}, ${trade.opeartion}`);
      console.log(`    - stopLoss: ${trade.stopLoss}`);
      console.log(`    - takeProfit: ${trade.takeProfit}`);
      console.log(`    - riskUsd: ${trade.riskUsd}`);
      console.log(`    - invalidationCondition: ${trade.invalidationCondition}`);
      console.log(`    - confidence: ${trade.confidence}`);
    });
  });

  return NextResponse.json({
    data: chat,
  });
};
