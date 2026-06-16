/* ============================================================
   小六太乙 · 八字引擎 bazi-engine.js
   ------------------------------------------------------------
   把老祖宗的溫柔，做成日日可用的小工具。

   這是一個「純邏輯」模組——所有函式都是 輸入資料 → 輸出資料，
   不碰任何 DOM、不依賴任何 UI。可以被 HTML 工具、Node.js、
   或太乙人道命法工具共用。

   依賴：solar-lunar（瀏覽器全域變數 solarLunar，或 npm 'solarlunar'）
   用於四柱排盤（solar2lunar / getTerm / getYearInGanZhi 等）。

   對外：window.BaziEngine（瀏覽器）或 module.exports（Node）
   ============================================================ */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BaziEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ============================================================
    // 一、基礎常數
    // ============================================================

    const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    // 天干五行 + 陰陽
    const DAY_MASTER_DATA = {
        '甲': { element: '木', yinYang: '陽' },
        '乙': { element: '木', yinYang: '陰' },
        '丙': { element: '火', yinYang: '陽' },
        '丁': { element: '火', yinYang: '陰' },
        '戊': { element: '土', yinYang: '陽' },
        '己': { element: '土', yinYang: '陰' },
        '庚': { element: '金', yinYang: '陽' },
        '辛': { element: '金', yinYang: '陰' },
        '壬': { element: '水', yinYang: '陽' },
        '癸': { element: '水', yinYang: '陰' }
    };

    // 地支五行
    const BRANCH_ELEMENTS = {
        '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
        '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
    };

    // 五行性格意象（給命書開場用）
    const ELEMENT_IMAGERY = {
        '甲': { archetype: '棟樑、大樹', nature: '直挺、有方向、成長性' },
        '乙': { archetype: '藤蔓、花草', nature: '柔韌、靈活、適應性強' },
        '丙': { archetype: '太陽、光', nature: '熱情、明亮、外顯' },
        '丁': { archetype: '燭火、爐火', nature: '細膩、溫暖、內斂' },
        '戊': { archetype: '高山、城牆', nature: '厚重、穩定、可信' },
        '己': { archetype: '田園、土壤', nature: '包容、滋養、踏實' },
        '庚': { archetype: '刀刃、機械', nature: '剛硬、果決、有原則' },
        '辛': { archetype: '珠寶、刻刀', nature: '精緻、敏銳、有風骨' },
        '壬': { archetype: '江河、海洋', nature: '奔放、博大、流動' },
        '癸': { archetype: '雨露、井泉', nature: '滋潤、深思、滲透' }
    };

    // 天干合剋
    const STEM_INTERACTIONS = {
        '甲': { combinesWith: '己', clashesWith: '庚' },
        '乙': { combinesWith: '庚', clashesWith: '辛' },
        '丙': { combinesWith: '辛', clashesWith: '壬' },
        '丁': { combinesWith: '壬', clashesWith: '癸' },
        '戊': { combinesWith: '癸', clashesWith: null },
        '己': { combinesWith: '甲', clashesWith: null },
        '庚': { combinesWith: '乙', clashesWith: '甲' },
        '辛': { combinesWith: '丙', clashesWith: '乙' },
        '壬': { combinesWith: '丁', clashesWith: '丙' },
        '癸': { combinesWith: '戊', clashesWith: '丁' }
    };

    // 地支合衝
    const BRANCH_INTERACTIONS = {
        '子': { combinesWith: '丑', clashesWith: '午' },
        '丑': { combinesWith: '子', clashesWith: '未' },
        '寅': { combinesWith: '亥', clashesWith: '申' },
        '卯': { combinesWith: '戌', clashesWith: '酉' },
        '辰': { combinesWith: '酉', clashesWith: '戌' },
        '巳': { combinesWith: '申', clashesWith: '亥' },
        '午': { combinesWith: '未', clashesWith: '子' },
        '未': { combinesWith: '午', clashesWith: '丑' },
        '申': { combinesWith: '巳', clashesWith: '寅' },
        '酉': { combinesWith: '辰', clashesWith: '卯' },
        '戌': { combinesWith: '卯', clashesWith: '辰' },
        '亥': { combinesWith: '寅', clashesWith: '巳' }
    };

    // 十神對照表（日主天干 × 對方天干）
    const TEN_GODS_MAP = {
        '甲': { '甲': '比肩', '乙': '劫財', '丙': '食神', '丁': '傷官', '戊': '偏財', '己': '正財', '庚': '七殺', '辛': '正官', '壬': '偏印', '癸': '正印' },
        '乙': { '甲': '劫財', '乙': '比肩', '丙': '傷官', '丁': '食神', '戊': '正財', '己': '偏財', '庚': '正官', '辛': '七殺', '壬': '正印', '癸': '偏印' },
        '丙': { '甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫財', '戊': '食神', '己': '傷官', '庚': '偏財', '辛': '正財', '壬': '七殺', '癸': '正官' },
        '丁': { '甲': '正印', '乙': '偏印', '丙': '劫財', '丁': '比肩', '戊': '傷官', '己': '食神', '庚': '正財', '辛': '偏財', '壬': '正官', '癸': '七殺' },
        '戊': { '甲': '七殺', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫財', '庚': '食神', '辛': '傷官', '壬': '偏財', '癸': '正財' },
        '己': { '甲': '正官', '乙': '七殺', '丙': '正印', '丁': '偏印', '戊': '劫財', '己': '比肩', '庚': '傷官', '辛': '食神', '壬': '正財', '癸': '偏財' },
        '庚': { '甲': '偏財', '乙': '正財', '丙': '七殺', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫財', '壬': '食神', '癸': '傷官' },
        '辛': { '甲': '正財', '乙': '偏財', '丙': '正官', '丁': '七殺', '戊': '正印', '己': '偏印', '庚': '劫財', '辛': '比肩', '壬': '傷官', '癸': '食神' },
        '壬': { '甲': '食神', '乙': '傷官', '丙': '偏財', '丁': '正財', '戊': '七殺', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫財' },
        '癸': { '甲': '傷官', '乙': '食神', '丙': '正財', '丁': '偏財', '戊': '正官', '己': '七殺', '庚': '正印', '辛': '偏印', '壬': '劫財', '癸': '比肩' }
    };

    // 十神意象
    const TEN_GODS_EXPLANATIONS = {
        '比肩': '代表合夥以及同性的合作。',
        '劫財': '代表財物消耗、競爭與人脈。',
        '食神': '代表機遇、享受與口福，也象徵創造力和表現力。',
        '傷官': '代表創造、情感與能量付出，也可能帶來口舌是非。',
        '偏財': '代表不在預期內的大筆收入機會或異性緣。',
        '正財': '代表穩定的收入與工作，大環境有利於賺錢。',
        '七殺': '代表非職場的管束壓力與挑戰（女性也代表非典型的異性緣）。',
        '正官': '代表職場的管束與責任（女性也代表穩定的異性緣或婚姻）。',
        '偏印': '代表非傳統、技藝類的學習與喜好。',
        '正印': '代表學習、貴人、文書與庇蔭。'
    };

    // 地支藏干（完整版：主氣 / 中氣 / 餘氣）
    const BRANCH_HIDDEN_STEMS_FULL = {
        '子': ['癸'],
        '丑': ['己', '癸', '辛'],
        '寅': ['甲', '丙', '戊'],
        '卯': ['乙'],
        '辰': ['戊', '乙', '癸'],
        '巳': ['丙', '庚', '戊'],
        '午': ['丁', '己'],
        '未': ['己', '丁', '乙'],
        '申': ['庚', '壬', '戊'],
        '酉': ['辛'],
        '戌': ['戊', '辛', '丁'],
        '亥': ['壬', '甲']
    };

    // 地支藏干（主氣，向後相容）
    const BRANCH_HIDDEN_STEMS = {
        '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
        '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
    };

    // 日柱空亡規則
    const KONG_WANG_RULES = {
        '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'], '己巳': ['戌', '亥'], '庚午': ['戌', '亥'], '辛未': ['戌', '亥'], '壬申': ['戌', '亥'], '癸酉': ['戌', '亥'],
        '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['申', '酉'], '丁丑': ['申', '酉'], '戊寅': ['申', '酉'], '己卯': ['申', '酉'], '庚辰': ['申', '酉'], '辛巳': ['申', '酉'], '壬午': ['申', '酉'], '癸未': ['申', '酉'],
        '甲申': ['午', '未'], '乙酉': ['午', '未'], '丙戌': ['午', '未'], '丁亥': ['午', '未'], '戊子': ['午', '未'], '己丑': ['午', '未'], '庚寅': ['午', '未'], '辛卯': ['午', '未'], '壬辰': ['午', '未'], '癸巳': ['午', '未'],
        '甲午': ['辰', '巳'], '乙未': ['辰', '巳'], '丙申': ['辰', '巳'], '丁酉': ['辰', '巳'], '戊戌': ['辰', '巳'], '己亥': ['辰', '巳'], '庚子': ['辰', '巳'], '辛丑': ['辰', '巳'], '壬寅': ['辰', '巳'], '癸卯': ['辰', '巳'],
        '甲辰': ['寅', '卯'], '乙巳': ['寅', '卯'], '丙午': ['寅', '卯'], '丁未': ['寅', '卯'], '戊申': ['寅', '卯'], '己酉': ['寅', '卯'], '庚戌': ['寅', '卯'], '辛亥': ['寅', '卯'], '壬子': ['寅', '卯'], '癸丑': ['寅', '卯'],
        '甲寅': ['子', '丑'], '乙卯': ['子', '丑'], '丙辰': ['子', '丑'], '丁巳': ['子', '丑'], '戊午': ['子', '丑'], '己未': ['子', '丑'], '庚申': ['子', '丑'], '辛酉': ['子', '丑'], '壬戌': ['子', '丑'], '癸亥': ['子', '丑']
    };

    // 五行相生相剋
    const ELEMENT_GENERATES = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const ELEMENT_OVERCOMES = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

    // 時辰地支對照（24 小時制 → 時支）
    const HOUR_TO_BRANCH = [
        '子', '丑', '丑', '寅', '寅', '卯', '卯', '辰', '辰', '巳', '巳', '午',
        '午', '未', '未', '申', '申', '酉', '酉', '戌', '戌', '亥', '亥', '子'
    ];

    // 五鼠遁（日干 → 子時起的時干）
    const HOUR_STEM_RULES = {
        '甲': '甲', '己': '甲',
        '乙': '丙', '庚': '丙',
        '丙': '戊', '辛': '戊',
        '丁': '庚', '壬': '庚',
        '戊': '壬', '癸': '壬'
    };

    // ============================================================
    // 二、基礎工具函式
    // ============================================================

    function getDayMasterData(dayStem) {
        if (!dayStem || !DAY_MASTER_DATA[dayStem]) return null;
        const data = DAY_MASTER_DATA[dayStem];
        return { stem: dayStem, element: data.element, yinYang: data.yinYang };
    }

    function getElementOf(stemOrBranch) {
        if (DAY_MASTER_DATA[stemOrBranch]) return DAY_MASTER_DATA[stemOrBranch].element;
        if (BRANCH_ELEMENTS[stemOrBranch]) return BRANCH_ELEMENTS[stemOrBranch];
        return null;
    }

    // 取十神：日主天干 對 任一天干
    function getTenGod(dayStem, targetStem) {
        return (TEN_GODS_MAP[dayStem] && TEN_GODS_MAP[dayStem][targetStem]) || '未知';
    }

    // 五行關係：A 對 B 是什麼關係（生我/我生/剋我/我剋/同我）
    function getElementRelation(elementA, elementB) {
        if (elementA === elementB) return '同我';
        if (ELEMENT_GENERATES[elementB] === elementA) return '生我';   // B 生 A
        if (ELEMENT_GENERATES[elementA] === elementB) return '我生';   // A 生 B
        if (ELEMENT_OVERCOMES[elementB] === elementA) return '剋我';   // B 剋 A
        if (ELEMENT_OVERCOMES[elementA] === elementB) return '我剋';   // A 剋 B
        return '無';
    }

    // ============================================================
    // 三、四柱排盤（依賴 solar-lunar）
    // ============================================================

    // 允許外部手動注入 solarLunar 函式庫（最穩健的方式）
    var _injectedSolarLunar = null;
    function setSolarLunar(lib) {
        var resolved = _resolveSolarLunar(lib);
        if (resolved) _injectedSolarLunar = resolved;
    }

    // 把可能包了一層 .default 的函式庫解開，回傳真正有 solar2lunar 的物件
    function _resolveSolarLunar(lib) {
        if (!lib) return null;
        if (typeof lib.solar2lunar === 'function') return lib;
        if (lib.default && typeof lib.default.solar2lunar === 'function') return lib.default;
        return null;
    }

    function _getSolarLunar() {
        // 1. 優先用外部手動注入的
        if (_injectedSolarLunar) return _injectedSolarLunar;
        // 2. 從各種可能的全域物件找 solarLunar（瀏覽器）
        var g = (typeof globalThis !== 'undefined') ? globalThis
              : (typeof window !== 'undefined') ? window
              : (typeof self !== 'undefined') ? self : null;
        if (g) {
            var fromGlobal = _resolveSolarLunar(g.solarLunar) || _resolveSolarLunar(g.solarlunar);
            if (fromGlobal) return fromGlobal;
        }
        // 3. 裸變數參照（某些環境）
        try { var s1 = _resolveSolarLunar(solarLunar); if (s1) return s1; } catch (e) {}
        try { var s2 = _resolveSolarLunar(solarlunar); if (s2) return s2; } catch (e) {}
        // 4. Node：npm 套件（可能在 .default 裡）
        if (typeof require === 'function') {
            try {
                var mod = _resolveSolarLunar(require('solarlunar'));
                if (mod) return mod;
            } catch (e) { /* ignore */ }
        }
        throw new Error('bazi-engine 需要 solarlunar 函式庫。請先呼叫 BaziEngine.setSolarLunar(solarLunar) 或確認 solarlunar.min.js 已載入。');
    }

    /**
     * 從國曆生日 + 時辰，計算完整四柱八字
     * @param {number} year 國曆年
     * @param {number} month 國曆月（1-12）
     * @param {number} day 國曆日
     * @param {number} hour 24 小時制（0-23）
     * @returns {Object} { yearPillar, monthPillar, dayPillar, hourPillar, lunarInfo }
     */
    function calculateFourPillars(year, month, day, hour) {
        const sl = _getSolarLunar();
        const lunar = sl.solar2lunar(year, month, day, hour);

        // 標準化讀取干支：同時支援兩種函式庫
        //   A. method 版（Nakai 的 solar-lunar.js）：lunar.getYearInGanZhi() 等
        //   B. property 版（npm solarlunar）：lunar.gzYear 等
        const yearPillar = _readGanZhi(lunar, 'year');
        const monthPillar = _readGanZhi(lunar, 'month');
        const dayPillar = _readGanZhi(lunar, 'day');

        // 時柱：優先用函式庫的（若有 getTimeInGanZhi），否則用五鼠遁自算
        let hourPillar;
        if (typeof lunar.getTimeInGanZhi === 'function') {
            hourPillar = lunar.getTimeInGanZhi();
        } else {
            hourPillar = calculateHourPillar(dayPillar.charAt(0), hour || 0);
        }

        return {
            yearPillar: yearPillar,
            monthPillar: monthPillar,
            dayPillar: dayPillar,
            hourPillar: hourPillar,
            lunarInfo: {
                lunarYear: lunar.lunarYear || null,
                lunarMonth: lunar.lunarMonth || null,
                lunarDay: lunar.lunarDay || null,
                lunarMonthName: lunar.monthCn || null,
                lunarDayName: lunar.dayCn || null,
                animal: (typeof lunar.getZodiac === 'function') ? lunar.getZodiac() : (lunar.animal || null),
                term: lunar.term || null
            }
        };
    }

    /**
     * 標準化讀取某一柱的干支，兼容 method 版與 property 版函式庫
     * @param {Object} lunar solar2lunar 回傳的物件
     * @param {string} which 'year' | 'month' | 'day'
     */
    function _readGanZhi(lunar, which) {
        // method 版（Nakai 的 solar-lunar.js）
        const methodMap = { year: 'getYearInGanZhi', month: 'getMonthInGanZhi', day: 'getDayInGanZhi' };
        const methodName = methodMap[which];
        if (typeof lunar[methodName] === 'function') {
            return lunar[methodName]();
        }
        // property 版（npm solarlunar）
        const propMap = { year: 'gzYear', month: 'gzMonth', day: 'gzDay' };
        const propName = propMap[which];
        if (lunar[propName]) return lunar[propName];
        throw new Error('無法從 solarlunar 物件讀取' + which + '柱干支（不支援的函式庫格式）');
    }

    /**
     * 時柱計算（五鼠遁）— 當函式庫沒提供 getTimeInGanZhi 時的後備
     * @param {string} dayStem 日干
     * @param {number} hour 24 小時制（0-23）
     */
    function calculateHourPillar(dayStem, hour) {
        const branch = HOUR_TO_BRANCH[hour];
        const branchIndex = EARTHLY_BRANCHES.indexOf(branch);
        const ziStem = HOUR_STEM_RULES[dayStem];
        const ziStemIndex = HEAVENLY_STEMS.indexOf(ziStem);
        const stemIndex = (ziStemIndex + branchIndex) % 10;
        return HEAVENLY_STEMS[stemIndex] + branch;
    }

    /**
     * 流年柱：取該年 3 月 1 日（確保已過立春）
     */
    function getAnnualPillar(targetYear) {
        const sl = _getSolarLunar();
        const lunar = sl.solar2lunar(targetYear, 3, 1);
        return _readGanZhi(lunar, 'year');
    }

    /**
     * 流月柱：依節氣月計算
     * @param {number} year 國曆年
     * @param {number} month 國曆月
     * @param {number} day 國曆日（用來判斷是否過了當月的節氣）
     */
    function getMonthlyPillar(year, month, day) {
        const sl = _getSolarLunar();
        const lunar = sl.solar2lunar(year, month, day || 15);
        return _readGanZhi(lunar, 'month');
    }

    /**
     * 流日柱
     */
    function getDailyPillar(year, month, day) {
        const sl = _getSolarLunar();
        const lunar = sl.solar2lunar(year, month, day);
        return _readGanZhi(lunar, 'day');
    }

    // ============================================================
    // 四、八字分析
    // ============================================================

    /**
     * 取得日主完整資訊
     */
    function getDayMasterInfo(dayPillar) {
        const dayStem = dayPillar.charAt(0);
        const data = getDayMasterData(dayStem);
        if (!data) return null;
        const imagery = ELEMENT_IMAGERY[dayStem] || {};
        return {
            stem: dayStem,
            element: data.element,
            yinYang: data.yinYang,
            label: `${data.yinYang}${data.element}`,
            archetype: imagery.archetype || '',
            nature: imagery.nature || ''
        };
    }

    /**
     * 全盤十神分布：四柱的天干 + 地支藏干，各自對日主的十神
     */
    function analyzeFullTenGods(pillars) {
        const dayStem = pillars.dayPillar.charAt(0);
        const result = {};

        ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'].forEach(key => {
            const pillar = pillars[key];
            const stem = pillar.charAt(0);
            const branch = pillar.charAt(1);

            // 天干十神（日柱天干 = 日主本身，標示為「日主」）
            const stemTenGod = (key === 'dayPillar') ? '日主' : getTenGod(dayStem, stem);

            // 地支藏干十神（完整：主/中/餘氣）
            const hiddenStems = BRANCH_HIDDEN_STEMS_FULL[branch] || [];
            const branchTenGods = hiddenStems.map((hs, idx) => ({
                stem: hs,
                tenGod: getTenGod(dayStem, hs),
                role: idx === 0 ? '主氣' : (idx === 1 ? '中氣' : '餘氣')
            }));

            result[key] = {
                pillar: pillar,
                stem: stem,
                stemElement: getElementOf(stem),
                stemTenGod: stemTenGod,
                branch: branch,
                branchElement: getElementOf(branch),
                branchHiddenStems: branchTenGods
            };
        });

        return result;
    }

    /**
     * 五行強弱統計（簡易版：計算八字裡五行各佔幾分）
     * 注意：這不是「身強身弱」判定，只是五行分布統計。
     * 身強身弱的完整判定（得令/通根/透干）由使用者另行提供邏輯。
     */
    function analyzeElementDistribution(pillars) {
        const counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

        ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'].forEach(key => {
            const pillar = pillars[key];
            const stem = pillar.charAt(0);
            const branch = pillar.charAt(1);

            // 天干算 1 分
            const stemEl = getElementOf(stem);
            if (stemEl) counts[stemEl] += 1;

            // 地支藏干：主氣 1 分、中氣 0.5 分、餘氣 0.3 分
            const hiddenStems = BRANCH_HIDDEN_STEMS_FULL[branch] || [];
            hiddenStems.forEach((hs, idx) => {
                const el = getElementOf(hs);
                const weight = idx === 0 ? 1 : (idx === 1 ? 0.5 : 0.3);
                if (el) counts[el] += weight;
            });
        });

        // 四捨五入到 1 位小數
        Object.keys(counts).forEach(k => { counts[k] = Math.round(counts[k] * 10) / 10; });

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const percentages = {};
        Object.keys(counts).forEach(k => {
            percentages[k] = total > 0 ? Math.round((counts[k] / total) * 1000) / 10 : 0;
        });

        return { counts: counts, percentages: percentages, total: Math.round(total * 10) / 10 };
    }

    /**
     * 空亡計算
     */
    function calculateKongWang(dayPillar) {
        return KONG_WANG_RULES[dayPillar] || [];
    }

    /**
     * 流年 / 流月 / 流日 與日柱的五行互動（合、剋、衝、天剋地衝）
     * @param {string} dayPillar 本命日柱
     * @param {string} targetPillar 流年/流月/流日柱
     */
    function analyzeElementInteraction(dayPillar, targetPillar) {
        if (!dayPillar || !targetPillar) {
            return { stemAnalysis: '缺少分析資料', branchAnalysis: '', isMajorClash: false };
        }

        const dayStem = dayPillar.charAt(0);
        const dayBranch = dayPillar.charAt(1);
        const targetStem = targetPillar.charAt(0);
        const targetBranch = targetPillar.charAt(1);

        const stemRule = STEM_INTERACTIONS[dayStem];
        const branchRule = BRANCH_INTERACTIONS[dayBranch];

        let stemAnalysis = '天干無合剋';
        let branchAnalysis = '地支無合衝';
        let isMajorClash = false;

        if (stemRule.combinesWith === targetStem) {
            stemAnalysis = `天干${dayStem}${targetStem}相合`;
        } else if (stemRule.clashesWith === targetStem) {
            stemAnalysis = `天干${dayStem}${targetStem}相剋`;
        }

        if (branchRule.combinesWith === targetBranch) {
            branchAnalysis = `地支${dayBranch}${targetBranch}相合`;
        } else if (branchRule.clashesWith === targetBranch) {
            branchAnalysis = `地支${dayBranch}${targetBranch}相衝`;
        }

        if (stemRule.clashesWith === targetStem && branchRule.clashesWith === targetBranch) {
            isMajorClash = true;
        }

        return { stemAnalysis, branchAnalysis, isMajorClash };
    }

    /**
     * 流年/流月/流日 對日主的十神關係
     */
    function analyzeTenGodsInteraction(dayPillar, targetPillar) {
        const dayStem = dayPillar.charAt(0);
        const targetStem = targetPillar.charAt(0);
        const targetBranch = targetPillar.charAt(1);

        const stemTenGodName = getTenGod(dayStem, targetStem);
        const stemTenGodExplanation = TEN_GODS_EXPLANATIONS[stemTenGodName] || '';

        const hiddenStem = BRANCH_HIDDEN_STEMS[targetBranch];
        let branchTenGodName = '無藏干';
        let branchTenGodExplanation = '';
        if (hiddenStem) {
            branchTenGodName = getTenGod(dayStem, hiddenStem);
            branchTenGodExplanation = TEN_GODS_EXPLANATIONS[branchTenGodName] || '';
        }

        return {
            stem: { name: stemTenGodName, explanation: stemTenGodExplanation, character: targetStem },
            branch: { name: branchTenGodName, explanation: branchTenGodExplanation, character: targetBranch, hiddenStem: hiddenStem }
        };
    }

    /**
     * 查找未來 N 年的天剋地衝年份
     */
    function findTianKeDiChongYears(dayPillar, startYear, endYear) {
        const clashYears = [];
        for (let y = startYear; y <= endYear; y++) {
            const annualPillar = getAnnualPillar(y);
            const interaction = analyzeElementInteraction(dayPillar, annualPillar);
            if (interaction.isMajorClash) {
                clashYears.push({ year: y, annualPillar: annualPillar });
            }
        }
        return clashYears;
    }

    // ============================================================
    // 五、身強身弱（預留接口，待使用者提供邏輯）
    // ============================================================

    /**
     * 【接口預留】身強身弱判定
     *
     * Nakai 將提供師承的判定邏輯（得令、通根、透干、五行加總的權重）。
     * 屆時把實作填入此函式即可，其他模組呼叫 BaziEngine.analyzeStrength(pillars)
     * 就能取得結果，無需改動別處。
     *
     * 預期回傳格式（暫定，可依實際邏輯調整）：
     * {
     *   level: '身強' | '身弱' | '中和' | '從強' | '從弱',
     *   score: Number,           // 旺衰分數
     *   details: {
     *     deLing: Boolean,       // 是否得令（月令）
     *     tongGen: [...],        // 通根狀況
     *     touGan: [...],         // 透干狀況
     *     supportElements: [],   // 生扶日主的五行
     *     drainElements: []      // 剋洩耗日主的五行
     *   },
     *   summary: String          // 白話總結
     * }
     */
    function analyzeStrength(pillars) {
        // TODO: 待 Nakai 提供師承邏輯後實作
        return {
            level: null,
            score: null,
            details: null,
            summary: '身強身弱判定尚未實作（待提供師承邏輯）',
            _notImplemented: true
        };
    }

    // ============================================================
    // 六、整合：一次產出完整八字盤資料
    // ============================================================

    /**
     * 通用：分析任一「時間柱」（流年/流月/流日）對本命日柱的互動
     * @param {string} dayPillar 本命日柱
     * @param {string} timePillar 流年/流月/流日柱
     * @param {string} layerLabel 層級標籤（'流年'/'流月'/'流日'）
     */
    function analyzeTimePillar(dayPillar, timePillar, layerLabel) {
        return {
            layer: layerLabel || '',
            pillar: timePillar,
            elementInteraction: analyzeElementInteraction(dayPillar, timePillar),
            tenGods: analyzeTenGodsInteraction(dayPillar, timePillar)
        };
    }

    /**
     * 一次取得某個日期的「流年 + 流月 + 流日」三柱及其分析
     * @param {string} dayPillar 本命日柱
     * @param {number} year 國曆年
     * @param {number} month 國曆月
     * @param {number} day 國曆日
     */
    function analyzeDateLayers(dayPillar, year, month, day) {
        const annualPillar = getAnnualPillar(year);
        const monthlyPillar = getMonthlyPillar(year, month, day);
        const dailyPillar = getDailyPillar(year, month, day);
        return {
            date: { year, month, day },
            annual: analyzeTimePillar(dayPillar, annualPillar, '流年'),
            monthly: analyzeTimePillar(dayPillar, monthlyPillar, '流月'),
            daily: analyzeTimePillar(dayPillar, dailyPillar, '流日')
        };
    }

    /**
     * 主入口：從生日資料產出完整八字分析
     * @param {Object} input { name, gender, year, month, day, hour, targetYear?, targetDate? }
     * @returns {Object} 完整八字資料（可直接 JSON 匯出給 Skill 用）
     */
    function computeChart(input) {
        const { name, gender, year, month, day, hour, targetYear, targetDate } = input;

        const pillars = calculateFourPillars(year, month, day, hour);
        const dayMaster = getDayMasterInfo(pillars.dayPillar);
        const fullTenGods = analyzeFullTenGods(pillars);
        const elementDist = analyzeElementDistribution(pillars);
        const kongWang = calculateKongWang(pillars.dayPillar);
        const strength = analyzeStrength(pillars); // 預留

        const result = {
            meta: {
                name: name || '未命名',
                gender: gender || '未指定',
                solarBirth: { year, month, day, hour },
                generatedAt: new Date().toISOString()
            },
            pillars: pillars,
            dayMaster: dayMaster,
            fullTenGods: fullTenGods,
            elementDistribution: elementDist,
            kongWang: kongWang,
            strength: strength
        };

        // 如果指定了流年，加上流年分析
        if (targetYear) {
            result.annual = analyzeTimePillar(pillars.dayPillar, getAnnualPillar(targetYear), '流年');
            result.annual.targetYear = targetYear;
        }

        // 如果指定了完整日期，加上流年+流月+流日三層分析
        if (targetDate && targetDate.year && targetDate.month && targetDate.day) {
            result.dateLayers = analyzeDateLayers(
                pillars.dayPillar, targetDate.year, targetDate.month, targetDate.day
            );
        }

        return result;
    }

    // ============================================================
    // 對外暴露
    // ============================================================

    return {
        // solarLunar 注入接口
        setSolarLunar: setSolarLunar,
        // 常數（唯讀參考）
        constants: {
            HEAVENLY_STEMS, EARTHLY_BRANCHES, DAY_MASTER_DATA, BRANCH_ELEMENTS,
            ELEMENT_IMAGERY, STEM_INTERACTIONS, BRANCH_INTERACTIONS, TEN_GODS_MAP,
            TEN_GODS_EXPLANATIONS, BRANCH_HIDDEN_STEMS, BRANCH_HIDDEN_STEMS_FULL,
            KONG_WANG_RULES, ELEMENT_GENERATES, ELEMENT_OVERCOMES
        },
        // 基礎工具
        getDayMasterData, getElementOf, getTenGod, getElementRelation,
        // 排盤
        calculateFourPillars, calculateHourPillar, getAnnualPillar,
        getMonthlyPillar, getDailyPillar,
        // 分析
        getDayMasterInfo, analyzeFullTenGods, analyzeElementDistribution,
        calculateKongWang, analyzeElementInteraction, analyzeTenGodsInteraction,
        findTianKeDiChongYears, analyzeTimePillar, analyzeDateLayers,
        // 身強身弱（預留）
        analyzeStrength,
        // 整合主入口
        computeChart
    };
}));
