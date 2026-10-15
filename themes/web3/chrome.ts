// 这个主题在网页上的导航。筛选栏不在这里，它用 taxonomy.ts 里各类别的 label。

export const sidebar = [
  { to: "/", label: "精选", end: true },
  { to: "/all", label: "全部动态" },
  { to: "/hot", label: "热点榜" },
  { to: "/daily", label: "日报" },
  { to: "/topics", label: "主题" },
  { to: "/starred", label: "收藏" },
] as const;
