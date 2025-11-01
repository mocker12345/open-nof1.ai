import { prisma } from "@/lib/prisma";
import { ModelType } from "@prisma/client";
import { NextResponse } from "next/server";
import { MetricData } from "@/lib/types/metrics";

// 最大返回数据点数量
const MAX_DATA_POINTS = 50;

/**
 * 智能采样数据，优先保留最新数据点和关键时间点
 * @param data - 原始数据数组
 * @param sampleSize - 需要采样的数量
 * @returns 采样后的数据，保持时间顺序
 */
function smartSample<T>(data: T[], sampleSize: number): T[] {
  if (data.length <= sampleSize) {
    return data;
  }

  const result: T[] = [];
  const dataLength = data.length;

  // 总是保留最新的数据点
  result.push(data[dataLength - 1]);

  if (sampleSize === 1) {
    return result;
  }

  // 保留最早的数据点
  result.unshift(data[0]);

  if (sampleSize === 2) {
    return result;
  }

  // 计算中间需要采样的点数
  const remainingSlots = sampleSize - 2;
  const middleData = data.slice(1, -1);

  if (middleData.length <= remainingSlots) {
    // 如果中间数据点足够少，全部保留
    result.splice(1, 0, ...middleData);
  } else {
    // 均匀采样中间部分
    const step = middleData.length / remainingSlots;
    for (let i = 0; i < remainingSlots; i++) {
      const index = Math.floor(i * step);
      if (index < middleData.length) {
        result.splice(1 + i, 0, middleData[index]);
      }
    }
  }

  return result;
}

export const GET = async () => {
  try {
    const metrics = await prisma.metrics.findFirst({
      where: {
        model: ModelType.Deepseek,
      },
    });

    if (!metrics) {
      return NextResponse.json({
        data: {
          metrics: [],
          totalCount: 0,
        },
        success: true,
      });
    }

    const databaseMetrics = metrics.metrics as unknown as {
      createdAt: string;
      accountInformationAndPerformance: MetricData[];
    }[];

    const metricsData = databaseMetrics
      .map((item, index) => {
        const metricData = item.accountInformationAndPerformance as MetricData;
        return {
          ...metricData,
          createdAt: item.createdAt || new Date().toISOString(),
          // 添加原始索引用于排序验证
          originalIndex: index,
        };
      })
      .filter((item) => item.availableCash > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // 确保时间顺序

    // 使用智能采样，优先保留最新数据点
    const sampledMetrics = smartSample(metricsData, MAX_DATA_POINTS);

    // 添加调试信息
    if (sampledMetrics.length > 0) {
      const oldestPoint = sampledMetrics[0];
      const newestPoint = sampledMetrics[sampledMetrics.length - 1];
      console.log(
        `📊 Metrics: ${metricsData.length} → ${sampledMetrics.length} | ` +
        `Time range: ${new Date(oldestPoint.createdAt).toLocaleTimeString()} - ${new Date(newestPoint.createdAt).toLocaleTimeString()}`
      );
    } else {
      console.log(`📊 No valid metrics data found`);
    }

    return NextResponse.json({
      data: {
        metrics: sampledMetrics,
        totalCount: metricsData.length,
        model: metrics?.model || ModelType.Deepseek,
        name: metrics?.name || "Deepseek Trading Bot",
        createdAt: metrics?.createdAt || new Date().toISOString(),
        updatedAt: metrics?.updatedAt || new Date().toISOString(),
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({
      data: {
        metrics: [],
        totalCount: 0,
        model: ModelType.Deepseek,
        name: "Deepseek Trading Bot",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      success: true,
    });
  }
};
