import { useSettingsStore } from '../stores/settings';

export interface AITaggingResult {
  success: boolean;
  tags?: string[];
  error?: string;
  promptUsed?: string;
  rawResponse?: string;
}

/**
 * 通过 Vite 代理抓取网页，提取 title 和 meta description
 */
async function fetchPageMeta(url: string, signal?: AbortSignal): Promise<string> {
  if (!url || !url.startsWith('http')) return '无有效 URL';
  
  try {
    const fetchUrl = `/api/fetch-page?url=${encodeURIComponent(url)}`;
    const res = await fetch(fetchUrl, { signal });
    if (!res.ok) return '无法访问该网页';
    
    const html = await res.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    const desc = descMatch?.[1]?.trim() || '';

    // 检测是否遇到了 Cloudflare 等反爬盾
    const isBotProtection = 
      title.includes('Just a moment') || 
      title.includes('Attention Required') ||
      html.includes('Enable JavaScript and cookies to continue') ||
      html.includes('cloudflare');

    if (isBotProtection) {
      return '触发了反爬保护，未能获取到有效内容';
    }

    let result = '';
    if (title) result += `页面原标题: ${title}\n`;
    if (desc) result += `页面简介: ${desc}\n`;
    
    return result || '未能提取到有效的页面介绍';
  } catch {
    return '网页抓取失败或超时';
  }
}

export async function generateTagsForBookmark(
  title: string, 
  url: string, 
  signal?: AbortSignal
): Promise<AITaggingResult> {
  const store = useSettingsStore();
  const provider = store.activeProvider;

  if (!provider) {
    return { success: false, error: '未选择 AI 配置' };
  }

  if (!provider.apiKey) {
    return { success: false, error: '未配置 API Key' };
  }

  // 先尝试抓取网页元数据
  const pageContent = await fetchPageMeta(url, signal);

  // Replace placeholders in the prompt template
  const prompt = store.aiPromptTemplate
    .replace(/\{\{title\}\}/g, title || '未知')
    .replace(/\{\{url\}\}/g, url || '无')
    .replace(/\{\{content\}\}/g, pageContent);

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      signal,
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1 // Use low temperature for more deterministic categorization
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: `API 请求失败 (${response.status}): ${errorData.error?.message || response.statusText}` 
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: '模型返回内容为空', promptUsed: prompt };
    }

    // Attempt to parse JSON from the response.
    // Sometimes models wrap JSON in markdown block like ```json ... ```
    let jsonString = content.trim();
    
    // Remove markdown code block markers if present
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(json)?\n/, '');
      jsonString = jsonString.replace(/\n```$/, '');
    }

    let parsedTags;
    try {
      parsedTags = JSON.parse(jsonString);
    } catch (e) {
      return { success: false, error: '模型返回的不是有效的 JSON 格式', promptUsed: prompt, rawResponse: content };
    }

    if (!Array.isArray(parsedTags)) {
      return { success: false, error: '模型返回的不是有效的 JSON 数组', promptUsed: prompt, rawResponse: content };
    }

    // Clean and limit tags
    const validTags = parsedTags
      .map(tag => String(tag).trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5); // Limit to 5 tags max to be safe

    if (validTags.length === 0) {
      return { success: false, error: '模型未能生成有效的标签', promptUsed: prompt, rawResponse: content };
    }

    return { success: true, tags: validTags, promptUsed: prompt };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: '请求被取消' };
    }
    return { success: false, error: `网络错误: ${error.message}` };
  }
}

export interface AITitleResult {
  success: boolean;
  title?: string;
  error?: string;
  promptUsed?: string;
  rawResponse?: string;
}

export async function generateTitleForBookmark(url: string, signal?: AbortSignal): Promise<AITitleResult> {
  const store = useSettingsStore();
  const activeProvider = store.activeProvider;

  if (!activeProvider) {
    return { success: false, error: '未配置 AI API，请先在设置页配置并启用。' };
  }

  // 1. 获取网页元数据（包含标题）
  const pageMeta = await fetchPageMeta(url, signal);
  const htmlTitle = pageMeta.startsWith('页面原标题:') ? (pageMeta.split('\n')[0]?.replace('页面原标题: ', '') || '') : '';

  // 2. 组装 prompt
  const systemPrompt = `你是一个专业的网站标题提取助手。你的任务是从杂乱的网页原始 <title> 和 URL 中，提取出这个网站或页面最核心、最简短的真实名字（如产品名、网站名、文章核心标题）。
请直接输出这个简短干净的名字（不要超过 15 个字），绝对不要输出任何标点符号、解释说明或分析过程。

示例：
URL: https://github.com/vuejs/core
Title: vuejs/core: Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.
输出: Vue.js 源码

URL: https://www.bilibili.com/video/BV1...
Title: 某某游戏实况解说_哔哩哔哩_bilibili
输出: 哔哩哔哩 - 某某游戏实况解说`;

  const userPrompt = `URL: ${url}\nTitle: ${htmlTitle || '无法获取标题'}\n\n输出:`;

  try {
    const response = await fetch(`${activeProvider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeProvider.apiKey}`
      },
      signal,
      body: JSON.stringify({
        model: activeProvider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1 // 低 temperature，保证回答确定且简洁
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: `API 请求失败 (${response.status}): ${errorData.error?.message || response.statusText}` 
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: '模型返回内容为空', promptUsed: userPrompt };
    }

    const cleanTitle = content.trim().replace(/^["']|["']$/g, ''); // 移除可能的首尾引号

    if (!cleanTitle) {
      return { success: false, error: '模型提取的标题为空', promptUsed: userPrompt, rawResponse: content };
    }

    return { success: true, title: cleanTitle, promptUsed: userPrompt };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: '请求被取消' };
    }
    return { success: false, error: `网络错误: ${error.message}` };
  }
}
