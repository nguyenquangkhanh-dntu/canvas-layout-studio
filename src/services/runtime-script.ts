/**
 * Script nhỏ đi kèm HTML độc lập (không dùng cho Canvas, vì Canvas xóa JavaScript).
 * Chỉ đọc các thuộc tính data-* do bộ xuất tạo ra, không tải thư viện ngoài.
 *  - data-cls-copy : nút sao chép code
 *  - data-cls-cal  : lịch học (chuyển tháng, tooltip, hôm nay, buổi tới)
 *  - data-cls-prog : tiến độ tính lại theo ngày mở trang
 */
export const RUNTIME_SCRIPT = `<script>
(function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var now = new Date();
  var today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  function shortDate(k) { var d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)); return WD[d.getDay()] + ' ' + k.slice(8, 10) + '/' + k.slice(5, 7); }

  /* Nút sao chép code */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-cls-copy]');
    if (!btn) return;
    var code = btn.parentNode.parentNode.querySelector('pre code');
    if (!code || !navigator.clipboard) return;
    navigator.clipboard.writeText(code.textContent).then(function () {
      var old = btn.textContent; btn.textContent = 'Đã sao chép';
      setTimeout(function () { btn.textContent = old; }, 1500);
    });
  });

  /* Tooltip dùng chung */
  var tip = null, tipFor = null, lastPointer = 'mouse';
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.setAttribute('role', 'tooltip');
    tip.style.cssText = 'position:fixed;z-index:9999;max-width:320px;padding:10px 12px;border-radius:8px;background:#16212e;color:#e8eef4;font:13px/1.45 "Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 10px 28px rgba(16,32,48,.25);pointer-events:none;display:none;';
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(el) {
    var t = ensureTip(), data;
    try { data = JSON.parse(el.getAttribute('data-cls-tip')); } catch (err) { return; }
    t.textContent = '';
    var h = document.createElement('div'); h.style.cssText = 'color:#9fb4c7;font-weight:600;margin-bottom:6px'; h.textContent = data.h; t.appendChild(h);
    data.s.forEach(function (s, i) {
      var box = document.createElement('div');
      if (i) box.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.14)';
      var k = document.createElement('span'); k.textContent = s.k; k.style.cssText = 'display:inline-block;font-size:11px;padding:0 6px;border-radius:4px;color:#fff;margin-right:6px;background:' + s.c; box.appendChild(k);
      var m = document.createElement('span'); m.textContent = s.m; m.style.cssText = 'color:#b6c4d2;font-size:12px'; box.appendChild(m);
      var tt = document.createElement('div'); tt.textContent = s.t; tt.style.fontWeight = '600'; box.appendChild(tt);
      if (s.n) { var n = document.createElement('div'); n.textContent = s.n; n.style.cssText = 'color:#b6c4d2;font-size:12px'; box.appendChild(n); }
      t.appendChild(box);
    });
    t.style.display = 'block';
    var r = el.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
    var x = Math.min(window.innerWidth - tw - 12, Math.max(12, r.left + r.width / 2 - tw / 2));
    var y = r.bottom + 8; if (y + th > window.innerHeight - 8) y = Math.max(8, r.top - th - 8);
    t.style.left = x + 'px'; t.style.top = y + 'px'; tipFor = el;
  }
  function hideTip() { if (tip) tip.style.display = 'none'; tipFor = null; }
  document.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; }, true);
  document.addEventListener('mouseover', function (e) {
    if (lastPointer === 'touch') return;
    var el = e.target.closest && e.target.closest('[data-cls-tip]');
    if (el) showTip(el); else if (tipFor) hideTip();
  });
  window.addEventListener('scroll', function () {
    if (!tipFor) return;
    var r = tipFor.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) hideTip(); else showTip(tipFor);
  }, true);

  /* Lịch học */
  var cals = document.querySelectorAll('[data-cls-cal]');
  Array.prototype.forEach.call(cals, function (root) {
    var blocks = Array.prototype.slice.call(root.querySelectorAll('[data-cls-month]'));
    var dim = root.getAttribute('data-cls-dim') === '1';
    Array.prototype.forEach.call(root.querySelectorAll('[title]'), function (el) {
      if (el.closest('[data-cls-tip]')) el.removeAttribute('title');
    });
    var start = root.getAttribute('data-cls-start');
    if (root.getAttribute('data-cls-auto') === '1') {
      var tm = today.slice(0, 7);
      for (var i = 0; i < blocks.length; i += 1) if (blocks[i].getAttribute('data-cls-month') === tm) start = tm;
    }
    var cur = 0;
    blocks.forEach(function (b, i) { if (b.getAttribute('data-cls-month') === start) cur = i; });
    function show(i) {
      cur = Math.max(0, Math.min(blocks.length - 1, i));
      blocks.forEach(function (b, j) { b.style.display = j === cur ? '' : 'none'; });
      hideTip();
    }
    show(cur);
    root.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-cls-nav]');
      if (nav) { e.preventDefault(); show(cur + Number(nav.getAttribute('data-cls-nav'))); return; }
      var cell = e.target.closest('[data-cls-tip]');
      if (cell && lastPointer === 'touch' && tipFor !== cell) { e.preventDefault(); showTip(cell); }
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-cls-day]'), function (el) {
      var k = el.getAttribute('data-cls-day');
      if (k === today) {
        if (el.hasAttribute('data-cls-ring')) {
          el.style.boxShadow = el.tagName === 'A' ? '0 0 0 2px #fff, 0 0 0 4px #1f2a37' : 'inset 0 0 0 2px #1f5f8b';
          if (el.tagName !== 'A') el.style.color = '#1f5f8b';
        }
        var dn = el.querySelector('[data-cls-dn]');
        if (dn) dn.style.cssText += ';display:inline-block;min-width:22px;border-radius:11px;background:#1f5f8b;color:#fff;text-align:center';
      } else if (dim && k < today && (el.hasAttribute('data-cls-tip') || el.tagName === 'LI')) {
        el.style.opacity = '0.55';
      }
    });
    var data = root.getAttribute('data-cls-sessions');
    var next = root.querySelector('[data-cls-next]');
    if (data && next) {
      var list = JSON.parse(data), nx = null;
      for (var k = 0; k < list.length; k += 1) if (list[k].d >= today) { nx = list[k]; break; }
      next.textContent = '';
      if (!nx) { next.textContent = 'Không còn buổi học sắp tới.'; return; }
      next.appendChild(document.createTextNode('Buổi tới: '));
      var b = document.createElement('strong'); b.textContent = shortDate(nx.d); next.appendChild(b);
      next.appendChild(document.createTextNode(' · '));
      var a = document.createElement('a'); a.href = nx.u; a.textContent = nx.l; a.style.color = '#1f5f8b';
      a.style.textDecoration = root.getAttribute('data-cls-nu') === '1' ? 'none' : 'underline';
      if (nx.n) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      next.appendChild(a);
    }
  });

  /* Tiến độ khóa học */
  Array.prototype.forEach.call(document.querySelectorAll('[data-cls-prog]'), function (root) {
    var c = JSON.parse(root.getAttribute('data-cls-prog')), pct = 0, text = '';
    function dn(k) { return Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 864e5; }
    var week = 0;
    for (var i = 0; i < c.weekStarts.length; i += 1) if (c.weekStarts[i] <= today) week = i + 1;
    if (today > c.end) week = c.weeks;
    if (c.basis === 'session' || c.basis === 'periods') {
      var past = c.done.filter(function (x) { return c.ct ? x.d <= today : x.d < today; });
      var done = past.length, total = Math.max(done, c.total || 1);
      if (c.basis === 'session') {
        pct = Math.round(done / total * 100); text = 'Đã học ' + done + '/' + total + ' buổi';
      } else {
        var dp = past.reduce(function (n, x) { return n + x.p; }, 0);
        pct = c.tp > 0 ? Math.round(dp / c.tp * 100) : 0;
        text = 'Đã học ' + dp + '/' + c.tp + ' tiết · Buổi ' + done + '/' + total;
      }
    } else {
      pct = Math.round(Math.max(0, Math.min(1, (dn(today) - dn(c.start)) / Math.max(1, dn(c.end) - dn(c.start)))) * 100);
      text = today < c.start ? 'Chưa bắt đầu' : today > c.end ? 'Đã kết thúc' : 'Tuần ' + week + '/' + c.weeks;
    }
    var el = root.querySelector('[data-p-pct]'); if (el) el.textContent = pct + '%';
    el = root.querySelector('[data-p-txt]'); if (el) el.textContent = text;
    el = root.querySelector('[data-p-fill]'); if (el) el.style.width = pct + '%';
    Array.prototype.forEach.call(root.querySelectorAll('[data-p-w]'), function (w) {
      var n = +w.getAttribute('data-p-w');
      var isDone = c.basis === 'date' ? n < week : n / c.weeks * 100 <= pct;
      var isCur = c.basis === 'date' && n === week && today <= c.end;
      w.style.backgroundColor = isDone ? c.color : isCur ? c.tint : '#e5eaf0';
    });
  });
})();
</script>`;
