import { useTranslation } from 'react-i18next';
import { Bookmark, Info } from 'lucide-react';

// Stateful collector. First click installs a MutationObserver that accumulates
// tweet URLs as the user scrolls (X virtualizes the DOM, so a one-shot query
// would miss already-scrolled-past tweets). A floating badge shows the live
// count and a Copy button; re-clicking the bookmark toggles the badge.
const SCRIPT = `(function(){
  var W = window;
  function extract(root, into){
    var nodes = (root || document).querySelectorAll('article a[href*="/status/"]');
    for (var i = 0; i < nodes.length; i++){
      var href = nodes[i].getAttribute('href'); if (!href) continue;
      var m = href.match(/^\\/([^/]+)\\/status\\/(\\d+)(?:[?#/].*)?$/);
      if (m) into.add('https://x.com/' + m[1] + '/status/' + m[2]);
    }
  }
  if (W.__nusukGrab){
    var b = W.__nusukGrab.badge; if (b) b.style.display = (b.style.display === 'none' ? 'flex' : 'none');
    return;
  }
  var urls = new Set();
  extract(document, urls);
  var badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);direction:ltr';
  var label = document.createElement('span'); label.textContent = 'Nusuk: ' + urls.size + ' URLs';
  var copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.style.cssText = 'background:#fff;color:#7c3aed;border:0;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer';
  var viewBtn = document.createElement('button');
  viewBtn.textContent = 'View';
  viewBtn.style.cssText = 'background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:600;cursor:pointer';
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'background:transparent;color:#fff;border:0;font-size:18px;line-height:1;cursor:pointer;padding:0 4px';
  badge.appendChild(label); badge.appendChild(viewBtn); badge.appendChild(copyBtn); badge.appendChild(closeBtn);
  document.body.appendChild(badge);
  function updateLabel(){ label.textContent = 'Nusuk: ' + urls.size + ' URLs'; }
  var observer = new MutationObserver(function(muts){
    var before = urls.size;
    for (var i = 0; i < muts.length; i++){
      var m = muts[i];
      for (var j = 0; j < m.addedNodes.length; j++){
        var n = m.addedNodes[j]; if (n.nodeType !== 1) continue;
        if (n.tagName === 'ARTICLE' || n.querySelector) extract(n, urls);
      }
    }
    if (urls.size !== before) updateLabel();
  });
  observer.observe(document.body, { subtree: true, childList: true });
  copyBtn.addEventListener('click', function(){
    var text = Array.from(urls).join('\\n');
    var ok = function(){ copyBtn.textContent = 'Copied!'; setTimeout(function(){ copyBtn.textContent = 'Copy'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function(){ prompt('Copy:', text); });
    else prompt('Copy:', text);
  });
  viewBtn.addEventListener('click', function(){
    var win = window.open('', '_blank');
    if (!win) { alert('Pop-ups blocked — allow them or use Copy.'); return; }
    win.document.body.style.cssText = 'font:13px/1.6 ui-monospace,monospace;background:#0f0f14;color:#e6e6ef;padding:20px;margin:0';
    win.document.title = 'Nusuk — ' + urls.size + ' URLs';
    win.document.body.innerHTML = '<h3 style="font-family:system-ui;margin:0 0 12px">' + urls.size + ' tweet URLs</h3><pre style="white-space:pre-wrap;word-break:break-all">' + Array.from(urls).map(function(u){ return u.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }).join('\\n') + '</pre>';
  });
  closeBtn.addEventListener('click', function(){
    observer.disconnect(); badge.remove(); W.__nusukGrab = null;
  });
  W.__nusukGrab = { observer: observer, badge: badge, urls: urls };
})();`;

// URL-encode so it works as a javascript: href.
const BOOKMARKLET_HREF = 'javascript:' + encodeURIComponent(SCRIPT);

export function GrabFromX() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bookmark className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t('capture.grab.title')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('capture.grab.hint')}</p>

          <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            <li>{t('capture.grab.step1')}</li>
            <li>{t('capture.grab.step2')}</li>
            <li>{t('capture.grab.step3')}</li>
            <li>{t('capture.grab.step4')}</li>
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={BOOKMARKLET_HREF}
              // Browsers show a warning if javascript: links are clicked;
              // we *want* the user to drag this link, not click it.
              onClick={(e) => {
                e.preventDefault();
                alert(t('capture.grab.click_warning'));
              }}
              draggable
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] cursor-grab active:cursor-grabbing"
            >
              <Bookmark className="h-4 w-4" />
              {t('capture.grab.button')}
            </a>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" />
              {t('capture.grab.drag_hint')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
