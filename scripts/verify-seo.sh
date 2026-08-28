#!/bin/bash
# ============================================================
# NvwaX SEO/GEO 部署验证脚本（Sprint SEO-1）
#
# 用法（在服务器 /opt/nvwax 下，或任意能访问前端的机器）：
#   bash scripts/verify-seo.sh                      # 默认 http://localhost:3000
#   bash scripts/verify-seo.sh https://nvwax.proclaw.cc   # 验证公网（经 nginx）
#
# 若执行报错（Windows 行尾问题）先执行：
#   sed -i 's/\r$//' scripts/verify-seo.sh
# ============================================================
set -u

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if eval "$*" >/dev/null 2>&1; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=============================================="
echo " NvwaX SEO/GEO 验证  BASE=$BASE"
echo "=============================================="

# ── 0. 服务器代码版本 ───────────────────────────────
if [ -d /opt/nvwax/.git ]; then
  HEAD=$(git -C /opt/nvwax rev-parse --short HEAD 2>/dev/null)
  check "服务器代码 HEAD=$HEAD（期望 52fe06b）" "[ \"$HEAD\" = \"52fe06b\" ]"
fi

# ── 1. robots.txt ──────────────────────────────────
ROBOTS=$(curl -s --max-time 10 "$BASE/robots.txt")
check "robots.txt 可访问" "[ -n \"$ROBOTS\" ]"
check "robots.txt 含 GPTBot（OpenAI 放行）" "echo \"$ROBOTS\" | grep -q 'User-Agent: GPTBot'"
check "robots.txt 含 ClaudeBot / PerplexityBot" "echo \"$ROBOTS\" | grep -q 'ClaudeBot' && echo \"$ROBOTS\" | grep -q 'PerplexityBot'"
check "robots.txt 屏蔽 /admin/（私有）" "echo \"$ROBOTS\" | grep -q 'Disallow: /admin/'"
check "robots.txt 屏蔽 /dashboard" "echo \"$ROBOTS\" | grep -q 'Disallow: /dashboard'"
check "robots.txt 指向 sitemap.xml" "echo \"$ROBOTS\" | grep -q 'Sitemap: https://nvwax.proclaw.cc/sitemap.xml'"

# ── 2. sitemap.xml ─────────────────────────────────
SITEMAP=$(curl -s --max-time 15 "$BASE/sitemap.xml")
check "sitemap.xml 可访问" "[ -n \"$SITEMAP\" ]"
check "sitemap 含英文版 /en 条目（hreflang）" "echo \"$SITEMAP\" | grep -q '<loc>https://nvwax.proclaw.cc/en'"
check "sitemap 含真实详情页 /marketplace/team-skills/" "echo \"$SITEMAP\" | grep -q 'marketplace/team-skills/'"
check "sitemap 不含死链旧路由 /marketplace/agents/" "! echo \"$SITEMAP\" | grep -q '/marketplace/agents/'"
N_URL=$(echo "$SITEMAP" | grep -c '<loc>')
check "sitemap URL 数量=$N_URL（期望 >20）" "[ \"$N_URL\" -gt 20 ]"

# ── 3. llms.txt（GEO 核心资产）──────────────────────
LLMS=$(curl -s --max-time 10 "$BASE/llms.txt")
check "llms.txt 可访问" "[ -n \"$LLMS\" ]"
check "llms.txt 为站点索引（含 # NvwaX）" "echo \"$LLMS\" | grep -q '# NvwaX'"
check "llms-en.txt 可访问" "[ -n \"$(curl -s --max-time 10 "$BASE/llms-en.txt")\" ]"
CT=$(curl -sI --max-time 10 "$BASE/llms.txt" | tr -d '\r' | grep -i '^Content-Type' | head -1)
check "llms.txt Content-Type=$CT（期望 text/markdown）" "echo \"$CT\" | grep -qi 'text/markdown'"

# ── 4. 公开目录/内容页可访问性（登录墙移除）─────────
for p in marketplace faq team-skills nvwa search developer bounties; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE/$p")
  case "$code" in
    200|301|302|307) check "/$p 未登录访问=$code（可抓取）" "true" ;;
    *) check "/$p 未登录访问=$code（期望 200/3xx，不应 302->/login 循环）" "false" ;;
  esac
done

# ── 5. 页面 head 元数据 ────────────────────────────
HOME_HTML=$(curl -sL --max-time 15 "$BASE/")
check "首页含 Organization JSON-LD" "echo \"$HOME_HTML\" | grep -q 'Organization'"
check "首页含 SoftwareApplication JSON-LD" "echo \"$HOME_HTML\" | grep -q 'SoftwareApplication'"
check "首页 canonical 指向 https://nvwax.proclaw.cc/" "echo \"$HOME_HTML\" | grep -q 'rel=\"canonical\"' && echo \"$HOME_HTML\" | grep -q 'nvwax.proclaw.cc'"
check "首页含 hreflang en 交替链接" "echo \"$HOME_HTML\" | grep -q 'hrefLang=\"en\"'"

FAQ_HTML=$(curl -sL --max-time 15 "$BASE/faq")
check "FAQ 页含 FAQPage JSON-LD（GEO 问答引用）" "echo \"$FAQ_HTML\" | grep -q 'FAQPage'"

# ── 6. 私有页 noindex 响应头 ───────────────────────
for p in admin dashboard profile projects; do
  hdr=$(curl -sI --max-time 10 "$BASE/$p" | tr -d '\r')
  check "/$p 响应含 X-Robots-Tag: noindex" "echo \"$hdr\" | grep -qi 'X-Robots-Tag: noindex'"
done

echo "----------------------------------------------"
echo " 结果: PASS=$PASS  FAIL=$FAIL"
if [ "$FAIL" = "0" ]; then
  echo " 🎉 SEO/GEO 部署验证全部通过"
else
  echo " ⚠️ 有 $FAIL 项未通过，请结合上方 ❌ 项排查"
fi
echo "=============================================="
