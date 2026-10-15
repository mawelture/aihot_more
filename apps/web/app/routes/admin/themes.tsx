import { SITE } from '@aihot/site';
import { Link } from 'react-router';
import type { AdminThemes } from '@aihot/contracts/admin';
import type { Route } from './+types/themes';
import { adminGet } from '../../lib/admin.server';
import { AdminPage, Badge, ButtonLink, Card, DataTable } from '../../features/admin/ui';
import { num } from '../../features/admin/format';

export async function loader({ request }: Route.LoaderArgs) {
  return adminGet<AdminThemes>(request, '/api/admin/themes');
}

export const meta: Route.MetaFunction = () => [{ title: `主题 · ${SITE.name} 后台` }];

export default function AdminThemesPage({ loaderData }: Route.ComponentProps) {
  return (
    <AdminPage
      title="主题"
      subtitle="Phase 1 仍以代码文件维护 taxonomy、topics、提示词与门槛；这里主要管理默认入口和每个主题的订阅概况。"
      actions={<ButtonLink to="/admin/settings">去设置默认主题</ButtonLink>}
    >
      <Card title="主题列表" right={<span>当前默认：{loaderData.defaultThemeId}</span>} pad={false}>
        <DataTable
          rows={loaderData.themes}
          rowKey={(theme) => theme.id}
          columns={[
            {
              key: 'theme',
              label: '主题',
              render: (theme) => (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{theme.name}</span>
                    {theme.is_default && <Badge tone="accent">默认入口</Badge>}
                    {!theme.enabled && <Badge tone="warn">已停用</Badge>}
                  </div>
                  <div className="font-mono text-[11.5px] text-ink-4">{theme.id} · /{theme.path_prefix} · {theme.pack_key}</div>
                </div>
              ),
            },
            { key: 'sources', label: '已订阅信源', align: 'right', render: (theme) => num(theme.source_count) },
            {
              key: 'actions',
              label: '',
              align: 'right',
              render: () => <Link to="/admin/settings" className="text-[12.5px] text-accent hover:underline">修改默认主题</Link>,
            },
          ]}
        />
      </Card>
    </AdminPage>
  );
}
