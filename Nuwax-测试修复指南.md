# Nuwax 缃戠珯杩愯惀涓庣ぞ濯?AI Team 闆嗘垚 - 娴嬭瘯涓庝慨澶嶆寚鍗?

## 鑳屾櫙

ProClaw 宸叉牴鎹?PRD v7.0 鍒涘缓浜?9 涓?Agent bundle 鍜岃繍钀ヤ华琛ㄦ澘锛岄渶瑕佸湪 Nuwax 甯傚満涓繘琛岄泦鎴愭祴璇曞拰淇銆?

## 涓€銆侀渶瑕佹墽琛岀殑姝ラ

### 1. 杩愯鏁版嵁搴撹縼绉昏剼鏈?

杩佺Щ鑴氭湰璺緞锛歱ackages/nvwax-server/migrations/025_site_ops_agent_teams.sql

鎵ц鍛戒护锛堜娇鐢?psql 杩炴帴鍒版暟鎹簱鍚庢墽琛岋級锛?
`
psql -U 鐢ㄦ埛鍚?-d 鏁版嵁搴撳悕 -f packages/nvwax-server/migrations/025_site_ops_agent_teams.sql
`

杩佺Щ鑴氭湰浼氭彃鍏?4 涓洟闃熸ā鏉匡細

| ID | 鍚嶇О | 鍒嗙被 |
|---|---|---|
| team-skill-site-ops-001 | 缃戠珯杩愯惀 AI Team | website_operations |
| team-skill-social-us-eu-001 | 娆х編绀惧獟杩愯惀 Team | social_media |
| team-skill-social-sea-001 | 涓滃崡浜氱ぞ濯掕繍钀?Team | social_media |
| team-skill-social-cn-001 | 鍥藉唴绀惧獟杩愯惀 Team | social_media |

楠岃瘉 SQL锛?
`sql
SELECT id, name, category, is_public, version
FROM team_skills
WHERE category IN ('website_operations', 'social_media')
ORDER BY category, created_at DESC;
`

### 2. 鍓嶇 Category 绫诲瀷鎵╁睍

鏂囦欢锛歚app/[locale]/marketplace/Client.tsx Line 14

鍘熶唬鐮侊細
`	ypescript
type Category = 'all' | 'agents' | 'aiteams' | 'virtual-company';
`

淇敼涓猴細
`	ypescript
type Category = 'all' | 'agents' | 'aiteams' | 'virtual-company' | 'website_operations' | 'social_media';
`

categories 鏁扮粍锛垀Line 91锛夋坊鍔犱袱椤癸細
`	ypescript
{ value: 'website_operations', label: t('websiteOperations') },
{ value: 'social_media', label: t('socialMedia') },
`

### 3. 娣诲姞鍥介檯鍖栨秷鎭?

鏂囦欢锛歚messages/zh.json - marketplace 瀵硅薄涓坊鍔狅細
`json
"websiteOperations": "缃戠珯杩愯惀",
"socialMedia": "绀惧獟杩愯惀"
`

鏂囦欢锛歚messages/en.json - marketplace 瀵硅薄涓坊鍔狅細
`json
"websiteOperations": "Website Operations",
"socialMedia": "Social Media"
`

### 4. 娣诲姞鍒嗙被娓叉煋鍧楋紙鍙傝€?virtual-company 妯″紡锛?

鍦?Client.tsx 涓?virtual-company 娓叉煋鍧楋紙~Line 403锛変箣鍚庯紝娣诲姞 website_operations 鍜?social_media 鐨勭綉鏍兼覆鏌擄細

- 鍒嗙被鏍囬 + 璁℃暟
- 缃戞牸鍗＄墖鍒楄〃锛坓rid md:grid-cols-2 lg:grid-cols-3 gap-6锛?
- 姣忓紶鍗＄墖鍚垎绫?Badge銆佸悕绉般€佹弿杩般€佽鑹叉暟

### 5. 鍥㈤槦璇︽儏椤?Badge 鏄犲皠

鏂囦欢锛歚app/[locale]/marketplace/team-skills/[id]/page.tsx锛垀Line 135锛?

`	ypescript
{skill.category === 'virtual-company' && (
  <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">AiTeam</span>
)}
{skill.category === 'website_operations' && (
  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">缃戠珯杩愯惀</span>
)}
{skill.category === 'social_media' && (
  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">绀惧獟杩愯惀</span>
)}
`

## 浜屻€佹祴璇曟竻鍗?

### 鍚庣娴嬭瘯

| # | 娴嬭瘯椤?| 棰勬湡缁撴灉 |
|---|---|---|
| 1 | 杩佺Щ鑴氭湰鎵ц | 4 鏉¤褰曟垚鍔熸彃鍏?team_skills 琛?|
| 2 | GET /api/team-skills/marketplace?category=website_operations | 杩斿洖缃戠珯杩愯惀 AI Team |
| 3 | GET /api/team-skills/marketplace?category=social_media | 杩斿洖 3 鏉＄ぞ濯掕繍钀?Team |
| 4 | GET /api/team-skills/marketplace (鏃?category) | 杩斿洖鎵€鏈夊叕寮€ Team锛堝惈鏂拌褰曪級 |
| 5 | GET /api/team-skills/:id | 璇︽儏杩斿洖瀹屾暣 JSON 鍚?roles/workflow |

### 鍓嶇娴嬭瘯

| # | 娴嬭瘯椤?| 棰勬湡缁撴灉 |
|---|---|---|
| 6 | 甯傚満椤甸潰鍔犺浇 | 鍒嗙被鏍囩鏄剧ず"缃戠珯杩愯惀"鍜?绀惧獟杩愯惀" |
| 7 | 鐐瑰嚮"缃戠珯杩愯惀"鍒嗙被 | 浠呮樉绀虹綉绔欒繍钀?AI Team |
| 8 | 鐐瑰嚮"绀惧獟杩愯惀"鍒嗙被 | 鏄剧ず 3 涓尯鍩熺ぞ濯?Team |
| 9 | 鍒嗙被 Badge | 鍗＄墖鍙充笂瑙掓樉绀烘纭垎绫绘爣绛?|
| 10 | 鍥㈤槦璇︽儏椤?| 鏄剧ず瑙掕壊鍒楄〃銆佸伐浣滄祦 |

### 鏁版嵁楠岃瘉

| # | 娴嬭瘯椤?| 棰勬湡缁撴灉 |
|---|---|---|
| 11 | website_operations roles | 鍚?seo/content/analytics/conversion 4涓鑹?|
| 12 | social_us_eu roles | 鍚?Twitter/Facebook/Instagram/LinkedIn 4涓鑹?|
| 13 | social_sea roles | 鍚?TikTok/Instagram/Facebook 3涓鑹?|
| 14 | social_cn roles | 鍚?寰俊/灏忕孩涔?鐭ヤ箮/寰崥 4涓鑹?|

## 涓夈€佸父瑙侀棶棰樹慨澶?

### 闂 1: 鍒嗙被绛涢€変笉鐢熸晥
妫€鏌?Client.tsx 涓?getMarketplaceTeamSkills 璋冪敤锛岄€変腑 website_operations 鎴?social_media 鏃朵紶閫?category 鍙傛暟銆?

### 闂 2: 杩佺Щ鑴氭湰 JSONB 鎶ラ敊
妫€鏌?SQL 涓殑 JSON 瀛楃涓茶浆涔夋槸鍚︽纭紝鐗瑰埆娉ㄦ剰涓枃寮曞彿鍜屾崲琛屻€?

### 闂 3: 鍥介檯鍖?key 缂哄け
椤甸潰鏄剧ず marketplace.websiteOperations 鍘熷 key -> 纭繚 zh.json 鍜?en.json 閮芥湁瀵瑰簲缈昏瘧銆?

## 鍥涖€侀獙璇?URL

- 甯傚満棣栭〉锛歨ttp://nvwa.proclaw.cc/marketplace
- 缃戠珯杩愯惀 Team锛歨ttp://nvwa.proclaw.cc/marketplace/team-skills/team-skill-site-ops-001
- 娆х編绀惧獟 Team锛歨ttp://nvwa.proclaw.cc/marketplace/team-skills/team-skill-social-us-eu-001
- 涓滃崡浜氱ぞ濯?Team锛歨ttp://nvwa.proclaw.cc/marketplace/team-skills/team-skill-social-sea-001
- 鍥藉唴绀惧獟 Team锛歨ttp://nvwa.proclaw.cc/marketplace/team-skills/team-skill-social-cn-001
