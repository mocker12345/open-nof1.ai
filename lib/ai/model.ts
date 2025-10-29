import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// ARK API 选项接口
interface ArkGenerateOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  temperature?: number;
  max_tokens?: number;
}

// ARK API 响应接口
interface ArkResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// 自定义ARK API客户端
class ArkClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = "https://ark.cn-beijing.volces.com/api/v3") {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generateObject(options: ArkGenerateOptions) {
    // 添加JSON格式要求到系统消息
    const messages = [
      {
        role: "system",
        content: `请严格按照以下JSON格式返回交易决策，不要包含任何其他文字：
${JSON.stringify(options.schema, null, 2)}`
      },
      ...options.messages
    ];

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ARK API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    let cleanContent = '';

    try {
      // 清理可能的markdown代码块标记
      cleanContent = content.trim();

      // 移除可能的 ```json 和 ``` 标记
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      // 再次清理可能的空白字符
      cleanContent = cleanContent.trim();

      return {
        object: JSON.parse(cleanContent),
        reasoning: null, // ARK API不提供reasoning字段
      };
    } catch (parseError) {
      console.error("Failed to parse JSON response:", content);
      console.error("Cleaned content:", cleanContent);
      throw new Error(`JSON解析失败: ${(parseError as Error).message}`);
    }
  }
}

// 火山引擎 ARK API 配置
const arkClient = new ArkClient(
  process.env.ARK_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  "https://ark.cn-beijing.volces.com/api/v3"
);

// DeepSeek官方API 配置 (备用)
const deepseekModel = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.ai/v1",
});

// OpenRouter 配置 (备用)
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ARK 模型接口
export interface ArkModel {
  generateObject(options: {
    messages: Array<{ role: string; content: string }>;
    schema: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    object: any;
    reasoning: string | null;
  }>;
}

// 自定义ARK模型生成器
export function createArkModel(modelName: string): ArkModel {
  return {
    generateObject: async (options) => {
      return arkClient.generateObject({
        model: modelName,
        messages: options.messages,
        schema: options.schema,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
      });
    },
  };
}

// 火山引擎 DeepSeek 模型
export const deepseekArk = createArkModel("deepseek-v3-1-250821");
export const deepseekArkChat = createArkModel("deepseek-chat");
export const deepseekArkCoder = createArkModel("deepseek-coder");

// DeepSeek官方模型 (备用)
export const deepseek = deepseekModel("deepseek-chat");
export const deepseekThinking = deepseekModel("deepseek-reasoner");

// OpenRouter 模型 (备用)
export const deepseekv31 = openrouter("deepseek/deepseek-v3.2-exp");
export const deepseekR1 = openrouter("deepseek/deepseek-r1-0528");

// 默认推荐使用火山引擎的模型
export const defaultDeepSeekModel = deepseekArk;
