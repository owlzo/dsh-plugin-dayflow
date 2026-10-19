/**
 * Panel copy. Registered as one namespace so the slot runtime injects a bound
 * `t` into the panel and the header toggle.
 * @module dsh-plugin-dayflow/client/locale
 */

export const NAMESPACE = 'dayflowPanel';

/** Simplified Chinese copy. */
export const ZH: Record<string, string> = {
  button: 'Dayflow',
  open: '打开 Dayflow 时间线',
  prev: '前一天',
  next: '后一天',
  refresh: '刷新',
  today: '今天',
  yesterday: '昨天',
  loading: '正在加载时间线…',
  empty: '这一天没有记录',
  emptyHint: 'Dayflow 会分批分析录屏，最近的时间可能稍有延迟。',
  error: '无法加载时间线',
  network: '连接不到 dsh 服务，请确认它还在运行。',
  retry: '重试',
  tracked: '已记录',
  pending: '还有 {count} 个批次等待分析，新记录会稍后出现。',
  guideTitle: 'Dayflow 时间线',
  guideDescription: '查看今天的活动记录，以及每个分类占用的时间。',
  previousDay: '前一天',
  nextDay: '后一天',
};

/** English copy. */
export const EN: Record<string, string> = {
  button: 'Dayflow',
  open: 'Open the Dayflow timeline',
  prev: 'Previous day',
  next: 'Next day',
  refresh: 'Refresh',
  today: 'Today',
  yesterday: 'Yesterday',
  loading: 'Loading the timeline…',
  empty: 'Nothing recorded for this day',
  emptyHint: 'Dayflow analyzes recordings in batches, so recent time can lag.',
  error: 'Could not load the timeline',
  network: 'Could not reach the dsh server; check that it is still running.',
  retry: 'Retry',
  tracked: 'tracked',
  pending: '{count} batches are still waiting for analysis; newer activity appears later.',
  guideTitle: 'Dayflow timeline',
  guideDescription: 'See what was recorded today and how the day split across categories.',
  previousDay: 'Previous day',
  nextDay: 'Next day',
};
