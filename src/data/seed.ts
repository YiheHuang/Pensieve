import type { Memory } from '../types'

const now = new Date()
const isoAgo = (days: number, hour = 18) => {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  d.setHours(hour, 20, 0, 0)
  return d.toISOString()
}

export const seedMemories: Memory[] = [
  {
    id: 'memory-starlight', title: '晚风里的小小庆祝',
    content: '项目终于完成了第一阶段。下班后和小夏绕着湖走了一圈，风里有桂花香。我们买了两杯热可可，坐在长椅上聊起这一年悄悄发生的变化。',
    summary: '完成阶段目标后，与小夏在湖边散步，用热可可庆祝平凡却珍贵的晚上。',
    occurredAt: isoAgo(1), createdAt: isoAgo(1), updatedAt: isoAgo(1), emotion: '欣喜', emotionColor: '#f4ca72', status: 'active', aiStatus: 'succeeded', favorite: true,
    tags: [
      { id: 't1', label: '小夏', kind: 'person', confidence: .96, source: 'ai' },
      { id: 't2', label: '湖边', kind: 'place', confidence: .92, source: 'ai' },
      { id: 't3', label: '成长', kind: 'topic', confidence: .88, source: 'ai' },
    ], attachments: [],
  },
  {
    id: 'memory-rain', title: '一场刚刚好的雨',
    content: '午后的雨来得突然。我躲进街角的旧书店，翻到一本小时候很喜欢的童话。老板送了我一张银色书签，说雨停前可以慢慢看。',
    summary: '偶遇阵雨，在旧书店重逢童年读物，也收到陌生人的温柔。',
    occurredAt: isoAgo(4, 15), createdAt: isoAgo(4, 16), updatedAt: isoAgo(4, 16), emotion: '宁静', emotionColor: '#86c8d7', status: 'active', aiStatus: 'succeeded',
    tags: [
      { id: 't4', label: '旧书店', kind: 'place', confidence: .95, source: 'ai' },
      { id: 't5', label: '童年', kind: 'topic', confidence: .89, source: 'ai' },
    ], attachments: [],
  },
  {
    id: 'memory-family', title: '厨房里的橘子灯',
    content: '回家吃饭，妈妈在厨房煮汤。窗外天色很蓝，灶台的小灯把橘子照得暖暖的。我忽然觉得，安心可能就是这些不用解释的时刻。',
    summary: '回家吃饭时，被厨房温暖的光和熟悉的陪伴打动。',
    occurredAt: isoAgo(12, 19), createdAt: isoAgo(12, 22), updatedAt: isoAgo(12, 22), emotion: '温暖', emotionColor: '#ec9e7e', status: 'active', aiStatus: 'succeeded',
    tags: [
      { id: 't6', label: '妈妈', kind: 'person', confidence: .99, source: 'ai' },
      { id: 't7', label: '家', kind: 'place', confidence: .93, source: 'ai' },
      { id: 't8', label: '陪伴', kind: 'topic', confidence: .91, source: 'ai' },
    ], attachments: [],
  },
]
