import { useTranslation } from 'react-i18next';

export function Topbar() {
  const { t } = useTranslation();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <p className="text-sm text-muted-foreground">{t('app.subtitle')}</p>
    </header>
  );
}
