/**
 * Sanitized card copy for the README demo.
 *
 * The demo replays a real week of Dayflow data: timestamps, durations,
 * categories, and apps are the ones the app recorded. Every title and summary is
 * replaced, because that text names documents, colleagues, projects, and
 * research topics, none of which belong in a screenshot.
 *
 * Copy is dealt per day: each day starts a fresh shuffled deck for every
 * category, so no title repeats inside one day and the deck never runs dry while
 * a day still has cards of that category. The shuffle is seeded from the day
 * key, so rebuilding the demo produces byte-identical copy.
 * @module scripts/demo/fixture-text
 */

/** Fictional activities, in both languages, grouped by category. */
export const POOL = {
  Work: [
    {
      en: {
        title: 'Shipping the week view',
        summary: 'Packed the lanes so overlapping cards no longer cover each other, and kept the axis pinned to the data.',
      },
      zh: {
        title: '发布周视图',
        summary: '重新打包分道逻辑，重叠卡片不再互相遮挡，时间轴也始终贴着数据走。',
      },
    },
    {
      en: {
        title: 'Fixing lane packing',
        summary: 'Aligned the swim lanes, zoom, and hover cards with the harness tokens.',
      },
      zh: {
        title: '修复分道布局',
        summary: '把泳道、缩放和悬停卡片统一对齐到 harness 的设计令牌。',
      },
    },
    {
      en: {
        title: 'Reviewing the release notes',
        summary: 'Read the changelog end to end, checked the tag gate, and rewrote the upgrade section.',
      },
      zh: {
        title: '复核发布说明',
        summary: '通读变更日志，核对标签校验，然后重写了升级那一节。',
      },
    },
    {
      en: {
        title: 'Writing the panel tests',
        summary: 'Covered the four day states, the packed lanes, and the hover card clamping near the viewport edge.',
      },
      zh: {
        title: '补写面板测试',
        summary: '覆盖了四种日期状态、分道打包，以及贴住视口边缘时的悬停卡片。',
      },
    },
    {
      en: {
        title: 'Tracing a slow query',
        summary: 'Opened the database read-only, timed the range scan, and raised the busy timeout for the app checkpoints.',
      },
      zh: {
        title: '排查慢查询',
        summary: '以只读方式打开数据库，给区间扫描计时，并为应用的检查点调高了忙碌超时。',
      },
    },
    {
      en: {
        title: 'Reading the migration guide',
        summary: 'Compared the release notes with the plugin surface and listed the calls that moved.',
      },
      zh: {
        title: '阅读迁移指南',
        summary: '对照发布说明与插件接口，把发生位移的调用逐条列了出来。',
      },
    },
    {
      en: {
        title: 'Polishing the day detail',
        summary: 'Made the filter chips toggle, kept the selected day across views, and fixed the back arrow.',
      },
      zh: {
        title: '打磨日期详情',
        summary: '让筛选芯片可开可关，切换视图时保留选中日期，并修好了返回箭头。',
      },
    },
    {
      en: {
        title: 'Pairing on the icon cache',
        summary: 'One favicon per domain, cached on disk, loopback names refused, and a failure costs one request.',
      },
      zh: {
        title: '结对处理图标缓存',
        summary: '每个域名只抓一次图标并落盘缓存，拒绝 loopback 名称，失败也只付出一次请求。',
      },
    },
    {
      en: {
        title: 'Drafting the README',
        summary: 'Rewrote the install steps, the compatibility table, and the troubleshooting rows from scratch.',
      },
      zh: {
        title: '起草 README',
        summary: '重写了安装步骤、兼容性表格和故障排查那几行。',
      },
    },
    {
      en: {
        title: 'Fixing the timezone boundary',
        summary: 'The week stepped by 86,400,000 ms and lost a day across the change; it now steps by calendar day.',
      },
      zh: {
        title: '修正时区边界',
        summary: '按 86,400,000 毫秒推进会跨过夏令时丢掉一天，现在改成按日历日推进。',
      },
    },
    {
      en: {
        title: 'Auditing the bundle size',
        summary: 'Checked what the client half pulls in and kept the runtime dependency list at zero.',
      },
      zh: {
        title: '审查打包体积',
        summary: '检查客户端那一半引入了什么，把运行时依赖保持在零。',
      },
    },
    {
      en: {
        title: 'Answering review comments',
        summary: 'Walked a teammate through the diff, split one commit, and pushed the fix branch.',
      },
      zh: {
        title: '回复评审意见',
        summary: '和同事过了一遍改动，把一个提交拆开，然后推送了修复分支。',
      },
    },
    {
      en: {
        title: 'Sketching the ring geometry',
        summary: 'Derived each arc length from the category share and kept a hairline gap between neighbours.',
      },
      zh: {
        title: '推演圆环几何',
        summary: '按分类占比算出每段弧长，并在相邻弧段之间留出细缝。',
      },
    },
    {
      en: {
        title: 'Making the axis follow the data',
        summary: 'Started the hour axis an hour before the first card and ended it an hour after the last.',
      },
      zh: {
        title: '让时间轴跟着数据走',
        summary: '小时轴从第一条活动前一小时开始，到最后一条活动后一小时结束。',
      },
    },
    {
      en: {
        title: 'Hardening the write bridge',
        summary: 'Kept every write behind the app’s own permission switch and turned a closed switch into a clear error.',
      },
      zh: {
        title: '加固写入桥',
        summary: '所有写入都受应用自身的权限开关约束，开关关闭时给出清楚的错误。',
      },
    },
    {
      en: {
        title: 'Checking an empty day',
        summary: 'A captured day with nothing to show must not read as zero activity; drew the plain track instead.',
      },
      zh: {
        title: '检查空白日',
        summary: '有录屏却没有活动的日期不能画成零活动，于是改成一条浅色轨道。',
      },
    },
    {
      en: {
        title: 'Wiring the hover card',
        summary: 'Measured the card on mount, clamped it to the viewport, and flipped it above anchors near the bottom.',
      },
      zh: {
        title: '接通悬停卡片',
        summary: '挂载时测量卡片尺寸，贴住视口，靠近底部时自动翻到锚点上方。',
      },
    },
    {
      en: {
        title: 'Tightening the tool schemas',
        summary: 'Gave every failure a stable code so a caller can branch without parsing prose.',
      },
      zh: {
        title: '收紧工具模式',
        summary: '给每种失败一个稳定的错误码，调用方不必解析自然语言就能分支处理。',
      },
    },
    {
      en: {
        title: 'Replaying a week of data',
        summary: 'Drove the real components from a frozen payload to record the demo without touching a live database.',
      },
      zh: {
        title: '回放一周数据',
        summary: '用冻结的载荷驱动真实组件，在不碰实时数据库的前提下录出演示。',
      },
    },
    {
      en: {
        title: 'Sweeping the style tokens',
        summary: 'Replaced every hard-coded colour with a harness alias so the panel follows the theme.',
      },
      zh: {
        title: '清理样式令牌',
        summary: '把写死的颜色全部换成 harness 别名，面板因此能跟随主题。',
      },
    },
  ],
  Communication: [
    {
      en: {
        title: 'Standup and planning',
        summary: 'Walked through the milestones and cleared the blockers sitting in the review queue.',
      },
      zh: {
        title: '站会与排期',
        summary: '过了一遍里程碑，清掉了评审队列里的阻塞。',
      },
    },
    {
      en: {
        title: 'Demo for the team',
        summary: 'Shared the panel, answered questions about the 4 AM boundary, and collected two follow-ups.',
      },
      zh: {
        title: '给团队做演示',
        summary: '展示了面板，回答了关于凌晨 4 点日界的问题，收下两条后续事项。',
      },
    },
    {
      en: {
        title: 'Replying in the design channel',
        summary: 'Settled the ring sizes per container width and agreed to keep the legend.',
      },
      zh: {
        title: '在设计频道回复',
        summary: '敲定了不同容器宽度下的圆环尺寸，并同意保留图例。',
      },
    },
    {
      en: {
        title: 'Reviewing a pull request',
        summary: 'Left three comments on the lane packing, all about edge cases at the week boundary.',
      },
      zh: {
        title: '评审一个合并请求',
        summary: '在分道打包上留了三条评论，全部关于周边界处的边界情况。',
      },
    },
    {
      en: {
        title: 'Pairing on the failing test',
        summary: 'Traced a UTC-only failure to a fixed offset in the fixture and fixed the fixture.',
      },
      zh: {
        title: '结对排查失败的测试',
        summary: '把只在 UTC 下失败的用例定位到 fixture 里写死的偏移量，然后修好了 fixture。',
      },
    },
  ],
  Personal: [
    {
      en: { title: 'Lunch and a walk', summary: 'Away from the desk.' },
      zh: { title: '午饭与散步', summary: '离开工位休息。' },
    },
    {
      en: { title: 'Coffee and a reset', summary: 'A short break between two long blocks.' },
      zh: { title: '喝杯咖啡', summary: '两个长时段之间的短暂休息。' },
    },
    {
      en: { title: 'Errands', summary: 'Stepped away from the keyboard.' },
      zh: { title: '出门办事', summary: '短暂离开键盘。' },
    },
  ],
  Idle: [
    {
      en: { title: 'Idle', summary: 'You were idle during this period.' },
      zh: { title: '空闲', summary: '这段时间没有活动。' },
    },
  ],
};

/** Copy for a category the pool does not cover. */
const FALLBACK = {
  en: { title: 'Focused work', summary: 'Heads-down work with no single app in focus.' },
  zh: { title: '专注工作', summary: '没有固定应用的专注时段。' },
};

/**
 * A deterministic 32-bit hash, so the same day always deals the same deck.
 * @param text - the seed text.
 * @returns an unsigned 32-bit integer.
 */
function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * Fisher-Yates on a copy, driven by a small deterministic generator.
 * @param items - the source list.
 * @param seed - the starting state.
 * @returns a shuffled copy.
 */
function shuffle(items, seed) {
  const out = [...items];
  let state = seed || 1;
  for (let index = out.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const pick = state % (index + 1);
    [out[index], out[pick]] = [out[pick], out[index]];
  }
  return out;
}

/**
 * Deal one replacement entry per record, keyed by record id.
 *
 * Cards are dealt day by day, and each day restarts its per-category decks, so
 * a single day never shows the same title twice. When a day holds more cards of
 * one category than the pool has entries, the deck reshuffles and continues.
 * @param days - every day payload in the demo, in date order.
 * @returns record id to `{ en, zh }` copy.
 */
export function dealCopy(days) {
  const copy = {};
  for (const day of days) {
    const decks = {};
    const used = {};
    for (const card of day.cards) {
      const entries = POOL[card.category] ?? [];
      if (entries.length === 0) {
        copy[String(card.record_id)] = FALLBACK;
        continue;
      }
      if (decks[card.category] === undefined || decks[card.category].length === 0) {
        // Reshuffle rather than repeat a title already shown on this day.
        const fresh = shuffle(entries, hash(`${day.date}:${card.category}:${used[card.category] ?? 0}`));
        const seen = new Set(used[card.category] ?? []);
        const ordered = fresh.filter((entry) => !seen.has(entry.en.title));
        decks[card.category] = ordered.length > 0 ? ordered : fresh;
        used[card.category] = used[card.category] ?? [];
      }
      const entry = decks[card.category].shift();
      used[card.category].push(entry.en.title);
      copy[String(card.record_id)] = entry;
    }
  }
  return copy;
}
