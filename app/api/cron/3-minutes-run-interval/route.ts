import { run } from "@/lib/ai/run";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export const GET = async (request: NextRequest) => {
  // Extract token from query parameters
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Token is required", { status: 400 });
  }

  try {
    // 临时方案：直接比较字符串token
    if (token !== process.env.CRON_SECRET_KEY) {
      return new Response("Invalid token", { status: 401 });
    }
    // JWT方案（暂时注释）
    // jwt.verify(token, process.env.CRON_SECRET_KEY || "");
  } catch (error) {
    return new Response("Invalid token", { status: 401 });
  }

  await run(Number(process.env.START_MONEY));

  return new Response("Process executed successfully");
};
