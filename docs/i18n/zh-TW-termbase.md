# zh-TW (Traditional Chinese, Taiwan) termbase and style guide

This is the terminology and style standard for everything under `src/zh-tw/` and in
`src/_data/i18n/zh-tw.json`.

- **Translate from EN.** Use the zh (Simplified) page only as a cross-reference for meaning and markup.
- **One term per concept.** Where zh mixes terms, zh-TW uses the single term below.
- **CI enforces Parts A and B.** `scripts/zhtw-lexicon.json` holds the "must not appear" forms, and `scripts/verify-zhtw.mjs` checks them.
- **The published zh-TW wording wins over later drafts.** To change a term, update this file first, in the same PR.

## Part A — Core terms

| # | EN concept | zh today [count] | Options considered | **zh-TW (ratified)** | Note |
|---|---|---|---|---|---|
| A1 | Organizing Committee (the named body: headings, footer ©, "decided by the …") | 组织委员会 [5], 组委会 [3] | 組織委員會 · 籌備委員會 · 大會 | **組織委員會** | 籌備委員會 implies the event hasn't happened yet, which is wrong for the 2026 committee |
| A2 | "the organizers" / "we" as actor (running evaluations, contacting teams) | 组织方 [10], 主办方 [3] | 主辦單位 · 主辦方 · 大會 | **主辦單位** | The natural Taiwanese register for competition notices |
| A3 | simulation / simulator | 仿真 [74], 仿真器 [11] | 模擬 / 模擬器 · 仿真 | **模擬 / 模擬器** | 仿真 reads as mainland. This is the highest-count change in the corpus |
| A4 | real robot (noun) | 真实机器人 [29] | 實體機器人 · 真實機器人 | **實體機器人** | |
| A5 | real-robot (modifier: validation, evaluation, demo) | 实机 [38] | 實機 · 實體機器人 | **實機** (實機驗證, 實機評估, 實機展示) | 實機 is native Taiwanese usage too, so keep it as the compact modifier |
| A6 | (organizer) bench testing / hands-on bench testing | 台架测试 [11], 实操台架测试 [6] | 平台實測 / 現場實作測試 · 實機測試 / 實作測試 · 台架測試 | **平台實測 / 現場實作測試** | 台架 is mainland engineering jargon. 實機測試 would collide with A5 |
| A7 | evaluation (official scoring of policies) | 评测 [39], 评估 [23] | 評估 · 評測 | **評估**; but the Hamburg "evaluation centre" → **評測中心** (fixed name) | zh uses both interchangeably. Taiwanese usage prefers 評估 for scoring |
| A8 | testbed | 测试平台 [30], 测试台 [18] | 測試平台 · 測試場域 | **測試平台** | 測試場域 is very Taiwanese but implies a wider site than a robot cell |
| A9 | workshop (the Phase III academic event) | 研讨会 [73] | 研討會 · 工作坊 | **研討會** | 工作坊 suggests hands-on training. This event is talks, a panel and posters |
| A10 | talk / invited talk / speaker | 讲座 [35], 特邀报告 [23], 讲者 [9], 嘉宾 [2] | 演講 / 邀請演講 / 講者 · 講座 / 特邀報告 | **演講 / 邀請演講 / 講者** | 報告 for a talk reads mainland |
| A11 | panel | 圆桌讨论 [24] | 座談 · 圓桌論壇 · 圓桌討論 | **座談** (titles: 專家座談) | |
| A12 | compute (resources) | 算力 [17], 计算资源 [2] | 運算資源 · 算力 | **運算資源** | 算力 is spreading in Taiwanese tech media but is not yet the formal register |
| A13 | team (competition entrant) vs team (in general, e.g., "the EBiM team") | 团队 [59], 队伍 [23], mixed | 隊伍 / 團隊 | **Entrant = 隊伍; general = 團隊** | |
| A14 | submit / submission (to the competition) | 提交 [70] | 繳交 · 提交 | **繳交** (作品繳交, 繳交截止) | |
| A15 | form submit button | 提交 | 送出 · 提交 | **送出** | The standard button label on Taiwanese web forms |
| A16 | You (addressing the reader) | 您 [52], 你 [18], mixed by page | 您 throughout · 你 throughout | **您 throughout** | zh mixes these by page (contact and faq use 你). zh-TW should be uniform |
| A17 | Task 1 / 2 / 3 names | 线缆布线与插接 · 可变形物体操作 · 辅助生活与喂食 | see Rec | **纜線佈線與插接 · 可變形物體操作 · 輔助生活與餵食** | These are task identities and must be identical on every page |
| A18 | purchase voucher (prize) | 购买代金券 [10] | 購物抵用券 · 採購抵用券 · 購買代金券 | **採購抵用券** | 代金券 reads mainland; 採購 fits equipment purchases |
| A19 | Phase I / II / III | 第一阶段 [9], 第二阶段 [20], plus "Phase I" left in Latin [20] | 第一階段 … · Phase I left in Latin | **第一／二／三階段** in prose; keep Latin only where zh does in labels | |

## Part B — Standard renderings

| zh (must not appear in zh-TW) | zh-TW |
|---|---|
| 首页 · 联系我们 · 联系表单 · 咨询 | 首頁 · 聯絡我們 · 聯絡表單 · 洽詢 |
| 菜单 · 导航 · 页脚 · 切换 · 概述 (nav) | 選單 · 導覽 · 頁尾 · 切換 · 總覽 |
| 日程 (event) | 議程 |
| 代码 · 获取代码 | 程式碼 · 取得程式碼 |
| 数据集 · 数据 (meaning data) | 資料集 · 資料 (數據 only for figures/statistics) |
| 信息 | 資訊 (information) / 訊息 (a message) |
| 硬件 · 网络 · 链接 · 用户 | 硬體 · 網路 · 連結 · 使用者 |
| 邮件 · 邮箱 | 電子郵件 (Email in UI labels) · 電子郵件信箱 |
| 合作伙伴 · 社区 · 渠道 | 合作夥伴 · 社群 · 管道 |
| 发布 (dataset/code) · 上传 | 釋出 · 上傳 |
| 复现 · 推理 · 遥操作 · 搭建 | 重現 · 推論 · 遙控操作 · 建置 |
| 智能 (incl. 具身智能, 人工智能) | 智慧 (具身智慧, 人工智慧) — **except inside proper names** |
| 班车 | 接駁車 |
| 茶歇 | 茶敘 |
| 线下 (event) | 實體 |
| 演示 | 展示 / 示範 |
| 托管 (testbed hosting) | 承辦 / 設置 (context) |
| 征集 (call for participation) | 招募 |
| 席位 (event seats) | 名額 |
| 运营 · 负责人 | 營運 · 負責人 (char conversion only) |
| 站点 (testbed site) | 站點 · 據點 → **據點** |
| 落地 (VLA … 真实落地) | 實際應用 / 實際部署 |
| 打造 · 生态 · 头部 · 聚焦 | rephrase naturally; avoid as set phrases |
| 周一…周日 | 週一…週日 |
| 奖杯 · 礼品 · 奖金 · 奖项 · 排名 · 晋级 | 獎盃 · 禮品 · 獎金 · 獎項 · 排名 · 晉級 |
| 海报 · 签到 · 现场 · 参观 · 邀请函 | 海報 · 報到 · 現場 · 參觀 · 邀請函 |
| 地铁 (Hamburg/Munich) | 地鐵 (foreign systems; 捷運 is Taiwan-only) |

## Part C — Style rules

1. **Quotation marks:** 「」, nested 『』. Never “ ” or ‘ ’.
2. **Punctuation:** full-width ，。；：！？（）、. Dash ——. Ellipsis ⋯⋯ (not ……).
3. **Spacing:** one half-width space between CJK and Latin letters or digits, exactly as zh does today (463 spaced vs 3 unspaced). This keeps the fact-token gate simple.
4. **Dates:** `2026 年 11 月 15 日（週日）`. Time ranges: `10:00–18:00（CEST）`. Keep "AoE" in Latin as zh does, with no gloss.
5. **Money:** `$5,250` and `USD 300` as in EN/zh; write 美元 only in running prose.
6. **Numbers:** Arabic numerals for counts, scores and seats, as in zh.
7. **Register:** written official Taiwanese, warm but not chatty. Address the reader as 您. Use 本 for self-reference (本競賽, 本頁).

## Part D — Proper nouns

- **Chinese-language names** of people and organizations are converted character by character with no vocabulary substitution (智谱AI → 智譜AI, 银河通用 → 銀河通用). Nothing stays in Simplified.
- **Latin names** stay as they are (EBiM Benchmark, Mobile FR3 Duo, Agile Robots SE, Franka Robotics).
- **Place names** take the standard Taiwanese form: 漢堡, 慕尼黑, 奧格斯堡, 上海. Postal addresses are converted character by character.
- **The brand and the site title** stay in Latin, as on the zh site.
