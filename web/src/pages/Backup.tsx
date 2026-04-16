import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, FolderArchive, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function BackupPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.backup')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('backup.hint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <p className="text-sm font-semibold">{t('export.excel')}</p>
            <p className="text-xs text-muted-foreground">{t('backup.excel_hint')}</p>
            <a
              href="/api/export/xlsx"
              download
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {t('export.excel')}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <FolderArchive className="h-8 w-8 text-primary" />
            <p className="text-sm font-semibold">{t('export.zip')}</p>
            <p className="text-xs text-muted-foreground">{t('backup.zip_hint')}</p>
            <a
              href="/api/export/zip"
              download
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {t('export.zip')}
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-semibold">{t('backup.scheduled_title')}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t('backup.schedule')}</p>
          <p className="text-sm text-muted-foreground">{t('backup.last_run')}: —</p>
          <Button disabled title={t('common.coming_soon')}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('backup.run_now')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
