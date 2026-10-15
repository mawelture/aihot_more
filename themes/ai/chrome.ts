// 这个主题在网页上的导航。筛选栏不在这里，它用 taxonomy.ts 里各类别的 label。
// to 是主题前缀后面的路径。精选用 end，只在首页点亮。

export const sidebar = [
  { to: "/", label: "精选", end: true },
  { to: "/all", label: "全部 AI 动态" },
  { to: "/hot", label: "热点榜" },
  { to: "/daily", label: "AI 日报" },
  { to: "/topics", label: "主题" },
  { to: "/starred", label: "收藏" },
] as const;
