// macOS 主题脚本（逐步迁移中）
(function(){
  console.log('[macos-theme] assets loaded');

  // 全局错误浮层
  (function(){
    var ERR_ID = 'macos-error-banner';
    function ensureBanner(){
      var el = document.getElementById(ERR_ID);
      if (el) return el;
      el = document.createElement('div');
      el.id = ERR_ID;
      el.style.position = 'fixed';
      el.style.top = '8px';
      el.style.right = '8px';
      el.style.zIndex = '99999';
      el.style.maxWidth = '420px';
      el.style.padding = '8px 10px';
      el.style.background = 'rgba(220,0,0,0.85)';
      el.style.color = '#fff';
      el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Arial';
      el.style.fontSize = '12px';
      el.style.lineHeight = '1.4';
      el.style.borderRadius = '6px';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      el.title = '点击隐藏';
      el.addEventListener('click', function(){ el.style.display = 'none'; });
      var parent = document.body || document.documentElement;
      if (parent) parent.appendChild(el);
      else window.addEventListener('DOMContentLoaded', function(){
        (document.body || document.documentElement).appendChild(el);
      });
      return el;
    }
    function showErrorBanner(message, detail){
      try {
        var el = ensureBanner();
        var msg = String(message || 'Error');
        var det = detail ? String(detail) : '';
        el.innerHTML = '<strong>JS Error:</strong> ' + msg + (det ? '<br><span style="opacity:.8">'+det+'</span>' : '');
        el.style.display = 'block';
        console.error('[macos-theme:error]', message, detail || '');
      } catch (e) { /* noop */ }
    }
    window.addEventListener('error', function(e){
      var msg = e.message || (e.error && e.error.message) || 'Unknown error';
      var stack = e.error && e.error.stack;
      showErrorBanner(msg, stack);
    });
    window.addEventListener('unhandledrejection', function(e){
      var reason = e.reason;
      var msg = reason && reason.message ? reason.message : String(reason);
      var stack = reason && reason.stack;
      showErrorBanner(msg, stack);
    });
  })();

  // z-index 置顶
  function bringToFront(win){
    var all = document.querySelectorAll('.macos-window');
    var maxZ = 1000;
    all.forEach(function(w){
      var z = parseInt(window.getComputedStyle(w).zIndex || w.style.zIndex || '1000', 10);
      if (!isNaN(z) && z > maxZ) maxZ = z;
    });
    win.style.zIndex = String(maxZ + 1);
  }

  // 视口边界收敛：确保窗口在容器内，避免产生滚动条
  function clampWindowBounds(win, container){
    try {
      if (!win) return;
      var c = container || (win.parentElement || document.body);
      var cw = c.clientWidth, ch = c.clientHeight;
      var ww = win.offsetWidth, wh = win.offsetHeight;
      var cRect = c.getBoundingClientRect();
      var rect = win.getBoundingClientRect();
      var left = parseFloat(win.style.left);
      var top = parseFloat(win.style.top);
      if (isNaN(left)) left = rect.left - cRect.left;
      if (isNaN(top)) top = rect.top - cRect.top;
      left = Math.max(0, Math.min(cw - ww, left));
      top = Math.max(0, Math.min(ch - wh, top));
      win.style.left = left + 'px';
      win.style.top = top + 'px';
    } catch (e) { /* no-op */ }
  }

  function clampAllWindows(){
    var container = document.querySelector('.macos-theme') || document.body;
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){
      clampWindowBounds(w, container);
    });
  }

  // 固定方形窗口尺寸收敛（默认 300x300，最小 230x230）
  function applySquareSize(win){
    if (!win) return;
    var container = document.querySelector('.macos-theme') || document.body;
    var cw = container.clientWidth, ch = container.clientHeight;
    var target = 300; var minSize = 230;
    var size = Math.max(minSize, Math.min(target, Math.min(cw, ch)));
    win.style.width = size + 'px';
    win.style.height = size + 'px';
  }
  function adjustFixedSquareWindows(){
    var container = document.querySelector('.macos-theme') || document.body;
    Array.from(document.querySelectorAll('.macos-window[data-fixed-square="true"]')).forEach(function(w){
      applySquareSize(w);
      clampWindowBounds(w, container);
    });
  }

  // 在浏览器窗口尺寸变化时，先调整固定方形窗口的尺寸，再收敛所有窗口位置，防止越界
  window.addEventListener('resize', function(){
    requestAnimationFrame(function(){
      adjustFixedSquareWindows();
      clampAllWindows();
    });
  });

  // 拖拽（头部拖动）
  function makeDraggable(win){
    var header = win.querySelector('.window-header');
    var isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    var dX = 0, dY = 0, rafId = null;

    function scheduleApply(){
      if (rafId) return;
      rafId = requestAnimationFrame(function(){
        rafId = null;
        win.style.transform = 'translate3d(' + dX + 'px,' + dY + 'px,0)';
      });
    }

    header.addEventListener('mousedown', function(e){
      // 当点击窗口控制按钮时，不触发拖动
      if (e.target.closest('.window-controls') || e.target.closest('.window-control')) return;
      isDragging = true;
      bringToFront(win);
      startX = e.clientX; startY = e.clientY;
      var rect = win.getBoundingClientRect();
      origLeft = rect.left - (win.parentElement.getBoundingClientRect().left);
      origTop = rect.top - (win.parentElement.getBoundingClientRect().top);
      dX = 0; dY = 0;
      win.style.willChange = 'transform';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e){
      if (!isDragging) return;
      var dx = e.clientX - startX; var dy = e.clientY - startY;
      var container = win.parentElement;
      var maxLeft = container.clientWidth - win.offsetWidth;
      var maxTop = container.clientHeight - win.offsetHeight;
      var newLeft = Math.max(0, Math.min(maxLeft, origLeft + dx));
      var newTop = Math.max(0, Math.min(maxTop, origTop + dy));
      dX = newLeft - origLeft;
      dY = newTop - origTop;
      scheduleApply();

      if (win.dataset.minimized === 'true'){
        win.dataset.preMinimizedTop = newTop + 'px';
        win.dataset.preMinimizedLeft = newLeft + 'px';
      }
    });

    document.addEventListener('mouseup', function(){
      if (isDragging){
        isDragging = false;
        document.body.style.userSelect = '';
        // 提交最终位置并清理 transform，并再次进行边界约束
        var finalLeft = origLeft + dX;
        var finalTop = origTop + dY;
        var container = win.parentElement;
        var maxLeft = container.clientWidth - win.offsetWidth;
        var maxTop = container.clientHeight - win.offsetHeight;
        finalLeft = Math.max(0, Math.min(maxLeft, finalLeft));
        finalTop = Math.max(0, Math.min(maxTop, finalTop));
        win.style.transform = 'none';
        win.style.willChange = '';
        win.style.left = finalLeft + 'px';
        win.style.top = finalTop + 'px';
        dX = 0; dY = 0;
      }
    });
  }

  // 控制按钮：关闭/最小化/最大化
  function wireControls(win){
    var btnClose = win.querySelector('.window-control.close');
    var btnMin = win.querySelector('.window-control.minimize');
    var btnMax = win.querySelector('.window-control.maximize');
    var content = win.querySelector('.window-content');

    if (btnClose){
      btnClose.addEventListener('click', function(){ win.remove(); });
    }
    if (btnMin){
      btnMin.addEventListener('click', function(){
        // 保存当前尺寸和位置便于恢复（按迁移前行为）
        win.dataset.preMinimizedWidth = win.style.width;
        win.dataset.preMinimizedHeight = win.style.height;
        win.dataset.preMinimizedTop = win.style.top;
        win.dataset.preMinimizedLeft = win.style.left;
        // 额外保存内容区的显示样式和窗口的最小高度，避免恢复后布局改变
        win.dataset.preContentDisplay = content ? (content.style.display || window.getComputedStyle(content).display) : '';
        win.dataset.preMinimizedMinHeight = win.style.minHeight || '';
        // 设为最小化：仅保留标题栏高度，隐藏内容
        win.dataset.minimized = 'true';
        win.style.height = '32px';
        win.style.minHeight = '32px';
        if (content) content.style.display = 'none';
      });
    }
    if (btnMax){
      btnMax.addEventListener('click', function(){
        // 仅在最小化时恢复，取消全屏切换以匹配迁移前行为
        if (win.dataset.minimized === 'true'){
          win.dataset.minimized = 'false';
          // 恢复内容区显示样式（例如 flex），避免从 none 回到 block 导致布局变化
          if (content) content.style.display = win.dataset.preContentDisplay || '';
          // 恢复窗口最小高度，保持原有约束（如 4:3 的最小高度）
          win.style.minHeight = win.dataset.preMinimizedMinHeight || '';
          win.style.height = '';
          // 恢复之前保存的尺寸与位置（提供默认值以防空）
          var savedWidth = win.dataset.preMinimizedWidth || win.style.width || '400px';
          var savedHeight = win.dataset.preMinimizedHeight || win.style.height || '300px';
          var savedTop = win.dataset.preMinimizedTop || win.style.top || '100px';
          var savedLeft = win.dataset.preMinimizedLeft || win.style.left || '100px';
          win.style.transform = 'none';
          win.style.width = savedWidth;
          win.style.height = savedHeight;
          win.style.top = savedTop;
          win.style.left = savedLeft;
          // 边界约束（基于容器）
          var container = win.parentElement;
          var maxLeft = container.clientWidth - parseFloat(savedWidth);
          var maxTop = container.clientHeight - parseFloat(savedHeight);
          var boundedLeft = Math.max(0, Math.min(parseFloat(savedLeft), maxLeft));
          var boundedTop = Math.max(0, Math.min(parseFloat(savedTop), maxTop));
          win.style.left = boundedLeft + 'px';
          win.style.top = boundedTop + 'px';
          bringToFront(win);
        }
        // 非最小化状态下不做放大/全屏，保持与旧版一致
      });
    }
    win.addEventListener('mousedown', function(e){
      if (!e.target.closest('.window-controls')) bringToFront(win);
    });
  }

  // 便签拖拽
  function initStickyNoteDrag(){
    var note = document.querySelector('.sticky-note');
    if (!note) return;
    var isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    note.addEventListener('mousedown', function(e){
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      var rect = note.getBoundingClientRect();
      var containerRect = note.parentElement.getBoundingClientRect();
      origLeft = rect.left - containerRect.left;
      origTop = rect.top - containerRect.top;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', function(e){
      if (!isDragging) return;
      var dx = e.clientX - startX; var dy = e.clientY - startY;
      var newLeft = origLeft + dx; var newTop = origTop + dy;
      var container = note.parentElement;
      var maxLeft = container.clientWidth - note.offsetWidth;
      var maxTop = container.clientHeight - note.offsetHeight;
      note.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
      note.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';
      // 移除拖拽时的 transform 重置，避免覆盖 :hover 倾斜效果
    });
    document.addEventListener('mouseup', function(){
      if (isDragging){
        isDragging = false;
        document.body.style.userSelect = '';
        // 清理内联 transform，确保悬停时 CSS :hover 能生效
        note.style.transform = '';
      }
    });
  }

  // 创建窗口
  function createWindow(opts){
    var title = (opts && opts.title) || 'Window';
    var contentHTML = (opts && opts.contentHTML) || '';
    var width = (opts && opts.width) || 400;
    var height = (opts && opts.height) || 300;
    var win = document.createElement('div');
    win.className = 'macos-window';
    win.innerHTML = [
      '<div class="window-header">',
      '  <div class="window-controls">',
      '    <div class="window-control close" title="Close"></div>',
      '    <div class="window-control minimize" title="Minimize"></div>',
      '    <div class="window-control maximize" title="Maximize"></div>',
      '  </div>',
      '  <div class="window-title">' + title + '</div>',
      '</div>',
      '<div class="window-content">' + contentHTML + '</div>'
    ].join('');
    var container = document.querySelector('.macos-theme') || document.body;
    container.appendChild(win);
    // 初始居中（基于容器尺寸）
    var cw = container.clientWidth, ch = container.clientHeight;
    var left = Math.max(0, (cw - width)/2);
    var top = Math.max(0, (ch - height)/2);
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = left + 'px';
    win.style.top = top + 'px';
    win.style.transform = 'none';
    bringToFront(win);
    makeDraggable(win);
    wireControls(win);
    return win;
  }

  // About 窗口内容（迁自原页面）
  /* duplicate removed: openAboutWindow (use the later definition or openAboutMeWindows) */


function openAboutWindow(){
  var existing = Array.from(document.querySelectorAll('.macos-window'))
    .find(function(w){ return w.querySelector('.window-title') && w.querySelector('.window-title').textContent === 'About Me'; });
  if (existing){ bringToFront(existing); return; }
  var html = '<p>Hello world!</p>';
  createWindow({ title: 'About Me', contentHTML: html, width: 300, height: 230 });
}

// Survival Guide 窗口内容（迁自原页面的精简版本）
function openSurvivalGuideWindow(){
  var existing = document.getElementById('article-list-window');
  if (existing){ bringToFront(existing); return; }

  var posts = Array.isArray(window.__MACOS_POSTS__) ? window.__MACOS_POSTS__ : [];
  // 计算徽标并排序：先数量降序，其次权重（TOP>HOT>NEW），最后日期倒序
  (function(){
    function norm(x){
      var s = '';
      if (typeof x === 'string') s = x; else if (x && typeof x.name === 'string') s = String(x.name); else return '';
      s = s.toLowerCase();
      // 归一化：去掉标点/符号/emoji，统一为空格分隔
      try { s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); } catch (e) { s = s.replace(/[^a-z0-9]+/g, ' ').trim(); }
      // 常见近义词归并
      s = s.replace(/置顶文章|文章置顶|精选推荐/g, '置顶');
      s = s.replace(/热门文章|热榜|人气|爆款|流行|趋势/g, '热门');
      return s;
    }
    function labelsFrom(p){
      var tagList = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? [p.tags] : []);
      var catList = Array.isArray(p.categories) ? p.categories : (typeof p.categories === 'string' ? [p.categories] : []);
      var titleTokens = (p.title ? norm(p.title).split(/\s+/).filter(Boolean) : []);
      return tagList.concat(catList).map(norm).filter(Boolean).concat(titleTokens);
    }
    function computeFlags(p){
      var labels = labelsFrom(p);
      var needlesTop = ['top','置顶','pinned','featured','精选'];
      var needlesHot = ['hot','热门','popular','trend','trending','热度','人气','热榜','爆款'];
      function hasAny(needles){
        return labels.some(function(l){ return needles.some(function(n){ return l === n || l.indexOf(n) >= 0; }); });
      }
      var isTop = !!(p.top || p.featured) || hasAny(needlesTop);
      var isHot = !!(p.hot || p.popular) || hasAny(needlesHot);
      var isNew = false; var pd = Date.parse(p.date || '');
      if (!isNaN(pd)){ var days = (Date.now() - pd) / (1000*60*60*24); if (days <= 10) isNew = true; }
      var count = (isTop?1:0) + (isHot?1:0) + (isNew?1:0);
      var weight = (isTop?3:0) + (isHot?2:0) + (isNew?1:0);
      return { isTop:isTop, isHot:isHot, isNew:isNew, count:count, weight:weight };
    }
    posts = posts.map(function(p){ var f = computeFlags(p); p.__isTop=f.isTop; p.__isHot=f.isHot; p.__isNew=f.isNew; p.__badgeCount=f.count; p.__badgeWeight=f.weight; return p; })
      .sort(function(a,b){
        if (b.__badgeCount !== a.__badgeCount) return b.__badgeCount - a.__badgeCount;
        if (b.__badgeWeight !== a.__badgeWeight) return b.__badgeWeight - a.__badgeWeight;
        var ad = Date.parse(a.date || ''), bd = Date.parse(b.date || '');
        if (!isNaN(ad) && !isNaN(bd)) return bd - ad; // 日期倒序
        return 0;
      });
  })();
  var listHTML = '';
  if (posts.length > 0){
    listHTML = posts.map(function(p, idx){
      var active = idx === 0 ? 'background:#e8e8e8;' : '';
      var full = (p.title || '');
      var short = full.length > 28 ? (full.slice(0, 28) + '…') : full;
      var date = (p.date || '');
      var minutes = p.readingTime || p.minutes || p.read_time || p.readtime || '';
      var readText = '';
      if (minutes !== ''){
        var m = parseInt(minutes, 10);
        readText = isNaN(m) ? String(minutes) : (m + ' min');
      }
      var metaText = [date, readText].filter(Boolean).join(' · ');
      var badges = [];
      if (p.__isNew) badges.push('NEW');
      if (p.__isTop) badges.push('TOP');
      if (p.__isHot) badges.push('HOT');
      var badgesHTML = badges.map(function(b){ return '<span class="mac-badge mac-badge-'+b.toLowerCase()+'">'+b+'</span>'; }).join('');
      return [
        '<div class="article-item" data-url="'+p.url+'" data-index="'+idx+'" data-title="'+full+'" data-date="'+date+'"',
        '     style="padding:10px; cursor:pointer; '+active+'">',
        '  <div class="article-title" style="font-size:13px; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">'+short+'</div>',
        '  <div class="article-meta-row" style="display:flex; align-items:center; justify-content:space-between; margin-top:2px;">',
        '    <div class="article-meta" style="color:#888; font-size:11px;">'+metaText+'</div>',
        '    <div class="article-badges" style="display:flex; gap:4px;">'+badgesHTML+'</div>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  } else {
    listHTML = '<div style="padding:10px; font-size:13px; color:#666;">No posts yet.</div>';
  }

  var initial = posts[0];
  // 读取语言，生成“阅读/Read”标签
  var _toggle2 = document.querySelector('#language-toggle');
  var _lang2 = (_toggle2 && (_toggle2.value || _toggle2.getAttribute('data-lang'))) || 'en';
  var _readingLabel2 = (_lang2 === 'zh') ? '阅读' : 'Read';
  // 计算初始文章的阅读时长显示
  var _initMinutes2 = initial ? (initial.readingTime || initial.minutes || initial.read_time || initial.readtime || '') : '';
  var _initReadText2 = '';
  if (_initMinutes2 !== ''){
    var _m2 = parseInt(_initMinutes2, 10);
    _initReadText2 = isNaN(_m2) ? String(_initMinutes2) : (_m2 + 'min');
  }
  var rightHTML = initial
    ? [
        '<div style="padding:20px; border-bottom:1px solid #eee;">',
        '  <h3 style="margin:0;">'+initial.title+'</h3>',
        '  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">',
        '    <div style="color:#666; font-size:12px;">'+initial.date+'</div>',
        '    <div style="color:#666; font-size:12px;">'+(_initReadText2 ? (_readingLabel2 + '：' + _initReadText2) : '')+'</div>',
        '  </div>',
        '</div>',
        '<div style="flex:1; overflow:hidden;">',
        '  <iframe src="'+initial.url+'" style="width:100%; height:100%; border:0;"></iframe>',
        '</div>'
      ].join('')
    : '<div style="flex:1; padding:20px; color:#666;">No content</div>';

  var html = [
    '  <div style="width:250px; border-right:1px solid #d1d1d1; background:#f5f5f5; display:flex; flex-direction:column;">',
    '    <div class="side-title" style="padding:10px; font-weight:600; color:#333;">Article List</div>',
    '    <div style="border-bottom:1px solid #d1d1d1;"></div>',
    '    <div class="article-list" style="flex:1; overflow-y:auto;">',
    listHTML,
    '    </div>',
    '  </div>',
    '  <div style="flex:1; display:flex; flex-direction:column;">',
    rightHTML,
    '  </div>'
  ].join('');

  var win = createWindow({ title: 'Article List', contentHTML: html, width: 800, height: 600 });
  win.id = 'article-list-window';

  // 保持窗口可调整大小与原有约束
  win.style.resize = 'both';
  win.style.overflow = 'auto';
  win.style.minWidth = '400px';
  win.style.minHeight = (400/ (800/600)) + 'px';

  var contentEl = win.querySelector('.window-content');
  if (contentEl){
    contentEl.style.display = 'flex';
    contentEl.style.padding = '0';
    contentEl.style.height = 'calc(100% - 32px)';
  }

  // 注入 iframe 字体栈，确保中文注释与代码块使用无衬线字体
  function injectIframeFontStyle(iframe){
    if (!iframe) return;
    function doInject(){
      try {
        var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (!doc) return;
        var head = doc.head || doc.getElementsByTagName('head')[0];
        if (!head) return;
        if (head.querySelector('style[data-macos-font]')) return;
        var style = doc.createElement('style');
        style.type = 'text/css';
        style.setAttribute('data-macos-font', '');
        style.textContent = [
          'pre, code, kbd, samp, .hljs, .hljs *, .highlight, .highlight *, code[class*="language-"], pre[class*="language-"] {',
          "  font-family: 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'PingFang SC', 'Microsoft Yahei', 'Noto Sans SC', monospace, sans-serif !important;",
          '}'
        ].join('\n');
        head.appendChild(style);
      } catch (err) {}
    }
    // 尝试在加载完成后注入，同时立即尝试一次（若已加载）
    if (iframe.addEventListener){
      iframe.addEventListener('load', doInject, { once: true });
    }
    setTimeout(doInject, 0);
  }
  // 初始 iframe 注入
  injectIframeFontStyle(win.querySelector('.window-content iframe'));

  // 绑定点击：左侧列表点击在右侧加载 iframe 并高亮
  var items = win.querySelectorAll('.article-item');
  items.forEach(function(item){
    item.addEventListener('click', function(){
      items.forEach(function(i){ i.style.backgroundColor = ''; });
      item.style.backgroundColor = '#e8e8e8';
      var url = item.getAttribute('data-url');
      var idx = parseInt(item.getAttribute('data-index') || '0', 10);
      var post = posts[idx];
      var right = win.querySelector('.window-content > div:nth-child(2)');
      if (!right) return;
      // 计算点击文章的阅读时长，并生成标签
      var _minutes = post.readingTime || post.minutes || post.read_time || post.readtime || '';
      var _readText = '';
      if (_minutes !== ''){
        var _mm = parseInt(_minutes, 10);
        _readText = isNaN(_mm) ? String(_minutes) : (_mm + 'min');
      }
      var _toggle3 = document.querySelector('#language-toggle');
      var _lang3 = (_toggle3 && (_toggle3.value || _toggle3.getAttribute('data-lang'))) || 'en';
      var _readingLabel3 = (_lang3 === 'zh') ? '阅读' : 'Read';
      right.innerHTML = [
        '<div style="padding:20px; border-bottom:1px solid #eee; word-break:break-word; overflow-wrap:anywhere;">',
        '  <h3 style="margin:0; line-height:1.4; white-space:normal; word-break:break-word; overflow-wrap:anywhere;">'+(post && post.title || '')+'</h3>',
        '  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">',
        '    <div style="color:#666; font-size:12px;">'+(post && post.date || '')+'</div>',
        '    <div style="color:#666; font-size:12px;">'+(_readText ? (_readingLabel3 + '：' + _readText) : '')+'</div>',
        '  </div>',
        '</div>',
        '<div style="flex:1; overflow:hidden;">',
        '  <iframe src="'+url+'" style="width:100%; height:100%; border:0;"></iframe>',
        '</div>'
      ].join('');
      // 对新加载的 iframe 注入字体栈
      injectIframeFontStyle(right.querySelector('iframe'));
    });
    // mac 风格 tooltip 悬停提示
    var hoverTimer;
    var tooltip = document.getElementById('macos-tooltip');
    if (!tooltip){
      tooltip = document.createElement('div');
      tooltip.id = 'macos-tooltip';
      tooltip.className = 'macos-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(4px)';
      tooltip.style.transition = 'opacity .12s ease, transform .12s ease';
      tooltip.style.pointerEvents = 'none';
      document.body.appendChild(tooltip);
    }
    function showTooltipFor(el){
      var full = el.getAttribute('data-title') || el.textContent.trim();
      tooltip.textContent = full;
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(4px)';
      // 先临时放置，获取尺寸
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
      var rect = el.getBoundingClientRect();
      var tRect = tooltip.getBoundingClientRect();
      var space = 8;
      var left = rect.left + Math.max(0, rect.width/2 - tRect.width/2);
      left = Math.max(6, Math.min(left, window.innerWidth - tRect.width - 6));
      var top = rect.top - tRect.height - space;
      var placeAbove = true;
      if (top < 6){
        top = rect.bottom + space;
        placeAbove = false;
      }
      tooltip.style.left = Math.round(left) + 'px';
      tooltip.style.top = Math.round(top) + 'px';
      var arrowLeft = Math.round(rect.left + rect.width/2 - left);
      tooltip.style.setProperty('--arrow-left', Math.max(12, Math.min(arrowLeft, tRect.width - 12)) + 'px');
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
      tooltip.dataset.position = placeAbove ? 'above' : 'below';
    }
    function hideTooltip(){
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(4px)';
    }
    item.addEventListener('mouseenter', function(){
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function(){ showTooltipFor(item); }, 160);
    });
    item.addEventListener('mouseleave', function(){
      clearTimeout(hoverTimer);
      hideTooltip();
    });
  });

  // 响应式尺寸（保持4:3比例与不越界）
  var baseW = 800, baseH = 600, ratio = baseW/baseH;
  function adjustSize(){
    if (win.dataset.minimized === 'true') return;
    var screenW = window.innerWidth, screenH = window.innerHeight;
    var maxW = Math.min(baseW, screenW * 0.9);
    var maxH = Math.min(baseH, screenH * 0.9);
    var targetW, targetH;
    if (maxW / ratio <= maxH){ targetW = maxW; targetH = maxW/ratio; }
    else { targetH = maxH; targetW = maxH*ratio; }
    win.style.width = targetW + 'px';
    win.style.height = targetH + 'px';
    var maxLeft = screenW - targetW;
    var maxTop = screenH - targetH;
    var curLeft = parseFloat(win.style.left || '0');
    var curTop = parseFloat(win.style.top || '0');
    win.style.left = Math.max(0, Math.min(curLeft, maxLeft)) + 'px';
    win.style.top = Math.max(0, Math.min(curTop, maxTop)) + 'px';
  }
  window.addEventListener('resize', adjustSize);
  var originalRemove = win.remove;
  win.remove = function(){ window.removeEventListener('resize', adjustSize); originalRemove.call(this); };
}

// About 图标绑定（后续可改为多窗口版本）
function openAboutMeWindows(){
  // 清理此前创建的 About 相关窗口
  Array.from(document.querySelectorAll('.macos-window'))
    .forEach(function(w){
      var t = w.querySelector('.window-title');
      if (!t) return;
      var name = t.textContent.trim();
      if (name === 'Portfolio Showcase' || name === 'About Me' || name === 'Design Cases'){
        w.remove();
      }
    });
  var container = document.querySelector('.macos-theme') || document.body;
  var cw = container.clientWidth, ch = container.clientHeight;
  function createFixedWindow(title, contentHTML, xPercent, yPercent, z){
    // 初始设为 300x300 方形
    var win = createWindow({ title: title, contentHTML: contentHTML, width: 300, height: 300 });
    win.dataset.fixedSquare = 'true';

    // 根据视口大小对 300x300 进行收敛（不小于 230x230）
    applySquareSize(win);

    // 使用渲染后尺寸进行边界约束与初始定位
    var ww = win.offsetWidth;
    var wh = win.offsetHeight;
    var leftTarget = Math.round(cw * (xPercent/100));
    var topTarget = Math.round(ch * (yPercent/100));
    var left = Math.max(0, Math.min(cw - ww, leftTarget));
    var top = Math.max(0, Math.min(ch - wh, topTarget));
    win.style.left = left + 'px';
    win.style.top = top + 'px';
    if (z) win.style.zIndex = String(z);
    return win;
  }
  // Portfolio Showcase（图片展示）
  createFixedWindow('Portfolio Showcase',
    '<div style="display:flex; justify-content:center; align-items:center; height:100%; width:100%; padding:10px;">\
      <img src="/images/cat.svg" alt="Portfolio Showcase" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:contain;">\
    </div>', 5, 25, 1001);
  // About Me（文本）
  createFixedWindow('About Me', `
    <div class="about-me-content">
      <div class="about-me-title">Hello！！我是 WANG''，你好！！地球村的良民~</div>
      <ul class="about-me-list">
        <li>纯<span class="highlight">AI</span>搭建的网站，加上一缪缪自己的审美（<span class="accent">yes~</span>）</li>
        <li>建议不要问关于代码的问题，因为我<span class="accent">真不知道</span>！</li>
        <li>目前开发的APP只有“<span class="highlight">相册</span>”和“<span class="highlight">Survival Guide</span>”，我管这个叫生存指南，其实就是博客文章；相册有自己跑的<span class="accent">AIGC</span>随便吃，要神秘代码可以找我~</li>
        <li>随心情建设网站（<span class="warn">下雨天不更！！</span>）</li>
      </ul>
    </div>
  `, 15, 15, 1003);
  // Design Cases（图片展示）
  createFixedWindow('Design Cases',
    '<div style="display:flex; justify-content:center; align-items:center; height:100%; width:100%; padding:10px;">\
      <img src="/images/cat-2.svg" alt="Design Cases" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:contain;">\
    </div>', 22, 40, 1002);
}

// 语言切换（示例）
function initLanguageToggle(){
  var toggle = document.querySelector('#language-toggle');
  if (!toggle) return;
  toggle.addEventListener('change', function(){
    var lang = toggle.value || toggle.getAttribute('data-lang') || 'en';
    Array.from(document.querySelectorAll('.macos-window .window-title')).forEach(function(t){
      var name = t.textContent.trim();
      if (name === 'About Me' && lang === 'zh') t.textContent = '关于我';
      else if (name === '关于我' && lang === 'en') t.textContent = 'About Me';
      if (name === 'Portfolio Showcase' && lang === 'zh') t.textContent = '作品展示';
      else if (name === '作品展示' && lang === 'en') t.textContent = 'Portfolio Showcase';
      if (name === 'Design Cases' && lang === 'zh') t.textContent = '设计案例';
      else if (name === '设计案例' && lang === 'en') t.textContent = 'Design Cases';
      if (name === 'Article List' && lang === 'zh') t.textContent = '文章列表';
      else if (name === '文章列表' && lang === 'en') t.textContent = 'Article List';
    });
    // 同步左侧栏标题和文章项
    var sideTitles = document.querySelectorAll('.side-title');
    sideTitles.forEach(function(s){
      if (lang === 'zh' && s.textContent.trim() === 'Article List') s.textContent = '文章列表';
      else if (lang === 'en' && s.textContent.trim() === '文章列表') s.textContent = 'Article List';
    });
    var articleItems = document.querySelectorAll('.article-item');
    articleItems.forEach(function(item, idx){
      var txt = item.textContent.trim();
      if (lang === 'zh' && txt.startsWith('Article')) item.textContent = '文章' + (idx + 1);
      else if (lang === 'en' && /^文章\d+$/.test(txt)) item.textContent = 'Article' + (idx + 1);
    });
  });
}

function openPhotosWindow(){
  var existing = document.getElementById('photos-window');
  if (existing){ bringToFront(existing); return; }

  var toggle = document.querySelector('#language-toggle');
  var lang = (toggle && (toggle.value || toggle.getAttribute('data-lang'))) || 'en';
  var isZh = (lang === 'zh');

  var windowTitle = isZh ? '相册' : 'Photos';
  var categoryTitle = isZh ? '分类' : 'Categories';
  var albumTitle = isZh ? '相簿' : 'Albums';
  var landscapesText = isZh ? '风景' : 'Landscapes';
  var peopleText = isZh ? '人物' : 'People';
  var projectsText = isZh ? '项目' : 'Projects';
  var aigcText = isZh ? 'AIGC' : 'AIGC';
  var allPhotosText = isZh ? '所有照片' : 'All Photos';
  var favoritesText = isZh ? '最爱' : 'Favorites';
  var recentlyAddedText = isZh ? '最近添加' : 'Recently Added';
  var importText = isZh ? '导入' : 'Import';
  var addAlbumText = isZh ? '+ 相簿' : '+ Album';

  var html = [
    '  <div style="width:200px; border-right:1px solid #d1d1d1; background-color:#f5f5f5; display:flex; flex-direction:column;">',
    '    <div style="padding:10px; font-weight:500; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">'+categoryTitle+'</div>',
    '    <div style="flex:1; overflow-y:auto;">',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; background-color:#e8e8e8; color:#000;" class="photo-nav-item" data-section="photos">'+landscapesText+'</div>',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; color:#000;" class="photo-nav-item" data-section="people">'+peopleText+'</div>',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; color:#000;" class="photo-nav-item" data-section="projects">'+projectsText+'</div>',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; color:#000;" class="photo-nav-item" data-section="aigc">'+aigcText+'</div>',
    '      <div style="padding:10px; font-weight:500; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">'+albumTitle+'</div>',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; color:#000;" class="photo-nav-item" data-section="all-photos">'+allPhotosText+'</div>',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; color:#000;" class="photo-nav-item" data-section="favorites">'+favoritesText+'</div>',
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; color:#000;" class="photo-nav-item" data-section="recent">'+recentlyAddedText+'</div>',
    '    </div>',
    '  </div>',
    '  <div style="flex:1; display:flex; flex-direction:column;">',
    '    <div style="padding:7px 3px; border-bottom:1px solid #d1d1d1; background-color:#f9f9f9; display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">',
    '      <div class="photo-toolbar-title" style="font-weight:500; color:#666; margin-left:3px; font-size:13px;">'+allPhotosText+'</div>',
    '      <div style="display:flex; gap:8px; margin-right:3px;">',
    '        <div style="padding:2px 8px; border:1px solid #d1d1d1; border-radius:4px; font-size:12px; cursor:pointer; background-color:white; color:#666; display:flex; align-items:center; justify-content:center;">'+importText+'</div>',
    '        <div style="padding:2px 8px; border:1px solid #d1d1d1; border-radius:4px; font-size:12px; cursor:pointer; background-color:white; color:#666; display:flex; align-items:center; justify-content:center;">'+addAlbumText+'</div>',
    '      </div>',
    '    </div>',
    '    <div class="photo-grid" style="flex:1; padding:20px; overflow-y:auto;">',
    '      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px;"></div>',
    '    </div>',
    '  </div>'
  ].join('');

  var win = createWindow({ title: windowTitle, contentHTML: html, width: 800, height: 600 });
  win.id = 'photos-window';
  win.style.resize = 'both';
  win.style.overflow = 'auto';
  win.style.minWidth = '400px';
  win.style.minHeight = (400 / (800/600)) + 'px';
  var contentEl = win.querySelector('.window-content');
  if (contentEl){
    contentEl.style.display = 'flex';
    contentEl.style.padding = '0';
    contentEl.style.height = 'calc(100% - 32px)';
  }

  var photoNavItems = win.querySelectorAll('.photo-nav-item');
  var toolbarTitleEl = win.querySelector('.photo-toolbar-title');
  var photoGrid = win.querySelector('.photo-grid > div');

  var photosData = (window.__MACOS_PHOTOS__ || []);
  // 全局 NSFW 列表（URL 字符串数组）
  var nsfwSet = new Set((Array.isArray(window.__MACOS_NSFW__) ? window.__MACOS_NSFW__ : []).filter(function(x){ return typeof x === 'string' && x.length; }));
  // 建立 URL 到主分类与分类内序号的索引，用于 All Photos / Favorites / Recent 的命名
  var urlToPrimaryInfo = {};
  (function buildUrlIndex(){
    var map = photosData || {};
    if (Array.isArray(map)) return; // 若是纯数组则跳过
    var primary = ['photos','people','projects','aigc'];
    primary.forEach(function(cat){
      var arr = map[cat];
      if (Array.isArray(arr)){
        arr.forEach(function(u, i){
          var url = (typeof u === 'string') ? u : (u && u.url) || '';
          if (url && !urlToPrimaryInfo[url]) urlToPrimaryInfo[url] = { cat: cat, idx: i };
        });
      }
    });
  })();

  function labelFor(url, section, idx){
    function pad(n){ return n < 10 ? ('0' + n) : String(n); }
    var catLabelMap = { photos: 'Photos', people: 'People', projects: 'Projects', aigc: 'Aigc' };
    if (section === 'photos' || section === 'people' || section === 'projects' || section === 'aigc'){
      return (catLabelMap[section] || 'Photos') + '_' + pad(idx + 1);
    }
    var info = urlToPrimaryInfo[url];
    if (info && catLabelMap[info.cat]){
      return catLabelMap[info.cat] + '_' + pad((info.idx || 0) + 1);
    }
    return 'Photos_' + pad(idx + 1); // 兜底：未知归类
  }

  function buildGridHTML(list, section){
    if (!list || !list.length){
      return '<div style="display:flex; align-items:center; justify-content:center; height:200px; color:#666; font-size:12px;">No photos. Edit source/_data/photos.json</div>';
    }
    return list.map(function(item, idx){
      var obj = (typeof item === 'string') ? { url: item } : (item || {});
      var url = obj.url || '';
      var title = (obj.name && String(obj.name).trim()) || labelFor(url, section, idx);
      var info = urlToPrimaryInfo[url];
      var defaultSensitive = nsfwSet.size === 0 && ((info && info.cat === 'aigc' && info.idx === 1) || (section === 'aigc' && idx === 1));
      var isSensitive = !!obj.nsfw || nsfwSet.has(url) || defaultSensitive;
      var cellAttrs = 'data-photo-url="'+url+'"' + (isSensitive ? ' data-blur-mask="true" data-masked="true"' : '');
      var imgExtra = isSensitive ? 'filter: blur(18px);' : '';
      var showNew = (section === 'recent');
      var newBadgeHTML = showNew ? '  <div class="new-badge" style="pointer-events:none; position:absolute; top:6px; right:6px; background:#1677ff; color:#fff; font-size:10px; padding:2px 6px; border-radius:12px; box-shadow:0 1px 6px rgba(0,0,0,0.2);">NEW</div>' : '';
      var showFav = (section === 'favorites');
      var favBadgeHTML = showFav ? '  <div class="fav-badge" style="pointer-events:none; position:absolute; top:6px; right:6px; color:#1677ff; font-size:20px; line-height:1; text-shadow:0 1px 2px rgba(0,0,0,0.18);">♥</div>' : '';
      return [
        '<div '+cellAttrs+' style="aspect-ratio:1/1; background-color:#f0f0f0; border-radius:6px; overflow:hidden; position:relative; cursor:zoom-in;">',
        '  <img src="'+url+'" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; display:block; '+imgExtra+'" />',
        (isSensitive ? '  <div class="blur-mask" style="position:absolute; inset:0; border-radius:inherit; background:rgba(0,0,0,0.35); backdrop-filter: blur(3px); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">NSFW</div>' : ''),
        newBadgeHTML,
        favBadgeHTML,
        '  <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:white; padding:5px 8px; font-size:11px;">'+title+'</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function getSectionList(section){
    if (section === 'memories') section = 'people';
    if (section === 'places') section = 'aigc';
    var data = photosData;
    if (Array.isArray(data)){
      return data;
    }
    var map = data || {};
    if (section === 'all-photos'){
      if (Array.isArray(map.all)) return map.all;
      var keys = ['photos','people','projects','aigc','favorites','recent','all'];
      var seen = new Set(); var out = [];
      keys.forEach(function(k){
        var arr = map[k];
        if (Array.isArray(arr)){
          arr.forEach(function(u){
            var url = (typeof u === 'string') ? u : (u && u.url) || '';
            if (!seen.has(url)) { seen.add(url); out.push(u); }
          });
        }
      });
      return out;
    }
    return Array.isArray(map[section]) ? map[section] : [];
  }

  function updatePhotoContent(section){
    var titles = {
      'photos': landscapesText,
      'memories': peopleText,
      'people': peopleText,
      'projects': projectsText,
      'places': aigcText,
      'aigc': aigcText,
      'all-photos': allPhotosText,
      'favorites': favoritesText,
      'recent': recentlyAddedText
    };
    if (toolbarTitleEl){ toolbarTitleEl.textContent = titles[section] || allPhotosText; }
    if (photoGrid){ photoGrid.innerHTML = buildGridHTML(getSectionList(section), section); }
  }

  photoNavItems.forEach(function(item){
    item.addEventListener('click', function(){
      photoNavItems.forEach(function(i){ i.style.backgroundColor = ''; });
      item.style.backgroundColor = '#e8e8e8';
      var section = item.getAttribute('data-section') || 'all-photos';
      updatePhotoContent(section);
    });
  });

  updatePhotoContent('all-photos');

  // 网格点击事件：打开模态框查看大图（事件委托，作用域内使用）
  if (photoGrid){
    photoGrid.addEventListener('click', function(e){
      var cell = e.target.closest('[data-photo-url]');
      if (!cell) return;
      var url = cell.getAttribute('data-photo-url') || (cell.querySelector('img') && cell.querySelector('img').src) || '';
      // 先处理敏感图蒙版：首次点击移除蒙版，不打开大图
      if (cell.getAttribute('data-blur-mask') === 'true' && cell.getAttribute('data-masked') !== 'false'){
        var imgEl = cell.querySelector('img');
        if (imgEl) imgEl.style.filter = 'none';
        var maskEl = cell.querySelector('.blur-mask');
        if (maskEl) maskEl.remove();
        cell.setAttribute('data-masked','false');
        return;
      }
      if (url) openPhotoModal(url);
    });
  }
 
   var baseW = 800, baseH = 600, ratio = baseW/baseH;
  function adjustSize(){
    if (win.dataset.minimized === 'true') return;
    var screenW = window.innerWidth, screenH = window.innerHeight;
    var maxW = Math.min(baseW, screenW * 0.9);
    var maxH = Math.min(baseH, screenH * 0.9);
    var targetW, targetH;
    if (maxW / ratio <= maxH){ targetW = maxW; targetH = maxW/ratio; }
    else { targetH = maxH; targetW = maxH*ratio; }
    win.style.width = targetW + 'px';
    win.style.height = targetH + 'px';
    var maxLeft = screenW - targetW;
    var maxTop = screenH - targetH;
    var curLeft = parseFloat(win.style.left || '0');
    var curTop = parseFloat(win.style.top || '0');
    win.style.left = Math.max(0, Math.min(curLeft, maxLeft)) + 'px';
    win.style.top = Math.max(0, Math.min(curTop, maxTop)) + 'px';
  }
  window.addEventListener('resize', adjustSize);
  var originalRemove = win.remove;
  win.remove = function(){ window.removeEventListener('resize', adjustSize); originalRemove.call(this); };
}

function bindDockIcons(){
  var aboutIcon = document.querySelector('#dock-about');
  var guideIcon = document.querySelector('#dock-guide');
  if (aboutIcon){ aboutIcon.addEventListener('click', openAboutMeWindows); }
  if (guideIcon){ guideIcon.addEventListener('click', openSurvivalGuideWindow); }
  var photosImg = document.querySelector('.dock .dock-icon img[src$="Photos.svg"]');
  if (photosImg){
    photosImg.addEventListener('click', openPhotosWindow);
    var parent = photosImg.closest('.dock-icon');
    if (parent){ parent.addEventListener('click', openPhotosWindow); }
  }
  // 悬停放大效果（匹配旧版 macos.html）
  var dockIcons = document.querySelectorAll('.dock-icon');
  dockIcons.forEach(function(icon){
    var img = icon.querySelector('img');
    if (!img) return;
    icon.addEventListener('mouseenter', function(){
      img.style.transform = 'scale(1.5)';
      img.style.transformOrigin = 'center bottom';
    });
    icon.addEventListener('mouseleave', function(){
      img.style.transform = 'none';
    });
  });
}

// 绑定桌面图标（About Me / Survival Guide）
function bindDesktopIcons(){
  var icons = document.querySelectorAll('.desktop-icons .icon');
  icons.forEach(function(icon){
    var labelEl = icon.querySelector('.icon-label');
    var imgEl = icon.querySelector('img');
    var name = (labelEl && labelEl.textContent || '').trim() || (imgEl && imgEl.alt || '').trim();
    if (!name) return;
    // About Me（含中英文别名）
    if (name === 'About Me' || name === '关于我'){
      icon.addEventListener('click', openAboutMeWindows);
    }
    // Survival Guide（含可能的别名 Project 1 / 指南）
    else if (name === 'Survival Guide' || name === 'Project 1' || name === '指南'){
      icon.addEventListener('click', openSurvivalGuideWindow);
    }
  });
}

function initMenuClock(){
  var dateEl = document.getElementById('current-date');
  var timeEl = document.getElementById('current-time');
  if (!dateEl || !timeEl) return;
  function update(){
    var d = new Date();
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var dow = days[d.getDay()];
    var mon = months[d.getMonth()];
    var dd = d.getDate();
    dateEl.textContent = dow + ',  ' + mon + ' ' + dd;
    var h = d.getHours();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var hr12 = h % 12; if (hr12 === 0) hr12 = 12;
    var hrStr = hr12 < 10 ? ('0' + hr12) : String(hr12);
    var m = d.getMinutes();
    var mStr = m < 10 ? ('0' + m) : String(m);
    timeEl.textContent = hrStr + ':' + mStr + ' ' + ampm;
  }
  update();
  if (window.__macosClockInterval__) { clearInterval(window.__macosClockInterval__); }
  window.__macosClockInterval__ = setInterval(update, 1000);
}

function initTypewriterWelcome(){
  var container = document.querySelector('.welcome-text');
  if (!container) return;
  var text = 'welcome to my portfolio.';
  var content = document.createElement('span');
  content.className = 'typing-content';
  var cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  cursor.textContent = '|';
  container.textContent = '';
  container.appendChild(content);
  container.appendChild(cursor);
  var i = 0;
  var baseSpeed = 160;
  var jitter = 60;
  function humanDelay(ch){
    var delay = baseSpeed + Math.floor((Math.random() - 0.5) * 2 * jitter);
    if (ch === ' ') delay += 90;
    else if (',;:'.indexOf(ch) >= 0) delay += 200;
    else if ('.!?…'.indexOf(ch) >= 0) delay += 800;
    if (delay < 60) delay = 60;
    return delay;
  }
  function type(){
    if (i <= text.length){
      content.textContent = text.slice(0, i);
      var ch = text.charAt(i - 1) || '';
      i++;
      setTimeout(type, humanDelay(ch));
    } else {
      setTimeout(function(){ i = 0; type(); }, 1800);
    }
  }
  type();
  function randColor(){
    var hue = Math.floor(Math.random() * 360);
    return 'hsl(' + hue + ', 85%, 55%)';
  }
  var visible = true;
  cursor.style.color = randColor();
  setInterval(function(){
    visible = !visible;
    cursor.style.opacity = visible ? '1' : '0';
    if (visible){ cursor.style.color = randColor(); }
  }, 500);
}

document.addEventListener('DOMContentLoaded', function(){
  bindDockIcons();
  bindDesktopIcons();
  initLanguageToggle();
  initStickyNoteDrag();
  initMenuClock();
  initTypewriterWelcome();
});

})();



// 透明模态框查看大图
function openPhotoModal(url){
  if (!url) return;
  var overlay = document.createElement('div');
  overlay.className = 'macos-photo-modal';
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '10000';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .15s ease';
  var wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.maxWidth = '80vw';
     wrap.style.maxHeight = '80vh';
     var img = document.createElement('img');
   img.src = url;
   img.style.maxWidth = '100%';
   img.style.maxHeight = '100%';
   img.style.display = 'block';
   img.style.borderRadius = '6px';
   img.style.boxShadow = '0 6px 24px rgba(0,0,0,0.35)';
   img.style.objectFit = 'contain';
   var btn = document.createElement('div');
   btn.textContent = '×';
   btn.style.position = 'absolute';
   btn.style.top = '8px';
   btn.style.right = '12px';
   btn.style.color = '#fff';
   btn.style.fontSize = '22px';
   btn.style.lineHeight = '22px';
   btn.style.cursor = 'pointer';
   btn.style.padding = '2px 6px';

   // 根据视口与图片原始尺寸动态适配，保证不超过80%并保持居中
   function fitImage(){
     var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
     var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
     var maxW = Math.floor(vw * 0.8);
     var maxH = Math.floor(vh * 0.8);
     wrap.style.maxWidth = maxW + 'px';
     wrap.style.maxHeight = maxH + 'px';
     var nw = img.naturalWidth || maxW;
     var nh = img.naturalHeight || maxH;
     var ratio = nw / nh;
     var boxRatio = maxW / maxH;
     if (ratio > boxRatio){
       img.style.width = maxW + 'px';
       img.style.height = 'auto';
     } else {
       img.style.height = maxH + 'px';
       img.style.width = 'auto';
     }
   }

   wrap.appendChild(img);
   wrap.appendChild(btn);
   overlay.appendChild(wrap);
   document.body.appendChild(overlay);
   requestAnimationFrame(function(){ overlay.style.opacity = '1'; });
   fitImage();
   img.addEventListener('load', fitImage, { once: true });
   window.addEventListener('resize', fitImage);

   function close(){
     overlay.style.opacity = '0';
     setTimeout(function(){ overlay.remove(); }, 160);
     document.removeEventListener('keydown', onKey);
     window.removeEventListener('resize', fitImage);
   }
   overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
   btn.addEventListener('click', close);
   function onKey(e){ if (e.key === 'Escape') close(); }
   document.addEventListener('keydown', onKey);
}

// 点击事件委托已移至 openPhotosWindow 内部，避免全局引用未定义变量。




