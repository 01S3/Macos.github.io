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
        el.innerHTML = '<strong>JS Error:</strong> ' + msg + (det ? '<br><span style="opacity:.8;">'+det+'</span>' : '');
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
    // 确保窗口z-index不会超过灵动岛(最低9998)
    win.style.zIndex = String(Math.min(maxZ + 1, 9997));
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
      btnClose.addEventListener('click', function(){
          win.remove();
          // 移动端：若已无任何窗口，恢复显示便签
          if (window.innerWidth <= 768){
            var note = document.querySelector('.sticky-note');
            if (note){
              if (document.querySelectorAll('.macos-window').length === 0){
                note.style.display = '';
              }
            }
          }
      });
    }
    if (btnMin){
      btnMin.addEventListener('click', function(){
        // 保存当前尺寸和位置便于恢复（按迁移前行为）
        // 保存原始容器尺寸（考虑盒模型）、窗口像素位置和高精度相对比例
          // 使用offsetParent获取定位容器（更可靠）
          const container = win.offsetParent || document.body;
          // 确保容器引用稳定
          if (!container) {
            console.error('无法确定定位容器，使用body作为回退');
          }
          const containerStyle = getComputedStyle(container);
          const containerRect = container.getBoundingClientRect();
          // 根据盒模型计算容器内容区域尺寸
          const boxSizing = containerStyle.boxSizing || 'content-box';
          let containerContentWidth, containerContentHeight;
          if (boxSizing === 'border-box') {
            // border-box: width包含padding和border，需从CSS width计算内容宽度
            // 处理非像素宽度（如auto或百分比）
            const computedWidth = parseFloat(containerStyle.width);
            const computedHeight = parseFloat(containerStyle.height);
            // 当width为auto或百分比时，使用boundingRect作为回退
            const baseWidth = isNaN(computedWidth) ? containerRect.width : computedWidth;
            const baseHeight = isNaN(computedHeight) ? containerRect.height : computedHeight;
            containerContentWidth = baseWidth - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight) - parseFloat(containerStyle.borderLeftWidth) - parseFloat(containerStyle.borderRightWidth);
            containerContentHeight = baseHeight - parseFloat(containerStyle.paddingTop) - parseFloat(containerStyle.paddingBottom) - parseFloat(containerStyle.borderTopWidth) - parseFloat(containerStyle.borderBottomWidth);
          } else {
            // content-box: width不包含padding和border，从boundingRect计算
            containerContentWidth = containerRect.width - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight) - parseFloat(containerStyle.borderLeftWidth) - parseFloat(containerStyle.borderRightWidth);
            containerContentHeight = containerRect.height - parseFloat(containerStyle.paddingTop) - parseFloat(containerStyle.paddingBottom) - parseFloat(containerStyle.borderTopWidth) - parseFloat(containerStyle.borderBottomWidth);
          }
          const winRect = win.getBoundingClientRect();
          // 保存容器原始尺寸
          // 保存容器内容区域尺寸而非边界框尺寸
          win.dataset.containerWidth = containerContentWidth + 'px';
          win.dataset.containerHeight = containerContentHeight + 'px';
          // 保存窗口原始像素位置
          win.dataset.preMinimizedWidth = winRect.width;
          win.dataset.preMinimizedHeight = winRect.height;
          win.dataset.preMinimizedTop = (winRect.top - containerRect.top) + 'px';
          win.dataset.preMinimizedLeft = (winRect.left - containerRect.left) + 'px';
// 初始化保存窗口原始尺寸
        if (!win.dataset.preMinimizedWidth) {
          win.dataset.preMinimizedWidth = winRect.width + 'px';
          win.dataset.preMinimizedHeight = winRect.height + 'px';
        }
        // 保存高精度相对比例
          win.dataset.relativeWidth = (winRect.width / containerRect.width).toFixed(4);
          win.dataset.relativeHeight = (winRect.height / containerRect.height).toFixed(4);
          win.dataset.relativeTop = ((winRect.top - containerRect.top) / containerRect.height).toFixed(4);
          win.dataset.relativeLeft = ((winRect.left - containerRect.left) / containerRect.width).toFixed(4);
        // 额外保存内容区的显示样式和窗口的最小高度，避免恢复后布局改变
        win.dataset.preContentDisplay = content ? (content.style.display || window.getComputedStyle(content).display) : '';
        win.dataset.preMinimizedMinHeight = window.getComputedStyle(win).minHeight;
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
          win.dataset.justRestored = 'true';
          // 恢复内容区显示样式（例如 flex），避免从 none 回到 block 导致布局变化
          if (content) content.style.display = win.dataset.preContentDisplay || '';
          // 恢复窗口最小高度，保持原有约束（如 4:3 的最小高度）
          win.style.minHeight = win.dataset.preMinimizedMinHeight || '';
          win.style.boxSizing = 'border-box';
          // 恢复之前保存的尺寸与位置（提供默认值以防空）
          var savedWidth = win.dataset.preMinimizedWidth;
          var savedHeight = win.dataset.preMinimizedHeight;
          // 应用保存的原始尺寸
          win.style.width = savedWidth + 'px';
          win.style.height = savedHeight + 'px';
          // 恢复位置
          if (win.dataset.hasInlineTop === 'true') {
            win.style.top = win.dataset.preMinimizedTop;
          } else {
            win.style.top = ''; // 恢复CSS控制
          }
          if (win.dataset.hasInlineLeft === 'true') {
            win.style.left = win.dataset.preMinimizedLeft;
          } else {
            win.style.left = ''; // 恢复CSS控制
          }
          win.style.transform = 'none';
          // 边界约束（基于容器）
          var container = win.parentElement;
          if (container) {
            var containerRect = container.getBoundingClientRect();
            var winRect = win.getBoundingClientRect();
            // 确保窗口不超出容器右边界
            if (parseInt(win.style.left) + winRect.width > containerRect.width) {
              win.style.left = (containerRect.width - winRect.width) + 'px';
            }
            // 确保窗口不超出容器下边界
            if (parseInt(win.style.top) + winRect.height > containerRect.height) {
              win.style.top = (containerRect.height - winRect.height) + 'px';
            }
            // 确保窗口不超出容器上边界
            if (parseInt(win.style.top) < 0) {
              win.style.top = '0px';
            }
            // 确保窗口不超出容器左边界
            if (parseInt(win.style.left) < 0) {
              win.style.left = '0px';
            }
          }
        }
        // 非最小化状态下不做放大/全屏，保持与旧版一致
      });
    }
    win.addEventListener('mousedown', function(e){
      if (!e.target.closest('.window-controls')) bringToFront(win);
    });
  }

  // 便签拖拽
  function getRandomGradient() {
    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + Math.floor(Math.random() * 60) + 30) % 360;
    return 'linear-gradient(135deg, hsl(' + hue1 + ', 70%, 60%), hsl(' + hue2 + ', 70%, 60%))';
}

function initStickyNoteDrag(){
    var note = document.querySelector('.sticky-note');
    if (!note) return;
    
    // 设置初始渐变背景
    note.style.background = getRandomGradient();
    
    // 定时更新渐变（5秒一次）
    let gradientTimeout;
    function scheduleNextGradient() {
        gradientTimeout = setTimeout(function() {
            note.style.background = getRandomGradient();
            scheduleNextGradient();
        }, 5000);
    }
    scheduleNextGradient();
    
    // 窗口隐藏时清除定时器
    let previousDisplay = note.style.display;
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                const currentDisplay = note.style.display;
                if (currentDisplay !== previousDisplay) {
                    previousDisplay = currentDisplay;
                    if (currentDisplay === 'none') {
                        clearTimeout(gradientTimeout);
                    } else {
                        // 先清除可能存在的旧定时器
                        clearTimeout(gradientTimeout);
                        scheduleNextGradient();
                    }
                }
            }
        });
    });
    observer.observe(note, { attributes: true });
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
    // 标记位置是通过内联样式设置的，以便恢复时使用
    win.dataset.hasInlineTop = 'true';
    win.dataset.hasInlineLeft = 'true';
    bringToFront(win);
    makeDraggable(win);
    wireControls(win);
    // 移动端：任意窗口出现时隐藏便签
    if (window.innerWidth <= 768){
      var note = document.querySelector('.sticky-note');
      if (note) note.style.display = 'none';
    }
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
  // 移动端：打开文章列表时，先关闭其他窗口，确保不并存
  if (window.innerWidth <= 768){
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){ w.remove(); });
  }
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
      var titleActive = idx === 0 ? 'color:#1e66ff;' : '';
      return [
        '<div class="article-item" data-url="'+p.url+'" data-index="'+idx+'" data-title="'+full+'" data-date="'+date+'"',
        '     style="padding:10px; cursor:pointer; '+active+'">',
        '  <div class="article-title" style="'+titleActive+'font-size:13px; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">'+short+'</div>',
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
  if (window.innerWidth <= 768){
    var container = document.querySelector('.macos-theme') || document.body;
    var mobileW = Math.round(container.clientWidth * 0.9);
    win.style.width = '90vw';
      win.style.minWidth = '90vw';
      win.style.left = '5vw';
    // 更新标志，因为left样式被修改了
    win.dataset.hasInlineLeft = 'true';
  } else {
    win.style.minWidth = '400px';
  }
  win.style.minHeight = (400/ (800/600)) + 'px';

  var contentEl = win.querySelector('.window-content');
  if (contentEl){
    contentEl.style.display = 'flex';
    contentEl.style.padding = '0';
    contentEl.style.height = 'calc(100% - 32px)';
    // 移动端：侧栏可折叠为玻璃态把手，扩大正文区域
    contentEl.style.position = 'relative';
    var sidebar = contentEl.children[0];
    var rightPane = contentEl.children[1];
    if (window.innerWidth <= 768 && sidebar && rightPane){
      var baseWidth = 250; // 原始侧栏宽度
      var collapsed = false; // 默认展开，便于首次浏览标题
      rightPane.style.flex = '1';
      // 将左侧面板改为悬浮抽屉，铺在正文上方
      sidebar.style.position = 'absolute';
      sidebar.style.left = '0';
      sidebar.style.top = '0';
      sidebar.style.height = '100%';
      sidebar.style.width = baseWidth + 'px';
      sidebar.style.zIndex = '20';
      sidebar.style.background = 'rgba(245,245,245,0.6)';
      sidebar.style.backdropFilter = 'blur(12px)';
      sidebar.style.webkitBackdropFilter = 'blur(12px)';
      sidebar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
      sidebar.style.borderRight = '1px solid #d1d1d1';
      sidebar.style.transition = 'transform 0.25s ease';
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.pointerEvents = 'auto';
      // 玻璃态把手
      var toggle = document.createElement('button');
      toggle.setAttribute('aria-label','Toggle sidebar');
      toggle.style.position = 'absolute';
      toggle.style.top = '50%';
      toggle.style.left = '0';
      toggle.style.transform = 'translateY(-50%)';
      toggle.style.width = '18px';
      toggle.style.height = '56px';
      toggle.style.border = '1px solid #d1d1d1';
      toggle.style.borderLeft = 'none';
      toggle.style.borderTopRightRadius = '10px';
      toggle.style.borderBottomRightRadius = '10px';
      toggle.style.background = 'rgba(245,245,245,0.6)';
      toggle.style.backdropFilter = 'blur(10px)';
      toggle.style.webkitBackdropFilter = 'blur(10px)';
      toggle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
      toggle.style.cursor = 'pointer';
      toggle.style.display = 'flex';
      toggle.style.alignItems = 'center';
      toggle.style.justifyContent = 'center';
      toggle.style.zIndex = '30';
      toggle.style.color = '#666';
      toggle.style.fontSize = '16px';
      toggle.textContent = '‹';
      contentEl.appendChild(toggle);
      // 根据初始展开状态控制把手显示
      toggle.style.display = collapsed ? 'flex' : 'none';
      // 透明遮罩，用于点击空白处收起抽屉
      var mask = document.createElement('div');
      mask.style.position = 'absolute';
      mask.style.left = baseWidth + 'px';
      mask.style.top = '0';
      mask.style.width = 'calc(100% - '+baseWidth+'px)';
      mask.style.height = '100%';
      mask.style.background = 'rgba(0,0,0,0.01)';
      mask.style.zIndex = '25';
      mask.style.display = collapsed ? 'none' : 'block';
      contentEl.appendChild(mask);
      function collapseSidebar(){
        collapsed = true;
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.pointerEvents = 'none';
        toggle.textContent = '›';
        toggle.style.display = 'flex';
        toggle.style.left = '0px';
        mask.style.display = 'none';
      }
      function expandSidebar(){
        collapsed = false;
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.pointerEvents = 'auto';
        toggle.textContent = '‹';
        toggle.style.display = 'none';
        toggle.style.left = '0px';
        mask.style.display = 'block';
      }
      win._mobileSidebarControls = { collapseSidebar: collapseSidebar, expandSidebar: expandSidebar };
      toggle.addEventListener('click', function(){
        if (collapsed){
          expandSidebar();
        } else {
          collapseSidebar();
        }
      });
      mask.addEventListener('click', function(){
        if (!collapsed){ collapseSidebar(); }
      });
    }
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
      items.forEach(function(i){ 
        i.style.backgroundColor = ''; 
        var t0 = i.querySelector('.article-title'); if (t0) t0.style.color = '';
      });
      item.style.backgroundColor = '#e8e8e8';
      var t1 = item.querySelector('.article-title'); if (t1) t1.style.color = '#1e66ff';
      if (window.innerWidth <= 768 && win._mobileSidebarControls){ try { win._mobileSidebarControls.collapseSidebar(); } catch (e) {} }
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
  // 使用闭包确保adjustSize函数始终可以访问win变量
  window.addEventListener('resize', adjustSize);
  var originalRemove = win.remove;
  win.remove = function(){ window.removeEventListener('resize', adjustSize); originalRemove.call(this); };
}

// About 图标绑定（后续可改为多窗口版本）
function openAboutMeWindows(){
  // 移动端：点击 About 时只保留当前窗口集合，先清空其他弹窗
  if (window.innerWidth <= 768){
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){ w.remove(); });
  } else {
    // 桌面端：仅清理此前创建的 About 相关窗口，保留其他窗口
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){
      var t = w.querySelector('.window-title');
      if (!t) return;
      var name = t.textContent.trim();
      if (name === 'Portfolio Showcase' || name === 'About Me' || name === 'Design Cases'){
        w.remove();
      }
    });
  }
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
  var wPortfolio = createFixedWindow('Portfolio Showcase',
    '<div style="display:flex; justify-content:center; align-items:center; height:100%; width:100%; padding:10px;">' +
      '<img src="' + (window.__MACOS_ASSET__ ? window.__MACOS_ASSET__('images/cat.svg') : '/images/cat.svg') + '" alt="Portfolio Showcase" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:contain;">' +
    '</div>', 5, 25, 1001);
  // About Me（文本）
  var wAbout = createFixedWindow('About Me', 
    '<div class="about-me-content">' +
      '<div class="about-me-title">Hello！！我是 WANG，你好！！地球村的良民~</div>' +
        '<ul class="about-me-list">' +
          '<li>纯<span class="highlight">AI</span>搭建的网站，加上一缪缪自己的审美（<span class="accent">yes~</span>）</li>' +
          '<li>建议不要问关于代码的问题，因为我<span class="accent">真不知道</span>！</li>' +
          '<li>目前开发的APP只有\'<span class="highlight">相册</span>\'和\'<span class="highlight">Survival Guide</span>\'，我管这个叫生存指南，其实就是博客文章；相册有自己跑的<span class="accent">AIGC</span>随便吃，要神秘代码可以找我~</li>' +
          '<li>随心情建设网站（<span class="warn">下雨天不更！！</span>）</li>' +
        '</ul>' +
      '</div>', 15, 15, 1003);
  // Design Cases（图片展示）
  var wDesign = createFixedWindow('Design Cases',
    '<div style="display:flex; justify-content:center; align-items:center; height:100%; width:100%; padding:10px;">' +
      '<img src="' + (window.__MACOS_ASSET__ ? window.__MACOS_ASSET__('images/cat-2.svg') : '/images/cat-2.svg') + '" alt="Design Cases" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:contain;">' +
    '</div>', 22, 40, 1002);

  // 移动端：将三个窗口改为抽屉式居中排列，点击标题展开其余折叠
  if (window.innerWidth <= 768){
    var wins = [wAbout, wPortfolio, wDesign];
    function layoutMobileDrawer(selectedWin){
      var container = document.querySelector('.macos-theme') || document.body;
      var bar = document.querySelector('.menu-bar');
      var dock = document.querySelector('.dock');
      var barH = (bar && bar.offsetHeight) || 22;
      var dockH = (dock ? dock.getBoundingClientRect().height : 0);
      var marginTop = 8, marginBottom = 14, gap = 5;
      var headerH = (wins[0] && wins[0].querySelector('.window-header') ? wins[0].querySelector('.window-header').offsetHeight : 32);
      var collapsedH = headerH; // 折叠状态高度与标题栏一致，避免露白边
      var availableH = container.clientHeight - barH - dockH - marginTop - marginBottom;
      var expandedH = Math.max(180, Math.min(availableH, Math.round(container.clientHeight * 0.55))); // 保持舒适阅读
      var width = Math.round(container.clientWidth * 0.9);
      var left = Math.round((container.clientWidth - width) / 2);
      var top = barH + marginTop;
      wins.forEach(function(win){
        if (!win) return;
        win.dataset.mobile = 'drawer';
        win.style.transform = 'none';
        win.style.left = left + 'px';
        win.style.width = width + 'px';
        win.style.zIndex = '1000';
        var content = win.querySelector('.window-content');
        var isSelected = (win === selectedWin);
        if (isSelected){
          win.dataset.collapsed = 'false';
          if (content) content.style.display = 'block';
          win.style.height = expandedH + 'px';
        } else {
          win.dataset.collapsed = 'true';
          if (content) content.style.display = 'none';
          win.style.height = collapsedH + 'px';
        }
        win.style.top = top + 'px';
        top += (isSelected ? expandedH : collapsedH) + gap;
      });
    }
    function headerClickable(win){
      var header = win && win.querySelector('.window-header');
      if (!header) return;
      header.addEventListener('click', function(e){
        if (e.target.closest('.window-controls')) return; // 忽略控制按钮
        layoutMobileDrawer(win);
      });
    }
    wins.forEach(headerClickable);
    // 绿色放大按钮：在移动端抽屉模式下充当“展开”动作
    function attachMaximizeExpand(win){
      var btnMax = win && win.querySelector('.window-control.maximize');
      if (!btnMax) return;
      btnMax.addEventListener('click', function(e){
        e.stopPropagation();
        e.preventDefault();
        layoutMobileDrawer(win);
      });
    }
    wins.forEach(attachMaximizeExpand);
    // 黄色最小化按钮：在移动端抽屉模式下充当“折叠”动作（全部折叠）
    function attachMinimizeCollapse(win){
      var btnMin = win && win.querySelector('.window-control.minimize');
      if (!btnMin) return;
      btnMin.addEventListener('click', function(e){
        e.stopImmediatePropagation();
        e.preventDefault();
        layoutMobileDrawer(null); // 不选中任何窗口，全部保持折叠
      });
    }
    wins.forEach(attachMinimizeCollapse);
    // 监听窗口大小变化，重新布局抽屉
    function handleResize() {
      var selectedWin = wins.find(function(win) { return win && win.dataset.collapsed === 'false'; });
      layoutMobileDrawer(selectedWin || wAbout);
    }
    window.addEventListener('resize', handleResize);
    // 初始布局
    layoutMobileDrawer(wAbout);
  }
}

// 移动端：按视口宽度等比例缩放 Dock，保证完整显示
function scaleDockToFit(){
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var vw = document.documentElement.clientWidth || window.innerWidth;
  var margin = 16; // 两侧安全边距
  // 重置以测量自然宽度
  dock.style.transform = 'translateX(-50%)';
  var naturalWidth = dock.scrollWidth;
  var maxWidth = Math.max(0, vw - margin * 2);
  if (vw <= 768 && naturalWidth > maxWidth){
    var scale = maxWidth / naturalWidth;
    dock.style.transformOrigin = 'center bottom';
    dock.style.transform = 'translateX(-50%) scale(' + scale + ')';
  } else {
    dock.style.transform = 'translateX(-50%)';
  }
}

// 初始与窗口尺寸变化时缩放
scaleDockToFit();
window.addEventListener('resize', scaleDockToFit);

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
  // 移动端：打开相册时关闭其他窗口，保持与其它窗口逻辑一致
  if (window.innerWidth <= 768){
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){
      if (existing && w === existing) return;
      w.remove();
    });
  }
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
    '      <div style="padding:10px 10px 10px 20px; font-size:13px; cursor:pointer; background-color:#e8e8e8; color:#0a84ff;" class="photo-nav-item" data-section="photos">'+landscapesText+'</div>',
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

  // 移动端：窗口宽度 90%，居中；左侧相册栏改为悬浮折叠抽屉（与文章列表一致）
  if (window.innerWidth <= 768){
    win.style.width = '90vw';
      win.style.minWidth = '90vw';
      win.style.left = '5vw';
    // 更新标志，因为left样式被修改了
    win.dataset.hasInlineLeft = 'true';
  }
  if (contentEl){
    contentEl.style.position = 'relative';
    var sidebar = contentEl.children[0];
    var rightPane = contentEl.children[1];
    if (window.innerWidth <= 768 && sidebar && rightPane){
      var baseWidth = 200; // 相册侧栏原始宽度
      var collapsed = false; // 默认展开，保持初次浏览体验
      rightPane.style.flex = '1';
      sidebar.style.position = 'absolute';
      sidebar.style.left = '0';
      sidebar.style.top = '0';
      sidebar.style.height = '100%';
      sidebar.style.width = baseWidth + 'px';
      sidebar.style.zIndex = '20';
      sidebar.style.background = 'rgba(245,245,245,0.6)';
      sidebar.style.backdropFilter = 'blur(12px)';
      sidebar.style.webkitBackdropFilter = 'blur(12px)';
      sidebar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
      sidebar.style.borderRight = '1px solid #d1d1d1';
      sidebar.style.transition = 'transform 0.25s ease';
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.pointerEvents = 'auto';

      var mask = document.createElement('div');
      mask.style.position = 'absolute';
      mask.style.left = baseWidth + 'px';
      mask.style.top = '0';
      mask.style.width = 'calc(100% - '+baseWidth+'px)';
      mask.style.height = '100%';
      mask.style.background = 'rgba(0,0,0,0.01)';
      mask.style.zIndex = '25';
      mask.style.display = 'block';
      contentEl.appendChild(mask);

      var toggle = document.createElement('div');
      toggle.className = 'mobile-sidebar-toggle';
      toggle.textContent = '‹';
      toggle.style.position = 'absolute';
      toggle.style.left = '0px';
      toggle.style.top = '50%';
      toggle.style.transform = 'translateY(-50%)';
      toggle.style.width = '18px';
      toggle.style.height = '56px';
      toggle.style.display = 'none';
      toggle.style.alignItems = 'center';
      toggle.style.justifyContent = 'center';
      toggle.style.border = '1px solid #d1d1d1';
      toggle.style.borderLeft = 'none';
      toggle.style.borderRadius = '0 10px 10px 0';
      toggle.style.background = 'rgba(245,245,245,0.6)';
      toggle.style.backdropFilter = 'blur(10px)';
      toggle.style.webkitBackdropFilter = 'blur(10px)';
      toggle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
      toggle.style.color = '#666';
      toggle.style.fontSize = '16px';
      toggle.style.lineHeight = '56px';
      toggle.style.cursor = 'pointer';
      toggle.style.zIndex = '30';
      contentEl.appendChild(toggle);

      function collapseSidebar(){
        collapsed = true;
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.pointerEvents = 'none';
        toggle.textContent = '›';
        toggle.style.display = 'flex';
        mask.style.display = 'none';
      }
      function expandSidebar(){
        collapsed = false;
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.pointerEvents = 'auto';
        toggle.textContent = '‹';
        toggle.style.display = 'none';
        mask.style.display = 'block';
      }

      // 初始展开：隐藏把手；折叠后显示
      toggle.style.display = collapsed ? 'flex' : 'none';

      toggle.addEventListener('click', function(){
        if (collapsed){
          expandSidebar();
        } else {
          collapseSidebar();
        }
      });
      mask.addEventListener('click', function(){
        if (!collapsed){ collapseSidebar(); }
      });
    }
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
        '<div '+cellAttrs+' style="background-color:#f0f0f0; border-radius:6px; overflow:hidden; position:relative; cursor:zoom-in;">',
        '  <div style="padding-top:100%;">',
        '    <img src="'+url+'" loading="lazy" decoding="async" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; display:block; '+imgExtra+'" />',
        '  </div>',
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
      photoNavItems.forEach(function(i){ i.style.backgroundColor = ''; i.style.color = '#000'; });
      item.style.backgroundColor = '#e8e8e8';
      item.style.color = '#0a84ff';
      var section = item.getAttribute('data-section') || 'all-photos';
      updatePhotoContent(section);
      // 选中后自动折叠侧栏（移动端/窄屏体验更佳）
      if (typeof collapseSidebar === 'function') { collapseSidebar(); }
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

// 绑定桌面图标（About Me / Survival Guide / Empty Secret / Trash）
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
    // Empty Secret（含中文别名）
    else if (name === 'Empty Secret' || name === '空白的秘密'){
      icon.addEventListener('click', openEmptySecretWindow);
    }
    // Trash（含中文别名）
    else if (name === 'Trash' || name === '垃圾桶'){
      icon.addEventListener('click', openTrashWindow);
    }
  });
}

// 绑定菜单项点击事件
function bindMenuItems(){
  var wangItem = document.querySelector('.menu-items .menu-item:first-child');
  if (wangItem && wangItem.textContent.trim() === 'WANG') {
    wangItem.addEventListener('click', function() {
      // 关闭所有打开的窗口
      var windows = document.querySelectorAll('.macos-window');
      windows.forEach(function(win) {
        win.remove();
      });
      
      // 重置页面状态
      // 重置灵动岛状态
      var menuBar = document.querySelector('.macos-theme .menu-bar');
      if (menuBar) {
        menuBar.classList.remove('expanded', 'photo-mode', 'paused');
        var isExpanded = false;
        var currentIndex = 0;
        var modeIndex = 0;
        // 重新初始化灵动岛
        if (typeof renderCurrent === 'function') {
          renderCurrent(isExpanded);
        }
      }
      
      // 重置移动端菜单
      var mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu) {
        mobileMenu.classList.remove('open');
        var items = mobileMenu.querySelectorAll('.mobile-menu-list li');
        items.forEach(function(i) {
          i.classList.remove('active');
        });
      }
      
      // 确保便签显示
      var note = document.querySelector('.sticky-note');
      if (note) {
        note.style.display = '';
      }
    });
  }
}

function initMenuClock(){
  var dateEl = document.getElementById('current-date');
  var timeEl = document.getElementById('current-time');
  if (!dateEl || !timeEl) return;
  
  // 使用setTimeout递归代替setInterval，提高时间精度
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
    
    // 计算下一次更新时间（精确到下一秒）
    var now = Date.now();
    var nextUpdate = Math.ceil(now / 1000) * 1000;
    window.__macosClockTimeout__ = setTimeout(update, nextUpdate - now);
  }
  
  update();
  
  // 清理旧定时器
  if (window.__macosClockInterval__) {
    clearInterval(window.__macosClockInterval__);
    window.__macosClockInterval__ = null;
  }
  if (window.__macosClockTimeout__) {
    clearTimeout(window.__macosClockTimeout__);
  }
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

// 移动端汉堡菜单交互（需在 IIFE 内，便于调用内部窗口函数）
function initMobileMenu(){
  var btn = document.getElementById('mobileHamburger');
  var menu = document.getElementById('mobileMenu');
  var btnClose = document.getElementById('mobileMenuClose');
  if (!btn || !menu) return;
  function open(){ menu.classList.add('open'); }
  function close(){ menu.classList.remove('open'); }
  btn.addEventListener('click', open);
  if (btnClose) btnClose.addEventListener('click', close);
  menu.addEventListener('click', function(e){ if (e.target === menu) close(); });
  var items = menu.querySelectorAll('.mobile-menu-list li');
  items.forEach(function(li){
    li.addEventListener('click', function(){
      // 选中态：文字改为蓝色，其余恢复
      items.forEach(function(i){ i.classList.remove('active'); });
      li.classList.add('active');
      var act = li.getAttribute('data-action');
      close();
      if (act === 'about') openAboutMeWindows();
      else if (act === 'guide') openSurvivalGuideWindow();
      else if (act === 'empty') openEmptySecretWindow();
      else if (act === 'trash') openTrashWindow();
    });
  });
}

// 新增窗口：Empty Secret（占位内容）
function openEmptySecretWindow(){
  // 移动端：打开任一窗口时关闭其他窗口，确保不同时显示
  if (window.innerWidth <= 768){
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){ w.remove(); });
  }
  var existing = Array.from(document.querySelectorAll('.macos-window'))
    .find(function(w){ var t = w.querySelector('.window-title'); return t && t.textContent.trim() === 'Empty Secret'; });
  if (existing){ bringToFront(existing); return; }
  var html = '<div style="padding:12px;">\
    <p style="margin:0; color:#333;">Nothing here yet. Keep exploring.</p>\
  </div>';
  var win = createWindow({ title: 'Empty Secret', contentHTML: html, width: 360, height: 240 });
  // 移动端：宽度设置为设备宽度的 90%，并水平居中
  if (window.innerWidth <= 768 && win){
    var container = document.querySelector('.macos-theme') || document.body;
    win.style.width = '90vw';
      win.style.minWidth = '90vw';
      win.style.left = '5vw';
    // 更新标志，因为left样式被修改了
    win.dataset.hasInlineLeft = 'true';
  }
}

// 新增窗口：Trash（占位内容）
function openTrashWindow(){
  // 移动端：打开任一窗口时关闭其他窗口，确保不同时显示
  if (window.innerWidth <= 768){
    Array.from(document.querySelectorAll('.macos-window')).forEach(function(w){ w.remove(); });
  }
  var existing = Array.from(document.querySelectorAll('.macos-window'))
    .find(function(w){ var t = w.querySelector('.window-title'); return t && t.textContent.trim() === 'Trash'; });
  if (existing){ bringToFront(existing); return; }
  var html = '<div style="padding:12px;">\
    <p style="margin:0; color:#333;">No items. Your Trash is empty.</p>\
  </div>';
  var win = createWindow({ title: 'Trash', contentHTML: html, width: 360, height: 240 });
  // 移动端：宽度设置为设备宽度的 90%，并水平居中
  if (window.innerWidth <= 768 && win){
    win.style.width = '90vw';
      win.style.minWidth = '90vw';
      win.style.left = '5vw';
    // 更新标志，因为left样式被修改了
    win.dataset.hasInlineLeft = 'true';
  }
}

document.addEventListener('DOMContentLoaded', function(){
  bindDockIcons();
  bindDesktopIcons();
  bindMenuItems();
  initLanguageToggle();
  initStickyNoteDrag();
  initMenuClock();
  initTypewriterWelcome();
  initMobileMenu();

  // Dynamic Island 演示：顶栏药丸向下与左右放大 6 倍，2s 后复原
  var menuBar = document.querySelector('.macos-theme .menu-bar');
  if (menuBar) {
    // 在药丸右侧添加计时环元素（若不存在）
    var pillTimer = menuBar.querySelector('.pill-timer');
    if (!pillTimer) {
      pillTimer = document.createElement('div');
      pillTimer.className = 'pill-timer';
      menuBar.appendChild(pillTimer);
    }

    // 新增：左侧圆形照片容器（与计时环对称）
    var pillPhoto = menuBar.querySelector('.pill-photo');
    if (!pillPhoto) {
      pillPhoto = document.createElement('div');
      pillPhoto.className = 'pill-photo';
      pillPhoto.innerHTML = '<img alt="" />';
      menuBar.appendChild(pillPhoto);
    }

    // 新增：底部磨砂背景容器（照片模式下展示）
    if (!menuBar.querySelector('.pill-bg')) {
      var pillBg = document.createElement('div');
      pillBg.className = 'pill-bg';
      pillBg.innerHTML = '<div class="fill"></div><div class="frost"></div>';
      menuBar.appendChild(pillBg);
    }

    // 在药丸上方添加内容容器（标题/日期/徽标/阅读时长）
    if (!menuBar.querySelector('.pill-content')) {
      var pillContent = document.createElement('div');
      pillContent.className = 'pill-content';
      pillContent.innerHTML = '<div class="pill-text">'+
                                '<div class="pill-title"></div>'+
                                '<div class="pill-row">'+
                                  '<div class="pill-meta"></div>'+
                                  '<div class="pill-badges"></div>'+
                                '</div>'+
                              '</div>';
      menuBar.appendChild(pillContent);
    }

    // 使用实际 Survival Guide 文章：从 __MACOS_POSTS__ 过滤分类/标签包含 Survival Guide/指南
    function isSurvivalGuidePost(p){
      function toList(x){
        if (Array.isArray(x)) return x; if (!x) return []; if (typeof x === 'string') return [x];
        if (x && typeof x.toArray === 'function') return x.toArray();
        if (x && Array.isArray(x.data)) return x.data;
        return [];
      }
      var cats = toList(p.categories).map(function(c){ return (c.name || c).toLowerCase(); });
      var tags = toList(p.tags).map(function(t){ return (t.name || t).toLowerCase(); });
      var hasCat = cats.some(function(c){ return c.indexOf('survival guide') >= 0 || c.indexOf('指南') >= 0; });
      var hasTag = tags.some(function(t){ return t.indexOf('survival guide') >= 0 || t.indexOf('指南') >= 0; });
      return hasCat || hasTag;
    }
    function norm(x){
      var s = '';
      if (typeof x === 'string') s = x; else if (x && typeof x.name === 'string') s = String(x.name); else return '';
      s = s.toLowerCase();
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
      function hasAny(needles){ return labels.some(function(l){ return needles.some(function(n){ return l === n || l.indexOf(n) >= 0; }); }); }
      var isTop = !!(p.top || p.featured) || hasAny(needlesTop);
      var isHot = !!(p.hot || p.popular) || hasAny(needlesHot);
      var isNew = false; var pd = Date.parse(p.date || ''); if (!isNaN(pd)){ var days = (Date.now() - pd) / (1000*60*60*24); if (days <= 10) isNew = true; }
      var count = (isTop?1:0) + (isHot?1:0) + (isNew?1:0);
      var weight = (isTop?3:0) + (isHot?2:0) + (isNew?1:0);
      return { isTop:isTop, isHot:isHot, isNew:isNew, count:count, weight:weight };
    }
    var postsAll = Array.isArray(window.__MACOS_POSTS__) ? window.__MACOS_POSTS__ : [];
    var articles = postsAll.filter(isSurvivalGuidePost).map(function(p){ var f = computeFlags(p); return Object.assign({}, p, { __isTop:f.isTop, __isHot:f.isHot, __isNew:f.isNew, __badgeCount:f.count, __badgeWeight:f.weight }); })
      .sort(function(a,b){
        if (b.__badgeCount !== a.__badgeCount) return b.__badgeCount - a.__badgeCount;
        if (b.__badgeWeight !== a.__badgeWeight) return b.__badgeWeight - a.__badgeWeight;
        var ad = Date.parse(a.date || ''), bd = Date.parse(b.date || '');
        if (!isNaN(ad) && !isNaN(bd)) return bd - ad;
        return 0;
      });
    if (articles.length === 0) { articles = postsAll; }

    var currentIndex = 0;

    // 新增：聚合所有照片供灵动岛使用
    function getAllPhotos(){
      var data = window.__MACOS_PHOTOS__ || [];
      var out = []; var seen = new Set();
      function push(u){
        var url = (typeof u === 'string') ? u : (u && u.url) || '';
        if (url && !seen.has(url)) { seen.add(url); out.push(url); }
      }
      if (Array.isArray(data)) { data.forEach(push); }
      else {
        ['photos','people','projects','aigc','favorites','recent','all'].forEach(function(k){
          var arr = data[k]; if (Array.isArray(arr)) arr.forEach(push);
        });
      }
      return out;
    }
    var photoList = getAllPhotos();
    var hasPhotos = photoList && photoList.length > 0;
    var modes = hasPhotos ? ['article','photo','photo','photo'] : ['article'];
    var modeIndex = 0;
    var nextPhotoUrl = null; // 预加载的下一张照片 URL，展开时立即使用
    function currentMode(){ return modes[modeIndex]; }
    function pickRandomPhoto(){
      if (!hasPhotos) return '';
      var n = photoList.length;
      var r = Math.floor(Math.random() * n);
      return photoList[r];
    }

    function updateSafeWidths(){
      var pillContent = menuBar.querySelector('.pill-content');
      var pillText = pillContent && pillContent.querySelector('.pill-text');
      var pillRow = pillContent && pillContent.querySelector('.pill-row');
      var ring = menuBar.querySelector('.pill-timer');
      if (!pillContent || !ring) return;
      var contentRect = pillContent.getBoundingClientRect();
      var ringRect = ring.getBoundingClientRect();
      var cs = getComputedStyle(pillContent);
      var pl = parseFloat(cs.paddingLeft) || 0;
      // 支持可配置的最小安全间距（实时）：从 CSS 变量 --safe-gap 读取，默认 2px（允许 0）
      var gapVar = cs.getPropertyValue('--safe-gap');
      var parsed = parseFloat(gapVar);
      var safeGap = isNaN(parsed) ? 2 : parsed; // 使用 isNaN 处理 0 值而不回退
      // 允许收缩态文字左移：读取 CSS 变量 --collapsed-shift（负值表示向左），默认 0
      var shiftVar = cs.getPropertyValue('--collapsed-shift');
      var shiftParsed = parseFloat(shiftVar);
      var collapsedShift = isNaN(shiftParsed) ? 0 : shiftParsed;
      // 基础安全宽度：圆环左侧 - 内容左侧 - 左内边距 - 最小安全间距
      var baseSafe = ringRect.left - contentRect.left - pl - safeGap;
      // 居中对齐下，左移 S(<0) 会让右缘同时左移 S；补偿需加 2*|S|
      var shiftAbs = Math.abs(collapsedShift);
      var shiftComp = collapsedShift < 0 ? 2 * shiftAbs : 0;
      var safe = Math.max(0, baseSafe + shiftComp);
      if (pillText) { pillText.style.maxWidth = safe + 'px'; }
      if (pillRow) { pillRow.style.maxWidth = safe + 'px'; }
    }

    function renderArticle(expanded){
      var pillContent = menuBar.querySelector('.pill-content');
      if (!pillContent) return;
      var titleEl = pillContent.querySelector('.pill-title');
      var metaEl = pillContent.querySelector('.pill-meta');
      var badgesEl = pillContent.querySelector('.pill-badges');
      var a = articles[currentIndex % articles.length];
      if (!a) return;
      var minutes = a.readingTime || a.minutes || a.read_time || a.readtime || '';
      var readText = '';
      if (minutes !== '') { var m = parseInt(minutes, 10); readText = isNaN(m) ? String(minutes) : (m + ' min'); }
      var metaText = [a.date || '', readText].filter(Boolean).join(' · ');
      var badges = [];
      if (a.__isNew) badges.push('<span class="mac-badge mac-badge-new">NEW</span>');
      if (a.__isTop) badges.push('<span class="mac-badge mac-badge-top">TOP</span>');
      if (a.__isHot) badges.push('<span class="mac-badge mac-badge-hot">HOT</span>');

      // 每次渲染先根据实际位置更新安全宽度
      updateSafeWidths();

      // 文章模式下隐藏照片圆形并清空图片
      menuBar.classList.remove('photo-mode');
      var _photoImg = menuBar.querySelector('.pill-photo img');
      if (_photoImg) _photoImg.src = '';

      if (expanded) {
        // 展开：完整信息 + 徽标（溢出时启用跑马灯）
        titleEl.textContent = a.title || '';
        titleEl.setAttribute('data-text', titleEl.textContent);
        metaEl.textContent = metaText;
        metaEl.style.display = 'inline-flex';
        badgesEl.innerHTML = badges.join('');
        badgesEl.style.display = 'inline-flex';
        requestAnimationFrame(function(){
          try {
            updateSafeWidths();
            var pillText = pillContent.querySelector('.pill-text');
            var available = pillText ? pillText.clientWidth : pillContent.clientWidth;
            var needed = titleEl.scrollWidth;
            if (needed > available) { titleEl.classList.add('marquee'); } else { titleEl.classList.remove('marquee'); }
          } catch(e){}
        });
      } else {
        // 收缩：仅标题；超长走马灯
        badgesEl.style.display = 'none';
        metaEl.style.display = 'none';
        titleEl.textContent = a.title || '';
        titleEl.setAttribute('data-text', titleEl.textContent);
        requestAnimationFrame(function(){
          try {
            updateSafeWidths();
            var pillText = pillContent.querySelector('.pill-text');
            var available = pillText ? pillText.clientWidth : pillContent.clientWidth;
            var needed = titleEl.scrollWidth;
            if (needed > available) { titleEl.classList.add('marquee'); } else { titleEl.classList.remove('marquee'); }
          } catch(e){}
        });
      }
    }

    // 新增：照片模式渲染（收缩态显示提示语；展开态显示左侧圆形照片）
    function renderPhoto(expanded){
      console.log('=== 进入照片模式渲染 ===');
      console.log('展开状态:', expanded);
      var pillContent = menuBar.querySelector('.pill-content');
      if (!pillContent) { console.log('未找到pill-content元素'); return; }
      var titleEl = pillContent.querySelector('.pill-title');
      var metaEl = pillContent.querySelector('.pill-meta');
      var badgesEl = pillContent.querySelector('.pill-badges');
      var pillPhoto = menuBar.querySelector('.pill-photo');
// 如果pill-photo容器不存在则动态创建
if (!pillPhoto) {
  pillPhoto = document.createElement('div');
  pillPhoto.className = 'pill-photo';
  pillPhoto.style.display = 'flex';
  pillPhoto.style.alignItems = 'center';
  pillPhoto.style.justifyContent = 'center';
  menuBar.appendChild(pillPhoto);
}
var photoImg = pillPhoto.querySelector('img') || document.createElement('img');
if (!pillPhoto.contains(photoImg)) {
  pillPhoto.appendChild(photoImg);
}

      updateSafeWidths();

      if (expanded) {
        // 展开：仅显示圆形照片与底部磨砂背景，隐藏文案与徽标
        menuBar.classList.add('photo-mode');
        var url = nextPhotoUrl || pickRandomPhoto();
        nextPhotoUrl = null; // 用掉预加载的图片
        if (photoImg && url) { photoImg.src = url; }
// 照片模式下点击事件已迁移到灵动岛主容器，移除照片容器单独绑定
if (pillPhoto) { pillPhoto.style.pointerEvents = 'none'; console.log('灵动岛照片容器事件已迁移到主容器'); }
        // 同步底部磨砂背景图
        var pillBgFill = menuBar.querySelector('.pill-bg .fill');
        if (pillBgFill && url) { pillBgFill.style.backgroundImage = 'url("'+url+'")'; }
        titleEl.textContent = '';
        titleEl.setAttribute('data-text','');
        metaEl.style.display = 'none';
        badgesEl.style.display = 'none';
      } else {
        // 收缩：提示语 + 预加载下一张照片（保持隐藏，通过 CSS opacity 控制）
        menuBar.classList.remove('photo-mode');
        var nextUrl = nextPhotoUrl || pickRandomPhoto();
        nextPhotoUrl = nextUrl;
        if (photoImg && nextUrl) { photoImg.src = nextUrl; }
// 照片模式下点击事件已迁移到灵动岛主容器，移除照片容器单独绑定
if (pillPhoto) { pillPhoto.style.pointerEvents = 'none'; }
        var pillBgFill2 = menuBar.querySelector('.pill-bg .fill');
        if (pillBgFill2 && nextUrl) { pillBgFill2.style.backgroundImage = 'url("'+nextUrl+'")'; }
        badgesEl.style.display = 'none';
        metaEl.style.display = 'none';
        var tip = '您有新照片可以查看哟~';
        titleEl.textContent = tip;
        titleEl.setAttribute('data-text', tip);
      }
    }

    // 新增：根据模式切换渲染
    function renderCurrent(expanded){
      if (currentMode() === 'photo') { renderPhoto(expanded); }
      else { renderArticle(expanded); }
    }

    // 初始为收缩状态
    var isExpanded = false;
    renderCurrent(isExpanded);

    // 自动切换计时器（支持精确暂停/恢复，不重置已过时间）
    var autoToggleDelay = 6000;
    var nextToggleTimeout = null;
    var lastStartAt = null;
    var remainingMs = autoToggleDelay;
    function togglePill(){
      isExpanded = !isExpanded;
      if (isExpanded && currentMode() === 'article') { currentIndex++; }
      menuBar.classList.toggle('expanded', isExpanded);
      renderCurrent(isExpanded);
      requestAnimationFrame(updateSafeWidths);
      // 折回到收缩态后切换模式（文章/照片交替出现）
      if (!isExpanded && modes.length > 1) { modeIndex = (modeIndex + 1) % modes.length; }
    }
    function scheduleNext(ms){
      if (nextToggleTimeout) { clearTimeout(nextToggleTimeout); nextToggleTimeout = null; }
      remainingMs = ms;
      lastStartAt = Date.now();
      nextToggleTimeout = setTimeout(function(){
        togglePill();
        scheduleNext(autoToggleDelay);
      }, remainingMs);
    }
    function startAutoToggle(){
      if (nextToggleTimeout) return;
      var ms = (typeof remainingMs === 'number' && remainingMs >= 0) ? remainingMs : autoToggleDelay;
      scheduleNext(ms);
    }
    function stopAutoToggle(){
      if (!nextToggleTimeout) return;
      var elapsed = Date.now() - lastStartAt;
      remainingMs = Math.max(0, remainingMs - elapsed);
      clearTimeout(nextToggleTimeout);
      nextToggleTimeout = null;
    }
    startAutoToggle();

      // 交互：点击缩小态药丸立即扩大（不切换文章）；移除悬停相关逻辑
      function expandByClick(e) {
        // 照片模式下点击整个灵动岛区域都触发相册窗口
        if (menuBar.classList.contains('photo-mode')) {
          if (typeof openPhotosWindow === 'function') {
            console.log('照片模式下点击灵动岛区域，触发相册窗口');
            openPhotosWindow();
          }
          return;
        }
        // 非照片模式下忽略照片区域点击
        if (e.target.closest('.pill-photo')) return;
        if (!menuBar.classList.contains('expanded')){
          isExpanded = true;
          menuBar.classList.add('expanded');
          renderCurrent(true);
          requestAnimationFrame(updateSafeWidths);
        }
      }
      var pillContentEl = menuBar.querySelector('.pill-content');
      var pillTimerEl = menuBar.querySelector('.pill-timer');
      if (pillContentEl){
        pillContentEl.addEventListener('click', function(e) { expandByClick(e); });
        // 扩大态悬停：仅暂停计时与圆环动画，不折回
        pillContentEl.addEventListener('mouseenter', function(){
          if (menuBar.classList.contains('expanded')){
            stopAutoToggle();
            menuBar.classList.add('paused');
          }
        });
        pillContentEl.addEventListener('mouseleave', function(){
          if (menuBar.classList.contains('expanded')){
            menuBar.classList.remove('paused');
            startAutoToggle();
          }
        });
      }
      if (pillTimerEl){
        pillTimerEl.addEventListener('click', function(e) { expandByClick(e); });
        // 扩大态悬停：仅暂停计时与圆环动画，不折回
        pillTimerEl.addEventListener('mouseenter', function(){
          if (menuBar.classList.contains('expanded')){
            stopAutoToggle();
            menuBar.classList.add('paused');
          }
        });
        pillTimerEl.addEventListener('mouseleave', function(){
          if (menuBar.classList.contains('expanded')){
            menuBar.classList.remove('paused');
            startAutoToggle();
          }
        });
      }
      // 扩大态：点击标题聚焦文章列表窗口中的对应条目
      var pillTitleEl = menuBar.querySelector('.pill-title');
      if (pillTitleEl){
        pillTitleEl.addEventListener('click', function(){
          if (!menuBar.classList.contains('expanded')) return;
          try {
            if (typeof openSurvivalGuideWindow === 'function') { openSurvivalGuideWindow(); }
            var listWin = document.getElementById('article-list-window');
            if (!listWin) return;
            if (typeof bringToFront === 'function') { bringToFront(listWin); }
            var idx = currentIndex % (articles.length || 1);
            var items = Array.from(listWin.querySelectorAll('.article-item'));
            var target = items.find(function(i){ return parseInt(i.getAttribute('data-index')||'0',10) === idx; });
            if (target){
              try { target.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch(e){}
              target.click();
            }
          } catch(e){}
        });
      }

    window.addEventListener('resize', function(){ requestAnimationFrame(updateSafeWidths); });
  }
});

// 透明模态框查看大图
function openPhotoModal(url){
  if (!url) return;
  
  // 常量定义
  const MODAL_Z_INDEX = 10000;
  const FADE_DURATION = 160;
const IMAGE_MAX_SCALE = 4; // 降低最大缩放比例，5倍可能过大
const DOUBLE_TAP_THRESHOLD = 250;
const WHEEL_SCALE_FACTOR = 0.9; // 调整滚轮缩放步进
const MIN_SCALE = 0.5; // 允许缩小到原始大小的50%
  const CONTAINER_PADDING = 24;
  
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
  overlay.style.zIndex = MODAL_Z_INDEX;
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .15s ease';
  overlay.style.overflow = 'hidden'; // 防止阴影溢出导致滚动条
  var wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.maxWidth = '80vw';
  wrap.style.maxHeight = '80vh';
  wrap.style.padding = '0px'; // 移除内边距
  wrap.style.boxShadow = 'none'; // 移除阴影
  wrap.style.boxSizing = 'border-box'; // 内边距包含在尺寸内
     var img = document.createElement('img');
   img.src = url;
   img.style.display = 'block';
   img.style.borderRadius = '6px';
   // 移除图片阴影，由容器统一承载
   img.style.objectFit = 'contain';
    // 不再显示任何按钮，点击图片即可关闭

   // 根据视口与图片原始尺寸动态适配，初始显示不超过80%但允许放大超出
   function fitImage(customWidth = null, customHeight = null){
     // 如果图片已经放大，不重新计算尺寸
     if (typeof scale !== 'undefined' && scale > 1) return; // 与其他地方保持一致，使用1作为阈值
     
     // 使用clientWidth/clientHeight获取实际可用视口尺寸
     var vw = customWidth !== null ? customWidth : wrap.clientWidth;
     var vh = customHeight !== null ? customHeight : wrap.clientHeight;
     // 使用保存的窗口尺寸直接计算，不应用额外缩放
     var maxW = Math.floor(vw);
     var maxH = Math.floor(vh);
     wrap.style.maxWidth = maxW + 'px';
     wrap.style.maxHeight = maxH + 'px';
     wrap.style.boxSizing = 'border-box';
       // 允许图片超出容器边界
     var nw = img.naturalWidth || maxW;
     var nh = img.naturalHeight || maxH;
     // 不再扣除容器内边距
     var contentWidth = maxW;
     var contentHeight = maxH;
     var ratio = nw / nh;
     var boxRatio = contentWidth / contentHeight;
     
     // 初始显示时适配容器，但放大时允许超出
     if (ratio > boxRatio){
       img.style.width = contentWidth + 'px';
       img.style.height = 'auto';
     } else {
       img.style.height = contentHeight + 'px';
       img.style.width = 'auto';
     }
   }

   wrap.appendChild(img);
   overlay.appendChild(wrap);
   document.body.appendChild(overlay);
   requestAnimationFrame(function(){ overlay.style.opacity = '1'; });
   
   // 触控放大与拖拽
   wrap.style.touchAction = 'none';
   img.style.userSelect = 'none';
   img.style.willChange = 'transform';
   var scale = 1, minScale = MIN_SCALE, maxScale = IMAGE_MAX_SCALE;
   var startDist = 0, startScale = 1;
   var tx = 0, ty = 0;
   var isPanning = false, lastX = 0, lastY = 0;
   var baseW = 0, baseH = 0;
   
   function resetBase(){ 
     var r = img.getBoundingClientRect(); 
     baseW = r.width; 
     baseH = r.height; 
   }
   
   function clampPan(){
     // 移除边界限制，允许图片完全拖出视口
     // 这样用户可以自由地拖拽图片，不受边界约束
   }
   
   function applyTransform(){ 
     // 不在这里设置过渡效果，由各个事件处理器自行控制
     img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; 
   }
   
   function dist2(a, b){ 
     var dx = a.clientX - b.clientX; 
     var dy = a.clientY - b.clientY; 
     return Math.sqrt(dx*dx + dy*dy); 
   }
   
   function midpoint(a,b){ 
     return { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 }; 
   }

   // 图片加载完成后初始化基准尺寸
   img.addEventListener('load', function() {
     resetBase();
     fitImage();
   }, { once: true });
   
   // 图片加载失败处理
   img.addEventListener('error', function() {
     console.error('Failed to load image:', url);
     // 可以在这里添加错误提示，比如显示一个错误图标或文本
   }, { once: true });
   
   // 初始化时也尝试设置基准尺寸
   if (img.complete) {
     resetBase();
   }
   
   fitImage();
   // 创建具名函数以便后续移除
   function handleResize() {
     // 只有在图片未放大时才重新适配窗口大小
     if (scale <= 1) { // 与其他地方保持一致，使用1作为阈值
       fitImage();
     }
   }
   
   window.addEventListener('resize', handleResize);

   wrap.addEventListener('touchstart', function(e){
     if (e.touches.length === 2){
       e.preventDefault();
       var a = e.touches[0], b = e.touches[1];
       startDist = dist2(a,b);
       startScale = scale;
       var m = midpoint(a,b);
       var rect = img.getBoundingClientRect();
       // 防止除零错误
       var rectWidth = rect.width || 1;
       var rectHeight = rect.height || 1;
       var ox = ((m.x - rect.left) / rectWidth) * 100;
       var oy = ((m.y - rect.top) / rectHeight) * 100;
       img.style.transformOrigin = ox + '% ' + oy + '%';
       // 重置拖拽状态，防止从缩放切换到拖拽时出现跳跃
       isPanning = false;
     } else if (e.touches.length === 1) {
       // 只有在图片已放大时才启用拖拽
       if (scale > 1) {
         isPanning = true; 
         lastX = e.touches[0].clientX; 
         lastY = e.touches[0].clientY;
       } else {
         // 图片未放大时，禁用拖拽
         isPanning = false;
       }
     }
   }, { passive: false });
   
   // 触摸取消事件处理
   wrap.addEventListener('touchcancel', function(e){ 
     isPanning = false; 
     // 无论放大多少，都保存当前缩放状态
     if (scale > 1) { // 与其他地方保持一致，使用1作为阈值
       img.style.maxWidth = 'none';
       img.style.maxHeight = 'none';
     }
     // 恢复过渡效果
     img.style.transition = 'transform 0.1s ease-out';
   });

   wrap.addEventListener('touchmove', function(e){
     if (e.touches.length === 2){
       e.preventDefault();
       // 如果之前是拖拽状态，需要重置状态
       if (isPanning) {
         isPanning = false;
       }
       
       // 快速缩放时移除过渡，避免延迟
       img.style.transition = 'none';
       
       var a = e.touches[0], b = e.touches[1];
       var d = dist2(a,b);
       var prevScale = scale;
       // 优化缩放计算，提高跟手感
       // 修正缩放比例，使双指向外放大，向内缩小（符合用户直觉）
       var scaleRatio = startDist > 0 ? d / startDist : 1;
       var targetScale = startScale * scaleRatio;
       // 平滑过渡到目标缩放值，避免突变
       scale = scale + (targetScale - scale) * 0.8;
       scale = Math.min(maxScale, Math.max(minScale, scale));
       
       // 动态更新缩放原点，使缩放更加流畅
       var m = midpoint(a,b);
       var rect = img.getBoundingClientRect();
       // 防止除零错误
       var rectWidth = rect.width || 1;
       var rectHeight = rect.height || 1;
       var ox = ((m.x - rect.left) / rectWidth) * 100;
       var oy = ((m.y - rect.top) / rectHeight) * 100;
       img.style.transformOrigin = ox + '% ' + oy + '%';
       
       // 当从原始大小放大时，移除尺寸限制
       if (prevScale <= 1 && scale > 1) { // 使用统一的阈值判断
         img.style.maxWidth = 'none';
         img.style.maxHeight = 'none';
       }
       
       clampPan();
       applyTransform();
     } else if (e.touches.length === 1 && isPanning){
       e.preventDefault();
       // 拖拽时也移除过渡，确保跟手
       img.style.transition = 'none';
       
       var x = e.touches[0].clientX, y = e.touches[0].clientY;
       tx += (x - lastX); ty += (y - lastY);
       lastX = x; lastY = y;
       clampPan();
       applyTransform();
     }
   }, { passive: false });

   // 合并touchend事件处理，确保缩放状态正确保存
   wrap.addEventListener('touchend', function(e){
     // 处理双指缩放结束
     if (e.touches.length <= 1){ // 当手指数量从2减少到1或0时
       // 如果只剩一个手指且图片已放大，启用拖拽
       if (e.touches.length === 1 && scale > 1) {
         // 延迟启用拖拽，避免立即记录位置导致跳跃
         setTimeout(function() {
           if (e.touches.length === 1) { // 再次检查手指数量
             isPanning = true;
             lastX = e.touches[0].clientX;
             lastY = e.touches[0].clientY;
           }
         }, 50); // 短暂延迟确保状态切换完成
       } else {
         isPanning = false;
       }
       
       // 恢复过渡效果
       img.style.transition = 'transform 0.1s ease-out';
       
       // 无论放大多少，都保存当前缩放状态
       if (scale > 1) { // 与其他地方保持一致，使用1作为阈值
         img.style.maxWidth = 'none';
         img.style.maxHeight = 'none';
       }
     }
     // 已移除双击放大缩小功能
   }, { passive: false });

   // 桌面滚轮缩放（便于开发预览）
   wrap.addEventListener('wheel', function(e){
     e.preventDefault();
     var factor = e.deltaY > 0 ? WHEEL_SCALE_FACTOR : (1 / WHEEL_SCALE_FACTOR);
     var newScale = Math.min(maxScale, Math.max(minScale, scale * factor));
     var rect = img.getBoundingClientRect();
     // 防止除零错误
     var rectWidth = rect.width || 1;
     var rectHeight = rect.height || 1;
     var ox = ((e.clientX - rect.left) / rectWidth) * 100;
     var oy = ((e.clientY - rect.top) / rectHeight) * 100;
     img.style.transformOrigin = ox + '% ' + oy + '%';
     
     // 当从原始大小放大时，移除尺寸限制
     if (scale <= 1 && newScale > 1) { // 使用统一的阈值判断
       img.style.maxWidth = 'none';
       img.style.maxHeight = 'none';
     }
     
     scale = newScale;
     clampPan();
     applyTransform();
   }, { passive: false });

   // 添加页面卸载时的清理，防止内存泄漏
   function beforeUnloadHandler() {
     document.removeEventListener('keydown', onKey);
     window.removeEventListener('resize', handleResize);
     window.removeEventListener('beforeunload', beforeUnloadHandler);
   }
   
   window.addEventListener('beforeunload', beforeUnloadHandler);
   
   overlay.addEventListener('click', function(e){ if (e.target === overlay || e.target === img) close(); });
   function onKey(e){ if (e.key === 'Escape') close(); }
   document.addEventListener('keydown', onKey);

   function close(){
     overlay.style.opacity = '0';
     setTimeout(function(){ 
       // 确保所有事件监听器都被移除，防止内存泄漏
       document.removeEventListener('keydown', onKey);
       window.removeEventListener('resize', handleResize);
       window.removeEventListener('beforeunload', beforeUnloadHandler);
       overlay.remove(); 
     }, FADE_DURATION);
   }
}

// 点击事件委托已移至 openPhotosWindow 内部，避免全局引用未定义变量。
})();