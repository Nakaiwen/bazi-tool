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
    /**
     * 節氣資料防護（M2）：solar-lunar 的精確節氣表僅涵蓋 1930–2050。
     * 超出範圍時 getTerm 回 0，年/月柱會「默默排錯」（如 1920 年柱差一年、月柱空白；
     * 2060 月柱恆為子月）。此處以資料探測（非寫死範圍）擋下，拋明確錯誤。
     */
    function _assertTermData(sl, year, what) {
        if (typeof sl.getTerm === 'function' && !sl.getTerm(year, 3)) {
            throw new Error('西元 ' + year + ' 年超出節氣資料範圍（1930–2050），無法準確排' + (what || '盤') + '。');
        }
    }

    function calculateFourPillars(year, month, day, hour) {
        const sl = _getSolarLunar();
        _assertTermData(sl, year, '盤');
        const lunar = sl.solar2lunar(year, month, day, hour);

        // 標準化讀取干支：同時支援兩種函式庫
        //   A. method 版（Nakai 的 solar-lunar.js）：lunar.getYearInGanZhi() 等
        //   B. property 版（npm solarlunar）：lunar.gzYear 等
        const yearPillar = _readGanZhi(lunar, 'year');
        const monthPillar = _readGanZhi(lunar, 'month');
        const dayPillar = _readGanZhi(lunar, 'day');

        // 跨年邊界（如 1930 年 1 月小寒前需 1929 年節氣）資料不足時，月柱會是空字串
        if (!monthPillar) {
            throw new Error('該日期落在節氣資料邊界（需要前一年的節氣資料），無法排月柱。');
        }

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
        _assertTermData(sl, targetYear, '流年');
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
        _assertTermData(sl, year, '流月');
        const lunar = sl.solar2lunar(year, month, day || 15);
        const gz = _readGanZhi(lunar, 'month');
        if (!gz) throw new Error('該日期落在節氣資料邊界，無法排流月。');
        return gz;
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
    // 五、身強身弱（八分法）＋ 喜用神選用　★小六太乙師承版
    // ============================================================
    //
    // 八分法：八個字各 1 分、月令（月支）2 分，滿盤 9 分（奇數不打平）。
    //   我方（生扶）＝ 日主本身 ＋ 比劫(同我) ＋ 印(生我)
    //   敵方（剋洩耗）＝ 官殺(剋我) ＋ 食傷(我生) ＋ 財(我剋)
    //   敵我比數量：我方 > 敵方 → 身強；我方 < 敵方 → 身弱。
    //   地支一律以「本氣五行」計分（中氣餘氣不另拆）。
    //
    // 喜用神四層優先：① 調候 → ② 病藥 → ③ 強弱扶抑 → ④ 通關；從格另走順勢。
    //
    // ★ 標 TODO_NAKAI 者＝待你最後拍板的師承旋鈕，已先給暫定值，集中在頂端。

    const STRENGTH_CONFIG = {
        monthBranchWeight: 2,          // 月令權重（其餘各字 1）
        congWeakMaxSelf: 1             // 從弱：我方點數須 ≤ 此值（孤立日主）
    };
    const TIAOHOU_CONFIG = {
        winter: ['亥', '子', '丑'],
        summer: ['巳', '午', '未'],
        winterNeeds: ['火', '木'],     // 暖局：火為主、木為輔
        summerNeeds: ['水', '金']      // 潤局：水為主、金為輔　TODO_NAKAI：主輔順序可調
    };
    const TONGGUAN_CONFIG = {
        minBothCounts: 2.5             // TODO_NAKAI：兩行皆 ≥ 此量且相剋才啟用通關
    };

    // —— 小工具 ——
    function _uniq(a) { return a.filter((x, i) => x && a.indexOf(x) === i); }
    function _generatorOf(el) { return Object.keys(ELEMENT_GENERATES).find(k => ELEMENT_GENERATES[k] === el) || null; } // 生 el 之行（印）
    function _overcomerOf(el) { return Object.keys(ELEMENT_OVERCOMES).find(k => ELEMENT_OVERCOMES[k] === el) || null; } // 剋 el 之行
    const _ALL_EL = ['木', '火', '土', '金', '水'];

    // 收集全盤「有效五行」：天干＋地支藏干；地支被沖或被合者，其藏干一律作廢。（供調候閘二用）
    function _collectValidElements(pillars) {
        const stems = [pillars.yearPillar.charAt(0), pillars.monthPillar.charAt(0), pillars.dayPillar.charAt(0), pillars.hourPillar.charAt(0)];
        const branches = [pillars.yearPillar.charAt(1), pillars.monthPillar.charAt(1), pillars.dayPillar.charAt(1), pillars.hourPillar.charAt(1)];
        const set = new Set();
        stems.forEach(st => { const e = getElementOf(st); if (e) set.add(e); });
        branches.forEach((b, idx) => {
            const rule = BRANCH_INTERACTIONS[b] || {};
            const clashed = branches.some((bb, j) => j !== idx && bb === rule.clashesWith);
            const combined = branches.some((bb, j) => j !== idx && bb === rule.combinesWith);
            if (clashed || combined) return; // 沖或合 → 該支藏干作廢
            (BRANCH_HIDDEN_STEMS_FULL[b] || []).forEach(hs => { const e = getElementOf(hs); if (e) set.add(e); });
        });
        return set;
    }

    // 從格偵測。從弱：日主弱到只剩孤立一字——天干無比劫印、地支無「有效根」、我方點數 ≤ 門檻。
    //   有效根＝某地支藏干含 比劫/印；該地支若「被剋或被合」→ 視為無根。（TODO_NAKAI：被剋的取法）
    function _detectCongGe(pillars, dayEl, selfScore, foeScore) {
        const branches = [pillars.yearPillar.charAt(1), pillars.monthPillar.charAt(1), pillars.dayPillar.charAt(1), pillars.hourPillar.charAt(1)];
        const otherStems = [pillars.yearPillar.charAt(0), pillars.monthPillar.charAt(0), pillars.hourPillar.charAt(0)];
        const branchEls = branches.map(getElementOf);

        function rooted(idx) {
            const b = branches[idx], rule = BRANCH_INTERACTIONS[b] || {};
            const combined = branches.some((bb, j) => j !== idx && bb === rule.combinesWith);            // 被合
            const myEl = getElementOf(b);
            const overcome = branchEls.some((el, j) => j !== idx && el && ELEMENT_OVERCOMES[el] === myEl); // 被剋（地支相剋）
            if (combined || overcome) return false;                                                       // 被剋/被合 → 無根
            return (BRANCH_HIDDEN_STEMS_FULL[b] || []).some(hs => {
                const r = getElementRelation(dayEl, getElementOf(hs));
                return r === '同我' || r === '生我'; // 藏比劫/印 → 有根
            });
        }
        const stemSupport = otherStems.some(st => { const r = getElementRelation(dayEl, getElementOf(st)); return r === '同我' || r === '生我'; });
        const hasRoot = branches.some((b, idx) => rooted(idx));

        if (!stemSupport && !hasRoot && selfScore <= STRENGTH_CONFIG.congWeakMaxSelf) {
            return { type: '從弱', summary: '日主孤弱無根（天干無比劫印、地支無有效根）→ 棄命從弱，順敵方之勢為用。' };
        }
        if (foeScore === 0) { // 從強鏡像　TODO_NAKAI：從強門檻待確認
            return { type: '從強', summary: '滿盤生扶、敵方全無 → 從強，順我方之勢為用。（從強規則待確認）' };
        }
        return { type: null, summary: '非從格（正格）。' };
    }

    // —— 旺衰：八分法 ——
    function analyzeStrength(pillars) {
        const dayStem = pillars.dayPillar.charAt(0);
        const dayEl = getElementOf(dayStem);
        const slots = [
            { gz: pillars.yearPillar.charAt(0), w: 1 },
            { gz: pillars.yearPillar.charAt(1), w: 1 },
            { gz: pillars.monthPillar.charAt(0), w: 1 },
            { gz: pillars.monthPillar.charAt(1), w: STRENGTH_CONFIG.monthBranchWeight }, // 月令 ×2
            { gz: dayStem, w: 1, isDayMaster: true },
            { gz: pillars.dayPillar.charAt(1), w: 1 },
            { gz: pillars.hourPillar.charAt(0), w: 1 },
            { gz: pillars.hourPillar.charAt(1), w: 1 }
        ];
        let selfScore = 0, foeScore = 0;
        const byElement = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
        const breakdown = [];
        slots.forEach(s => {
            const el = getElementOf(s.gz);
            if (!el) return;
            byElement[el] += s.w;
            const rel = s.isDayMaster ? '同我' : getElementRelation(dayEl, el);
            const isSelf = (rel === '同我' || rel === '生我');
            if (isSelf) selfScore += s.w; else foeScore += s.w;
            breakdown.push({ char: s.gz, element: el, weight: s.w, relation: rel, side: isSelf ? '我' : '敵' });
        });

        const cong = _detectCongGe(pillars, dayEl, selfScore, foeScore);
        let level, summary;
        if (cong.type) {
            level = cong.type; summary = cong.summary;
        } else {
            level = (selfScore > foeScore) ? '身強' : '身弱';
            const gap = Math.abs(selfScore - foeScore);
            summary = '我方(生扶) ' + selfScore + ' vs 敵方(剋洩耗) ' + foeScore + ' → ' + level + (gap === 1 ? '（僅差 1 分，近均勢）' : '');
        }
        return {
            level: level,
            score: { self: selfScore, foe: foeScore, total: selfScore + foeScore },
            details: { dayElement: dayEl, byElement: byElement, breakdown: breakdown, congGe: cong },
            summary: summary
        };
    }

    // 通關偵測：最旺兩行若相剋且皆夠量，取居中相生之行為通關（木剋土→火；金剋木→水…）。
    function _detectTongGuan(dist, dayEl) {
        const ranked = _ALL_EL.slice().sort((a, b) => dist.counts[b] - dist.counts[a]);
        const a = ranked[0], b = ranked[1];
        if (dist.counts[a] < TONGGUAN_CONFIG.minBothCounts || dist.counts[b] < TONGGUAN_CONFIG.minBothCounts) return null;
        let attacker = null, target = null;
        if (ELEMENT_OVERCOMES[a] === b) { attacker = a; target = b; }
        else if (ELEMENT_OVERCOMES[b] === a) { attacker = b; target = a; }
        else return null;
        if (attacker === dayEl || target === dayEl) return null; // 任一行為日主 → 屬扶抑範疇，非通關
        const bridge = ELEMENT_GENERATES[attacker]; // 攻方所生、且生被剋方者
        if (ELEMENT_GENERATES[bridge] === target) {
            return { element: bridge, note: attacker + '、' + target + ' 兩旺相戰，取通關之「' + bridge + '」化轉。' };
        }
        return null;
    }

    // —— 喜用神選用 ——
    function selectYongShen(pillars, strength, dayMaster) {
        const dayStem = pillars.dayPillar.charAt(0);
        const dayEl = (strength.details && strength.details.dayElement) || getElementOf(dayStem);
        const dist = analyzeElementDistribution(pillars); // 含藏干權重 → 找「最旺一行」

        function pack(method, fav, unfav, note) {
            const favorable = _uniq(fav);
            const unfavorable = _uniq(unfav).filter(e => favorable.indexOf(e) === -1);
            const neutral = _ALL_EL.filter(e => favorable.indexOf(e) === -1 && unfavorable.indexOf(e) === -1);
            return {
                method: method, favorable: favorable, unfavorable: unfavorable, neutral: neutral,
                tags: favorable.map(e => 'yong:' + e).concat(unfavorable.map(e => 'ji:' + e)),
                summary: note
            };
        }

        // ── 第 0 層：從格順勢 ──
        if (strength.level === '從弱') {
            const foe = _ALL_EL.filter(e => { const r = getElementRelation(dayEl, e); return r === '我生' || r === '剋我' || r === '我剋'; });
            const dominant = foe.sort((x, y) => dist.counts[y] - dist.counts[x])[0];
            return pack('從弱順勢', _uniq([dominant, ELEMENT_GENERATES[dominant]]), _uniq([dayEl, _generatorOf(dayEl)]),
                '棄命從弱：順最旺的「' + dominant + '」之勢，忌印比（' + _uniq([dayEl, _generatorOf(dayEl)]).join('、') + '）回頭生身。');
        }
        if (strength.level === '從強') {
            return pack('從強順勢', _uniq([dayEl, _generatorOf(dayEl)]), _ALL_EL.filter(e => getElementRelation(dayEl, e) === '剋我'),
                '從強順勢，忌官殺逆激。（從強規則待確認）');
        }

        // ── 第 1 層：調候閘門（閘一：冬夏月　閘二：藏干計入、沖合作廢後仍缺）──
        const mb = pillars.monthPillar.charAt(1);
        const isWinter = TIAOHOU_CONFIG.winter.indexOf(mb) !== -1;
        const isSummer = TIAOHOU_CONFIG.summer.indexOf(mb) !== -1;
        if (isWinter || isSummer) {
            const valid = _collectValidElements(pillars);
            const need = isWinter ? TIAOHOU_CONFIG.winterNeeds : TIAOHOU_CONFIG.summerNeeds;
            if (need.every(e => !valid.has(e))) {
                return pack('調候拍板', need.slice(), isWinter ? ['水'] : ['火'],
                    (isWinter ? '冬月天寒地凍、全盤無木火' : '夏月火炎土燥、全盤無金水') + '，調候奪權，以「' + need.join('、') + '」為用。');
            }
        }

        // ── 第 2 層病藥 ＋ 第 3 層扶抑（併參）──
        const bing = _ALL_EL.slice().sort((a, b) => dist.counts[b] - dist.counts[a])[0]; // 最旺一行＝病
        const yaoKe = _overcomerOf(bing);          // 剋病之藥
        const yaoXie = ELEMENT_GENERATES[bing];     // 洩病之藥
        let method, fav, unfav, note;
        if (strength.level === '身強') {
            fav = _uniq([yaoKe, yaoXie]);            // 身強：剋洩耗即藥　TODO_NAKAI：剋/洩主次
            unfav = _uniq([dayEl, _generatorOf(dayEl)]);
            method = '病藥＋身強抑';
            note = '最旺一行「' + bing + '」為病，取剋洩之「' + fav.join('、') + '」為藥；日主身強，喜剋洩耗、忌再生扶。';
        } else {
            fav = _uniq([dayEl, _generatorOf(dayEl)]); // 身弱：印比扶身
            unfav = _ALL_EL.filter(e => { const r = getElementRelation(dayEl, e); return r === '剋我' || r === '我生' || r === '我剋'; });
            method = '身弱扶';
            note = '日主身弱，喜印比生扶（' + fav.join('、') + '）；最旺一行「' + bing + '」反為忌。';
        }

        // ── 第 4 層通關 ──
        const guan = _detectTongGuan(dist, dayEl);
        if (guan && fav.indexOf(guan.element) === -1 && unfav.indexOf(guan.element) === -1) {
            fav = _uniq(fav.concat([guan.element])); note += ' 另：' + guan.note; method += '＋通關';
        }

        return pack(method, fav, unfav, note);
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

    // ============================================================
    // 六-bis、動態層深度整合（INTEGRATION 第 3 節）
    //   資料流：原局 → 旺衰 → 喜用神 → 各流年/大運/流月+原局四支
    //           → BaziRelations.detectGroupRelations + BaziClashTable.lookupClash
    //           → 逐項判喜忌（命理線）→ BaziWuxingHealth.yangshengAdvice（養生線）
    //
    //   ★ 接線而非重寫：合會刑沖破害的「描述」「養生」全來自 5 個資料表，引擎只做
    //     「偵測 → 對照喜用神判吉凶 → 串接」。沖喜神為凶/沖忌神為吉等判讀為通則，
    //     涉及流派處標 TODO_NAKAI。
    // ============================================================

    // 五個資料表的取得：優先用注入，其次全域，其次 Node require；缺席則回 null（降級不報錯）
    var _injectedTables = {};
    function setTables(t) {
        if (!t) return;
        ['relations', 'clash', 'palace', 'health'].forEach(k => { if (t[k]) _injectedTables[k] = t[k]; });
    }
    function _globalScope() {
        return (typeof globalThis !== 'undefined') ? globalThis
            : (typeof window !== 'undefined') ? window
            : (typeof self !== 'undefined') ? self : null;
    }
    function _table(key, globalName, nodeFile) {
        if (_injectedTables[key]) return _injectedTables[key];
        const g = _globalScope();
        if (g && g[globalName]) { _injectedTables[key] = g[globalName]; return g[globalName]; }
        if (typeof require === 'function' && nodeFile) {
            try { const m = require(nodeFile); if (m) { _injectedTables[key] = m; return m; } } catch (e) { /* 缺席降級 */ }
        }
        return null;
    }
    const _relTable = () => _table('relations', 'BaziRelations', './bazi-relations-table.js');
    const _clashTable = () => _table('clash', 'BaziClashTable', './bazi-clash-table.js');
    const _healthTable = () => _table('health', 'BaziWuxingHealth', './bazi-wuxing-health-table.js');

    // 流月地支 → 當令五行（辰未戌丑歸長夏=土）
    const _SEASON_ELEMENT_BY_BRANCH = {
        '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土',
        '申': '金', '酉': '金', '戌': '土', '亥': '水', '子': '水', '丑': '土'
    };

    // 某五行落在喜/忌/閒
    function _yongHit(yongShen, el) {
        if (!yongShen || !el) return '閒';
        if (yongShen.favorable && yongShen.favorable.indexOf(el) !== -1) return '喜';
        if (yongShen.unfavorable && yongShen.unfavorable.indexOf(el) !== -1) return '忌';
        return '閒';
    }
    // 合化/三合/三會：引動的五行落喜→吉、落忌→凶、閒→中（transformsTo 可能是 "火/土"）
    function _verdictByTransform(yongShen, transformsTo) {
        const els = String(transformsTo || '').split('/').filter(Boolean);
        let hasFav = false, hasUnfav = false;
        els.forEach(e => { const h = _yongHit(yongShen, e); if (h === '喜') hasFav = true; else if (h === '忌') hasUnfav = true; });
        if (hasFav && !hasUnfav) return '吉';
        if (hasUnfav && !hasFav) return '凶';
        if (hasFav && hasUnfav) return '吉凶參半';
        return '中';
    }
    // 沖/破/害/刑：剋洩去「忌神所坐之支」偏吉、動搖「喜神所坐之支」偏凶（TODO_NAKAI：流派可調）
    function _verdictByAfflict(yongShen, affectedElement) {
        const h = _yongHit(yongShen, affectedElement);
        if (h === '喜') return '凶';
        if (h === '忌') return '吉';
        return '中';
    }

    /**
     * 單一動態柱（大運/流年/流月/流日）對原局的深度引動分析
     * @param {string} dayStem 日主天干
     * @param {Array}  origPos [{role:'年'|'月'|'日'|'時', branch}]
     * @param {string} timePillar 動態柱干支
     * @param {string} layerLabel '大運'|'流年'|'流月'|'流日'
     * @param {Object} yongShen selectYongShen 結果
     */
    function analyzeActivation(dayStem, origPos, timePillar, layerLabel, yongShen) {
        if (!timePillar) return { layer: layerLabel, pillar: null, note: '無資料（如未起運）' };
        const tStem = timePillar.charAt(0);
        const tBranch = timePillar.charAt(1);
        const origBranches = origPos.map(o => o.branch);
        const allBranches = origBranches.concat([tBranch]);
        const REL = _relTable();
        const CLASH = _clashTable();

        const relations = [];
        const clashes = [];
        let jiCount = 0, xiongCount = 0;
        const favEls = [], unfavEls = [];

        // —— 天干：對日主的十神 ＋ 與日主五合/相剋 ——
        const stemTenGod = getTenGod(dayStem, tStem);
        const stemRule = STEM_INTERACTIONS[dayStem] || {};
        let stemRel = null;
        if (stemRule.combinesWith === tStem) stemRel = `與日主 ${dayStem}${tStem} 相合`;
        else if (stemRule.clashesWith === tStem) stemRel = `剋日主（${tStem}剋${dayStem}）`;

        // —— 地支群關係（與原局四支一起判，只取「引動到此動態支」者）——
        if (REL) {
            const grp = REL.detectGroupRelations(allBranches);
            const involves = arr => arr && arr.indexOf(tBranch) !== -1;

            (grp.sanhui || []).forEach(s => {
                if (!involves(s.involved)) return;
                const v = _verdictByTransform(yongShen, s.transformsTo);
                relations.push({ kind: '三會', name: s.name, involved: s.involved, complete: s.complete, transformsTo: s.transformsTo, verdict: v, reason: `${s.involved.join('')}${s.complete ? '三會' : '半會'}化${s.transformsTo}（${_yongHit(yongShen, s.transformsTo)}神）` });
                if (v === '吉') { jiCount++; favEls.push(s.transformsTo); } else if (v === '凶') { xiongCount++; unfavEls.push(s.transformsTo); }
            });
            (grp.sanhe || []).forEach(s => {
                if (!involves(s.involved)) return;
                const v = _verdictByTransform(yongShen, s.transformsTo);
                relations.push({ kind: '三合', name: s.name, involved: s.involved, complete: s.complete, grade: s.grade, transformsTo: s.transformsTo, verdict: v, reason: `${s.involved.join('')}${s.grade}化${s.transformsTo}（${_yongHit(yongShen, s.transformsTo)}神）` });
                if (v === '吉') { jiCount++; favEls.push(s.transformsTo); } else if (v === '凶') { xiongCount++; unfavEls.push(s.transformsTo); }
            });
            (grp.xing || []).forEach(x => {
                if (!involves(x.involved)) return;
                // 刑為「痛苦的修正」，吉凶依流派，這裡標中性並帶養生提醒
                relations.push({ kind: '刑', name: x.type, involved: x.involved, complete: x.complete, verdict: '中', reason: `${x.involved.join('')}${x.type}${x.complete ? '' : '（半刑）'}`, gentleReminder: x.info && x.info.gentleReminder });
            });

            // —— 成對關係（六合/破/害/暗合）：以「流曜支 × 每個原局支」逐一查表（lookupPair）。
            //    不用 grp.pairs 過濾——同字支時（流曜支與某原局支同字）字元比對會把
            //    原局內部的關係誤歸給流曜、且同一關係重複計數（M1 修正）。
            //    刑不在此處理：交由上方群體偵測（含三刑/半刑/自刑），避免重複。——
            origPos.forEach(o => {
                const lp = REL.lookupPair(tBranch, o.branch);
                if (!lp) return;
                if (lp.liuhe) {
                    const v = _verdictByTransform(yongShen, lp.liuhe.transformsTo);
                    relations.push({ kind: '六合', pair: lp.pair, with: o.role + '支', transformsTo: lp.liuhe.transformsTo, verdict: v, reason: `與${o.role}支${o.branch}六合化${lp.liuhe.transformsTo}（${_yongHit(yongShen, lp.liuhe.transformsTo)}神）`, gentleReminder: lp.liuhe.gentleReminder });
                    if (v === '吉') { jiCount++; favEls.push(lp.liuhe.transformsTo); } else if (v === '凶') { xiongCount++; unfavEls.push(lp.liuhe.transformsTo); }
                }
                if (lp.po) {
                    const affEl = getElementOf(o.branch);
                    const v = _verdictByAfflict(yongShen, affEl);
                    relations.push({ kind: '破', pair: lp.po.pair, with: o.role + '支', affected: o.branch, affectedElement: affEl, verdict: v, reason: `破動${o.role}支${o.branch}(${affEl}·${_yongHit(yongShen, affEl)}神)`, gentleReminder: lp.po.gentleReminder });
                    if (v === '吉') jiCount++; else if (v === '凶') xiongCount++;
                }
                if (lp.hai) {
                    const affEl = getElementOf(o.branch);
                    const v = _verdictByAfflict(yongShen, affEl);
                    relations.push({ kind: '害', pair: lp.hai.pair, with: o.role + '支', affected: o.branch, affectedElement: affEl, verdict: v, reason: `害動${o.role}支${o.branch}(${affEl}·${_yongHit(yongShen, affEl)}神)`, gentleReminder: lp.hai.gentleReminder });
                    if (v === '吉') jiCount++; else if (v === '凶') xiongCount++;
                }
                if (lp.anhe) {
                    relations.push({ kind: '暗合', pair: lp.anhe.pair, with: o.role + '支', verdict: '中', reason: `與${o.role}支${o.branch}暗合（${lp.anhe.links.join('、')}）`, gentleReminder: lp.anhe.gentleReminder });
                }
            });
        }

        // —— 六沖（用 clash 表描述）——
        if (CLASH) {
            origPos.forEach(o => {
                const c = CLASH.lookupClash(o.branch, tBranch);
                if (!c) return;
                const affEl = getElementOf(o.branch);
                const v = _verdictByAfflict(yongShen, affEl);
                clashes.push({ with: o.role + '支' + o.branch, categoryLabel: c.categoryLabel, subtype: c.subtype, affectedElement: affEl, hit: _yongHit(yongShen, affEl), verdict: v, gentleReminder: c.gentleReminder });
                if (v === '吉') jiCount++; else if (v === '凶') xiongCount++;
            });
        }

        const net = (jiCount > xiongCount) ? '偏吉' : (xiongCount > jiCount) ? '偏凶' : '中性';
        const pending = [];
        if (!REL) pending.push('關係合會刑破害（待 bazi-relations-table）');
        if (!CLASH) pending.push('六沖描述（待 bazi-clash-table）');
        return {
            layer: layerLabel, pillar: timePillar, stem: tStem, branch: tBranch,
            stemTenGod: stemTenGod, stemRelation: stemRel,
            relations: relations,
            clashes: CLASH ? clashes : null,            // null = 待資料表（非「無沖」）
            verdict: { ji: jiCount, xiong: xiongCount, net: net, favorableElements: _uniq(favEls), unfavorableElements: _uniq(unfavEls) },
            pending: pending,
            modulesMissing: { relations: !REL, clash: !CLASH }
        };
    }

    /**
     * 動態層總成：以查詢日期取大運/流年/流月/流日，逐柱深度引動分析 ＋ 養生方向
     * @param {Object} chart computeChart 的回傳（需含 pillars / strength / yongShen / meta）
     * @param {number} qY 查詢年（流年/大運基準）
     * @param {number} qM 查詢月（流月基準）
     * @param {number} qD 查詢日（流日基準）
     */
    function analyzeDynamics(chart, qY, qM, qD) {
        const p = chart.pillars;
        const dayStem = p.dayPillar.charAt(0);
        const yongShen = chart.yongShen || selectYongShen(p, chart.strength, chart.dayMaster);
        const strength = chart.strength || analyzeStrength(p);
        const origPos = [
            { role: '年', branch: p.yearPillar.charAt(1) },
            { role: '月', branch: p.monthPillar.charAt(1) },
            { role: '日', branch: p.dayPillar.charAt(1) },
            { role: '時', branch: p.hourPillar.charAt(1) }
        ];

        // 動態四曜（與細盤同一套計算）
        const annualGZ = getAnnualPillar(qY);
        const monthlyGZ = getMonthlyPillar(qY, qM, qD);
        const dailyGZ = getDailyPillar(qY, qM, qD);
        const cycle = getLuckCycle(chart.meta.solarBirth, (chart.meta && chart.meta.gender) || '男', p.yearPillar.charAt(0), p.monthPillar);
        const curLuck = cycle.dataMissing ? null : getCurrentLuckPillar(cycle, chart.meta.solarBirth, qY, qM, qD);
        const daYunGZ = curLuck ? curLuck.pillar : null;

        const layers = {
            daYun: analyzeActivation(dayStem, origPos, daYunGZ, '大運', yongShen),
            annual: analyzeActivation(dayStem, origPos, annualGZ, '流年', yongShen),
            monthly: analyzeActivation(dayStem, origPos, monthlyGZ, '流月', yongShen),
            daily: analyzeActivation(dayStem, origPos, dailyGZ, '流日', yongShen)
        };

        // 養生線：旺衰 byElement ＋ 當下流月當令五行
        const HEALTH = _healthTable();
        const seasonElement = _SEASON_ELEMENT_BY_BRANCH[monthlyGZ.charAt(1)] || null;
        const yangsheng = (HEALTH && strength.details && strength.details.byElement)
            ? { seasonElement: seasonElement, advice: HEALTH.yangshengAdvice(strength.details.byElement, seasonElement) }
            : { seasonElement: seasonElement, advice: null, pending: true, note: '待資料表（養生表 bazi-wuxing-health-table）' };

        return {
            query: { year: qY, month: qM, day: qD },
            yongShen: { favorable: yongShen.favorable, unfavorable: yongShen.unfavorable, neutral: yongShen.neutral, method: yongShen.method },
            layers: layers,
            yangsheng: yangsheng
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
        const strength = analyzeStrength(pillars);
        const yongShen = selectYongShen(pillars, strength, dayMaster);

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
            strength: strength,
            yongShen: yongShen
        };

        // 如果指定了流年，加上流年分析
        if (targetYear) {
            result.annual = analyzeTimePillar(pillars.dayPillar, getAnnualPillar(targetYear), '流年');
            result.annual.targetYear = targetYear;
        }

        // 如果指定了完整日期，加上流年+流月+流日三層分析（淺層，向後相容）
        // 以及動態層深度引動分析（深層：合會刑沖破害 × 喜用神 × 養生）
        if (targetDate && targetDate.year && targetDate.month && targetDate.day) {
            result.dateLayers = analyzeDateLayers(
                pillars.dayPillar, targetDate.year, targetDate.month, targetDate.day
            );
            result.dynamics = analyzeDynamics(result, targetDate.year, targetDate.month, targetDate.day);
        }

        return result;
    }

    // ============================================================
    // 七、細盤（截圖式表格）所需的新計算
    //     —— 十二長生、納音、神煞、大運
    //     以下皆為本次新增；計算規則若涉及流派差異，已於註解標明。
    // ============================================================

    const YANG_STEMS = ['甲', '丙', '戊', '庚', '壬'];
    function isYangStem(stem) { return YANG_STEMS.indexOf(stem) !== -1; }

    // ---- 十二長生 ----
    // 順序固定；陽干順行、陰干逆行。各天干「長生」起點（土寄火）：
    const TWELVE_STAGES = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
    const CHANG_SHENG_START = {
        '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
        '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯'
    };

    /**
     * 取某天干在某地支的十二長生階段
     * 用於「星運」（柱支對日主天干）與「自坐」（柱干坐柱支）
     */
    function getTwelveStage(stem, branch) {
        const start = CHANG_SHENG_START[stem];
        if (!start) return '';
        const startIdx = EARTHLY_BRANCHES.indexOf(start);
        const bIdx = EARTHLY_BRANCHES.indexOf(branch);
        if (startIdx < 0 || bIdx < 0) return '';
        const pos = isYangStem(stem)
            ? (bIdx - startIdx + 12) % 12   // 陽順
            : (startIdx - bIdx + 12) % 12;  // 陰逆
        return TWELVE_STAGES[pos];
    }

    // 由十二長生反查某天干的特定階段所在地支（用於祿神=臨官、羊刃=帝旺）
    function branchOfStage(stem, stageName) {
        for (let i = 0; i < EARTHLY_BRANCHES.length; i++) {
            if (getTwelveStage(stem, EARTHLY_BRANCHES[i]) === stageName) return EARTHLY_BRANCHES[i];
        }
        return null;
    }

    // ---- 六十甲子序號 / 納音 ----
    // 由干支求其在六十甲子中的序號（0-59）
    function ganZhiIndex(ganZhi) {
        const si = HEAVENLY_STEMS.indexOf(ganZhi.charAt(0));
        const bi = EARTHLY_BRANCHES.indexOf(ganZhi.charAt(1));
        if (si < 0 || bi < 0) return -1;
        for (let i = 0; i < 60; i++) {
            if (i % 10 === si && i % 12 === bi) return i;
        }
        return -1;
    }
    function ganZhiFromIndex(idx) {
        idx = ((idx % 60) + 60) % 60;
        return HEAVENLY_STEMS[idx % 10] + EARTHLY_BRANCHES[idx % 12];
    }

    // 六十甲子納音（每 2 柱共用一個納音，共 30 個）
    const NAYIN_30 = [
        '海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木',
        '泉中水', '屋上土', '霹靂火', '松柏木', '長流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
        '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'
    ];
    function getNaYin(ganZhi) {
        const idx = ganZhiIndex(ganZhi);
        if (idx < 0) return '';
        return NAYIN_30[Math.floor(idx / 2)] || '';
    }

    // ---- 神煞 ----
    // 【流派說明】神煞取法各家不同。本工具採常見「今法」：
    //   ‧ 干系神煞（天乙、文昌、祿神、羊刃、飛刃）以「日干」為主。
    //   ‧ 三合系神煞（驛馬、桃花、華蓋、將星、劫煞、災煞、亡神）以「日支」起三合局。
    //   ‧ 紅鸞、天喜以「年支」起。
    //   ‧ 天德、月德以「月支（月令）」起。
    //   ‧ 空亡：該柱地支落在「日柱旬空」即標記。
    //   祿神=日干臨官位、羊刃=日干帝旺位、飛刃=羊刃對沖，皆由十二長生推得。
    //   「德秀」因各家差異大，暫未實作（見工具下方說明）。

    // 天乙貴人（甲戊庚牛羊、乙己鼠猴鄉、丙丁豬雞位、壬癸兔蛇藏、六辛逢馬虎）
    const TIANYI = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['寅', '午']
    };
    // 文昌貴人
    const WENCHANG = {
        '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
        '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
    };
    // 紅鸞（依年支）
    const HONGLUAN = {
        '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌',
        '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
    };
    function tianXiOf(yearBranch) {
        const hl = HONGLUAN[yearBranch];
        if (!hl) return null;
        const i = EARTHLY_BRANCHES.indexOf(hl);
        return EARTHLY_BRANCHES[(i + 6) % 12]; // 天喜為紅鸞對宮
    }
    // 天德貴人（依月支；值可為天干或地支）
    const TIANDE = {
        '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
        '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    };
    // 三合局：地支 → 局別
    const TRIAD_GROUP = {
        '申': 'water', '子': 'water', '辰': 'water',
        '寅': 'fire', '午': 'fire', '戌': 'fire',
        '巳': 'metal', '酉': 'metal', '丑': 'metal',
        '亥': 'wood', '卯': 'wood', '未': 'wood'
    };
    // 各三合局對應的神煞地支
    const TRIAD_SHENSHA = {
        '驛馬': { water: '寅', fire: '申', metal: '亥', wood: '巳' },
        '桃花': { water: '酉', fire: '卯', metal: '午', wood: '子' },
        '華蓋': { water: '辰', fire: '戌', metal: '丑', wood: '未' },
        '將星': { water: '子', fire: '午', metal: '酉', wood: '卯' },
        '劫煞': { water: '巳', fire: '亥', metal: '寅', wood: '申' },
        '災煞': { water: '午', fire: '子', metal: '卯', wood: '酉' },
        '亡神': { water: '亥', fire: '巳', metal: '申', wood: '寅' }
    };
    // 月德（依月支三合局 → 天干）
    const YUEDE = { fire: '丙', water: '壬', wood: '甲', metal: '庚' };

    /**
     * 取某柱所帶的神煞清單
     * @param {string} pillarGZ 該柱干支
     * @param {Object} ctx { dayStem, dayBranch, yearBranch, monthBranch, dayKongWang }
     */
    function getShenSha(pillarGZ, ctx) {
        if (!pillarGZ) return [];
        const stem = pillarGZ.charAt(0);
        const branch = pillarGZ.charAt(1);
        const out = [];

        // —— 干系（以日干為主）——
        if (TIANYI[ctx.dayStem] && TIANYI[ctx.dayStem].indexOf(branch) !== -1) out.push('天乙貴人');
        if (WENCHANG[ctx.dayStem] === branch) out.push('文昌');
        if (branchOfStage(ctx.dayStem, '臨官') === branch) out.push('祿神');
        const yangRen = branchOfStage(ctx.dayStem, '帝旺');
        if (yangRen === branch) out.push('羊刃');
        if (yangRen) {
            const feiRen = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf(yangRen) + 6) % 12];
            if (feiRen === branch) out.push('飛刃');
        }

        // —— 年支系 ——
        if (HONGLUAN[ctx.yearBranch] === branch) out.push('紅鸞');
        if (tianXiOf(ctx.yearBranch) === branch) out.push('天喜');

        // —— 三合系（以日支起局）——
        const grp = TRIAD_GROUP[ctx.dayBranch];
        if (grp) {
            Object.keys(TRIAD_SHENSHA).forEach(name => {
                if (TRIAD_SHENSHA[name][grp] === branch) out.push(name);
            });
        }

        // —— 月支系 ——
        const tdVal = TIANDE[ctx.monthBranch];
        if (tdVal && (tdVal === stem || tdVal === branch)) out.push('天德');
        const mgrp = TRIAD_GROUP[ctx.monthBranch];
        if (mgrp && YUEDE[mgrp] === stem) out.push('月德');

        // —— 空亡（落在日柱旬空）——
        if (ctx.dayKongWang && ctx.dayKongWang.indexOf(branch) !== -1) out.push('空亡');

        return out;
    }

    // ---- 大運 ----
    // 節（十二節，非中氣）對應 getTerm 的奇數序號：立春3、驚蟄5…小寒1
    function _jieTimesOfYear(sl, year) {
        const arr = [];
        for (let n = 1; n <= 23; n += 2) {
            const t = sl.getTerm(year, n);
            if (t) arr.push(t);
        }
        return arr;
    }

    /**
     * 計算起運歲數（3 日折 1 年）
     * @param {Object} birth { year, month, day, hour }
     * @param {boolean} forward 順排 true / 逆排 false
     * @returns {{ startAge:number, days:number }}
     */
    function getLuckStartAge(birth, forward) {
        const sl = _getSolarLunar();
        const birthMs = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour || 0);
        let candidates = [];
        if (forward) {
            candidates = _jieTimesOfYear(sl, birth.year).concat(_jieTimesOfYear(sl, birth.year + 1))
                .filter(t => t > birthMs);
            candidates.sort((a, b) => a - b);
        } else {
            candidates = _jieTimesOfYear(sl, birth.year - 1).concat(_jieTimesOfYear(sl, birth.year))
                .filter(t => t < birthMs);
            candidates.sort((a, b) => b - a);
        }
        if (!candidates.length) {
            // 節氣資料不足（如 2050 年末順排需 2051 年節氣）→ 明確標記，勿默默回 0 歲（M2）
            return { startAge: 0, days: 0, dataMissing: true };
        }
        const days = Math.abs(candidates[0] - birthMs) / 86400000;
        return { startAge: days / 3, days: days };
    }

    /**
     * 排大運：回傳起運資訊與前 N 步大運柱
     * 順逆規則：陽年男 / 陰年女 → 順排；陰年男 / 陽年女 → 逆排（年干定陰陽）。
     * @param {Object} birth { year, month, day, hour }
     * @param {string} gender '男' | '女'
     * @param {string} yearStem 年柱天干
     * @param {string} monthPillar 月柱干支（大運由月柱推排）
     * @param {number} steps 排幾步（預設 10）
     */
    function getLuckCycle(birth, gender, yearStem, monthPillar, steps) {
        steps = steps || 10;
        const yang = isYangStem(yearStem);
        const forward = (yang && gender === '男') || (!yang && gender === '女');
        const startInfo = getLuckStartAge(birth, forward);
        const monthIdx = ganZhiIndex(monthPillar);
        const pillars = [];
        for (let k = 1; k <= steps; k++) {
            const idx = forward ? monthIdx + k : monthIdx - k;
            pillars.push({
                step: k,
                pillar: ganZhiFromIndex(idx),
                startAge: startInfo.startAge + (k - 1) * 10
            });
        }
        return { forward: forward, startAge: startInfo.startAge, startDays: startInfo.days, dataMissing: !!startInfo.dataMissing, pillars: pillars };
    }

    // 以查詢日期計算虛歲（實足年齡，用來定位當前大運）
    function _ageAtDate(birth, qY, qM, qD) {
        const bMs = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour || 0);
        const qMs = Date.UTC(qY, qM - 1, qD);
        return (qMs - bMs) / (365.2425 * 86400000);
    }

    /**
     * 取查詢日期當下生效的大運柱（未起運回傳 null）
     */
    function getCurrentLuckPillar(cycle, birth, qY, qM, qD) {
        const age = _ageAtDate(birth, qY, qM, qD);
        if (age < cycle.startAge) return null; // 尚未起運
        let cur = null;
        for (let i = 0; i < cycle.pillars.length; i++) {
            if (age >= cycle.pillars[i].startAge) cur = cycle.pillars[i];
            else break;
        }
        return cur;
    }

    // ============================================================
    // 八、細盤表格：把八柱（流日/流月/流年/大運 + 年月日時）整理成
    //     可直接渲染的列資料。截圖式版面由 HTML 負責排版。
    // ============================================================

    /**
     * 計算單一柱的所有列資料
     * @param {string} gz 該柱干支（可為 null → 回傳占位）
     * @param {Object} ctx 共用脈絡（含 dayStem 等）
     * @param {boolean} isDay 是否為日柱（主星顯示元男/元女）
     */
    function computePillarCell(gz, ctx, isDay) {
        if (!gz) {
            return {
                pillar: null, stem: '', branch: '',
                mainStar: '—', stemElement: '', branchElement: '',
                hiddenStems: [], xingYun: '', ziZuo: '',
                kongWang: [], naYin: '', shenSha: []
            };
        }
        const stem = gz.charAt(0);
        const branch = gz.charAt(1);
        const hidden = (BRANCH_HIDDEN_STEMS_FULL[branch] || []).map(hs => ({
            stem: hs, tenGod: getTenGod(ctx.dayStem, hs)
        }));
        const mainStar = isDay
            ? ('元' + (ctx.gender === '女' ? '女' : '男'))
            : getTenGod(ctx.dayStem, stem);
        return {
            pillar: gz,
            stem: stem,
            branch: branch,
            stemElement: getElementOf(stem),
            branchElement: getElementOf(branch),
            mainStar: mainStar,
            hiddenStems: hidden,
            xingYun: getTwelveStage(ctx.dayStem, branch),  // 星運：柱支對日主
            ziZuo: getTwelveStage(stem, branch),            // 自坐：柱干坐柱支
            kongWang: KONG_WANG_RULES[gz] || [],
            naYin: getNaYin(gz),
            shenSha: getShenSha(gz, ctx)
        };
    }

    /**
     * 建立細盤表格資料
     * 欄位順序（左→右）：流日、流月、流年、大運 ｜ 年柱、月柱、日柱、時柱
     * @param {Object} chart computeChart 的回傳
     * @param {number} qY 查詢年（流年/大運基準）
     * @param {number} qM 查詢月（流月基準）
     * @param {number} qD 查詢日（流日基準）
     */
    function buildDetailGrid(chart, qY, qM, qD) {
        const p = chart.pillars;
        const dayStem = p.dayPillar.charAt(0);
        const ctx = {
            dayStem: dayStem,
            dayBranch: p.dayPillar.charAt(1),
            yearBranch: p.yearPillar.charAt(1),
            monthBranch: p.monthPillar.charAt(1),
            dayKongWang: chart.kongWang || [],
            gender: (chart.meta && chart.meta.gender) || '男'
        };

        // 動態四曜
        const annualGZ = getAnnualPillar(qY);
        const monthlyGZ = getMonthlyPillar(qY, qM, qD);
        const dailyGZ = getDailyPillar(qY, qM, qD);

        // 大運
        const birth = chart.meta.solarBirth;
        const cycle = getLuckCycle(birth, ctx.gender, p.yearPillar.charAt(0), p.monthPillar);
        const curLuck = cycle.dataMissing ? null : getCurrentLuckPillar(cycle, birth, qY, qM, qD);
        const daYunGZ = curLuck ? curLuck.pillar : null;

        function ageLabel(a) {
            const yrs = Math.floor(a);
            const mos = Math.round((a - yrs) * 12);
            return mos > 0 ? (yrs + '歲' + mos + '個月') : (yrs + '歲');
        }

        const columns = [
            { role: '流日', sub: qY + '/' + qM + '/' + qD, cell: computePillarCell(dailyGZ, ctx, false), dynamic: true },
            { role: '流月', sub: '節氣月', cell: computePillarCell(monthlyGZ, ctx, false), dynamic: true },
            { role: '流年', sub: qY + '年', cell: computePillarCell(annualGZ, ctx, false), dynamic: true },
            { role: '大運', sub: curLuck ? (ageLabel(curLuck.startAge) + '起') : (cycle.dataMissing ? '節氣資料不足' : '未起運'), cell: computePillarCell(daYunGZ, ctx, false), dynamic: true },
            // 本命四柱：視覺由右至左為「年 月 日 時」（年柱最右），故左→右排為 時、日、月、年
            { role: '時柱', sub: '本命', cell: computePillarCell(p.hourPillar, ctx, false), dynamic: false },
            { role: '日柱', sub: '日主', cell: computePillarCell(p.dayPillar, ctx, true), dynamic: false, isDay: true },
            { role: '月柱', sub: '本命', cell: computePillarCell(p.monthPillar, ctx, false), dynamic: false },
            { role: '年柱', sub: '本命', cell: computePillarCell(p.yearPillar, ctx, false), dynamic: false }
        ];

        return {
            query: { year: qY, month: qM, day: qD },
            luck: {
                forward: cycle.forward,
                startAge: cycle.startAge,
                startAgeLabel: ageLabel(cycle.startAge),
                current: curLuck,
                pillars: cycle.pillars
            },
            columns: columns
        };
    }

    // ============================================================
    // 對外暴露
    // ============================================================

    return {
        // solarLunar 注入接口
        setSolarLunar: setSolarLunar,
        // 資料表注入接口（relations/clash/palace/health；不傳則自動找全域或 require）
        setTables: setTables,
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
        // 身強身弱 + 喜用神
        analyzeStrength, selectYongShen,
        // 動態層深度整合（合會刑沖破害 × 喜用神 × 養生）
        analyzeActivation, analyzeDynamics,
        // 細盤新增：十二長生 / 納音 / 神煞 / 大運 / 表格
        getTwelveStage, getNaYin, ganZhiIndex, ganZhiFromIndex,
        getShenSha, getLuckStartAge, getLuckCycle, getCurrentLuckPillar,
        computePillarCell, buildDetailGrid,
        // 整合主入口
        computeChart
    };
}));
