// 玄学天赋鉴定：按谷雨的规则，从四柱算出加分项、天赋值、档位、派别、牌、宜忌。
// 只看八个字（大运另外传进来），同一个盘永远同一个结果。网页和校准脚本共用这一份。
// 神煞（太极、天乙、孤辰、寡宿、童子煞、魁罡）用谷雨八字插件的引擎 bazi-core.js 的 queryShenSha，只要四柱，不用出生日期。
(function (root) {
  const GAN = '甲乙丙丁戊己庚辛壬癸';
  const ZHI = '子丑寅卯辰巳午未申酉戌亥';
  const BQ = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' }; // 地支本气
  const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const CS = '长生 沐浴 冠带 临官 帝旺 衰 病 死 墓 绝 胎 养'.split(' ');
  const CS_START = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
  const NAYIN = '金火木土金火水土金木水土火木水金火木土金火水土金木水土火木水'; // 六十甲子纳音，每两柱一个，只取五行
  const SHILING = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未'];
  const POS = ['年', '月', '日', '时'];

  const wx = g => Math.floor(GAN.indexOf(g) / 2);
  const yy = g => GAN.indexOf(g) % 2; // 0 阳 1 阴
  function shishen(dm, g) {
    const d = (wx(g) - wx(dm) + 5) % 5;
    return [['比肩', '劫财'], ['食神', '伤官'], ['偏财', '正财'], ['七杀', '正官'], ['偏印', '正印']][d][yy(g) === yy(dm) ? 0 : 1];
  }
  function changsheng(g, z) {
    const s = ZHI.indexOf(CS_START[g]), i = ZHI.indexOf(z);
    return CS[yy(g) === 0 ? (i - s + 12) % 12 : (s - i + 12) % 12];
  }
  const huagai = z => ({ 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 巳: '丑', 酉: '丑', 丑: '丑', 亥: '未', 卯: '未', 未: '未' })[z];
  function kongwang(gz) { // 日柱所在旬的空亡
    const s = (ZHI.indexOf(gz[1]) - GAN.indexOf(gz[0]) + 12) % 12;
    return [ZHI[(s + 10) % 12], ZHI[(s + 11) % 12]];
  }
  function nayinWx(gz) {
    const g = GAN.indexOf(gz[0]), z = ZHI.indexOf(gz[1]);
    for (let k = 0; k < 60; k++) if (k % 10 === g && k % 12 === z) return NAYIN[Math.floor(k / 2)];
    return '';
  }
  const isCai = s => s === '正财' || s === '偏财';
  const isYin = s => s === '正印' || s === '偏印';
  const isShiShang = s => s === '食神' || s === '伤官';

  // b：四柱连写，6 个字（没有时辰）或 8 个字
  function parse(b) {
    const s = String(b || '').replace(/\s/g, '');
    if (s.length !== 6 && s.length !== 8) return null;
    const P = [];
    for (let i = 0; i < s.length; i += 2) {
      const g = s[i], z = s[i + 1];
      if (GAN.indexOf(g) < 0 || ZHI.indexOf(z) < 0 || GAN.indexOf(g) % 2 !== ZHI.indexOf(z) % 2) return null;
      P.push(g + z);
    }
    return P;
  }

  // 神煞：按柱查，四柱合起来
  function shensha(P) {
    const all = new Set();
    const BC = root.BaziCore;
    if (!BC || !BC.queryShenSha) return all;
    const ctx = { yearGan: P[0][0], yearZhi: P[0][1], monthZhi: P[1][1], dayGan: P[2][0], dayZhi: P[2][1], hourGan: P[3] ? P[3][0] : '', hourZhi: P[3] ? P[3][1] : '', gender: '坤', yearNaYin: '纳音' + nayinWx(P[0]) };
    ['year', 'month', 'day', 'hour'].forEach((k, i) => { if (P[i]) BC.queryShenSha(P[i][0], P[i][1], k, ctx).forEach(x => all.add(x)); });
    return all;
  }

  // 七档：分数线最早按「第三档以上约六成」从随机盘里排出来，10-22 起固定不再重划：
  // 每次重划，加了宽松的规则大家一起涨、线也跟着涨，谷雨说规则「越来越紧缩」。现在加分就是真加分
  const TIERS = [
    { min: 112, n: '隐藏款', talent: true },
    { min: 87, n: '第六档', talent: true },
    { min: 71, n: '第五档', talent: true },
    { min: 56, n: '第四档', talent: true },
    { min: 43, n: '第三档', talent: true },
    { min: 29, n: '第二档', talent: false },
    { min: 0, n: '第一档', talent: false },
  ];
  // 每档分两派：分数里十神那一路（偏印、印星组合）占得多的是悟性派，神煞地支那一路占得多的是体质派。
  // 切线是该档悟性占比的中位数（校准.js 算的），所以每档两派约一半一半。
  // 第一档大多一分十神分都没有，改看盘里有没有正印（正规学问、讲逻辑），有正印的约一半
  const WU_CUT = [null, 0.511, 0.514, 0.439, 0.34, 0.242, null];

  // 牌：0 隐藏款，之后每档 [悟性派, 体质派]
  const CARDS = [
    { n: '天选玄学圣体', d: '你不是在学，是在想起来。',
      y: ['开个直播间给全网算', '把这张牌设成头像', '收徒'], j: ['低调', '免费给人算', '假装自己不懂'] },
    { n: '祖师奶奶追着喂饭', d: '口诀看一眼就会，还嫌书上写得啰嗦。',
      y: ['翻开一本没读过的命书', '熬夜排盘', '给闺蜜看大运'], j: ['浪费天赋', '学完不复盘', '跟祖师奶奶顶嘴'] },
    { n: '老天奶给你开了专线', d: '别人还在求签，你已经接到电话了。',
      y: ['相信第一反应', '记下今晚的梦', '去山里走走'], j: ['挂老天奶的电话', '跟直觉对着干', '在人多的地方久待'] },
    { n: '2倍速玄学直觉', d: '别人学一节课，你十分钟就会了。',
      y: ['一天学完一章', '开 2 倍速听课', '给自己排个盘'], j: ['慢慢来', '只看不练', '光听不问'] },
    { n: '第六感准到朋友害怕', d: '你一说「我有种预感」，全桌都安静了。',
      y: ['说出你的预感', '替朋友挑日子', '抽一张塔罗'], j: ['乌鸦嘴', '预言别人的坏事', '替前任算复合'] },
    { n: '有慧根，就差个师父', d: '天赋在，缺一个人带你入门。',
      y: ['拜师', '认真记笔记', '多问老师一句'], j: ['自学走火入魔', '三天打鱼两天晒网', '信网上的速成班'] },
    { n: '梦比天气预报还准', d: '做过的梦，过两天总有一件成真。',
      y: ['床头放个本子记梦', '早点睡', '留意梦里的提示'], j: ['熬夜', '把噩梦当真', '睡前刷恐怖片'] },
    { n: '越学越灵', d: '慢热型选手，书翻到第三遍，突然就通了。',
      y: ['把口诀再背一遍', '多看几个案例', '每天排一个盘'], j: ['急', '跟学霸比进度', '学一半就放弃'] },
    { n: '偶尔显灵', d: '灵感一阵一阵的，准起来自己都吓一跳。',
      y: ['抓住灵感那一下', '随身带个本子', '找个安静的地方坐坐'], j: ['逼自己显灵', '当众表演', '灵感来了不记下'] },
    { n: '理论满分，实战随缘', d: '口诀背得比谁都熟，一上手就开始猜。',
      y: ['多看真人的盘', '算完先对答案', '找个搭子互相练'], j: ['背完口诀就开算', '给陌生人铁口直断', '收钱'] },
    { n: '玄学气氛组', d: '天赋差一口气，热情满分，课上问得最多的就是你。',
      y: ['坐第一排', '替大家举手提问', '给老师鼓掌'], j: ['冷场', '一个人闷头算', '信网上十块钱的测算'] },
    { n: '可能是个麻瓜', d: '别人靠感觉，你靠逻辑，算完大家都来找你核对。',
      y: ['相信科学', '替大家核对答案', '做个表格'], j: ['硬算', '凭感觉下结论', '替别人做决定'] },
    { n: '玄学绝缘体', d: '天赋没点在这儿，所以你学会的每一招都是真本事。',
      y: ['靠自己', '睡个好觉', '多学几招'], j: ['迷信', '乱买转运珠', '还没学就放弃'] },
  ];

  // 排名：天赋值 s 对应「超过百分之几的人」（千分比，下标是天赋值，0～160，校准.js 生成）
  const RANK = [0,0,0,0,0,1,1,1,1,2,3,3,4,7,8,10,13,16,20,23,28,33,41,47,53,61,71,80,89,96,105,115,126,135,146,157,169,180,192,205,219,232,246,259,273,286,300,315,330,346,358,372,385,397,411,427,442,455,468,482,496,511,524,537,554,567,579,593,606,618,631,642,656,668,682,695,706,719,731,742,753,764,774,784,793,801,811,820,827,837,846,854,862,869,876,882,888,895,900,907,912,917,921,926,929,934,938,943,946,950,953,956,959,962,964,966,968,970,971,974,975,978,979,981,983,984,985,987,988,989,990,991,991,992,993,993,994,994,995,996,996,997,997,997,997,998,998,998,998,998,998,999,999,999,999,999,999,1000,1000,1000,1000];

  // opts.dayun：[{ gz: '庚子', startYear: 2021 }, …]；opts.year：按哪一年看现在的大运
  function judge(b, opts) {
    opts = opts || {};
    const P = parse(b);
    if (!P) return { error: '八字看不懂' };
    const has4 = P.length === 4;
    const G = P.map(p => p[0]), Z = P.map(p => p[1]), dm = G[2];
    const tg = G.map((g, i) => i === 2 ? null : shishen(dm, g));
    const zg = Z.map(z => shishen(dm, BQ[z]));
    const sh = shensha(P);
    const items = [];
    const add = (key, n, label, why, wu) => items.push({ key, n, label, why, wu: !!wu });
    const ZL = Z.map((z, i) => ({ z, i })), at = i => POS[i] + '支' + Z[i];

    // 受伤：财星比印星旺。每个财、印先算 1 分力量，只算挨着印的财（同柱上下、左右相邻；隔开了克不到）：
    // 财有食伤贴身生（左右相邻或同柱上下）+0.5，天干的财自坐长生、沐浴、冠带、临官、帝旺、养 +0.5，财在月令 +0.5；
    // 印和财同柱上下 −0.5，天干的印自坐病、死、墓、绝 −0.5，印在月令 +0.5
    let cai = 0, yin = 0;
    const near = (row, i) => row === 'g' ? [['g', i - 1], ['g', i + 1], ['z', i]] : [['z', i - 1], ['z', i + 1], ['g', i]];
    const ssAt = ([r, j]) => j < 0 || j >= P.length ? null : r === 'g' ? tg[j] : zg[j];
    for (const row of ['g', 'z']) for (let i = 0; i < P.length; i++) {
      const s = row === 'g' ? tg[i] : zg[i];
      if (!s) continue;
      if (isCai(s) && near(row, i).some(p => isYin(ssAt(p)))) {
        let v = 1;
        if (near(row, i).some(p => isShiShang(ssAt(p)))) v += 0.5;
        if (row === 'g' && '长生 沐浴 冠带 临官 帝旺 养'.split(' ').includes(changsheng(G[i], Z[i]))) v += 0.5;
        if (row === 'z' && i === 1) v += 0.5;
        cai += v;
      }
      if (isYin(s)) {
        let v = 1;
        if (isCai(row === 'g' ? zg[i] : tg[i])) v -= 0.5;
        if (row === 'g' && '病 死 墓 绝'.split(' ').includes(changsheng(G[i], Z[i]))) v -= 0.5;
        if (row === 'z' && i === 1) v += 0.5;
        yin += v;
      }
    }
    const hurt = cai > yin;
    const hurtWhy = hurt ? '，但财星比印星旺（财 ' + cai + ' : 印 ' + yin + '），被财伤了' : '';

    // 一、偏印（悟性）
    const pyAt = [...[0, 1, 3].filter(i => tg[i] === '偏印').map(i => POS[i] + '干' + G[i]), ...ZL.filter(x => zg[x.i] === '偏印').map(x => at(x.i))];
    if (zg[2] === '偏印') add('zuo', hurt ? 8 : 30, '自坐偏印', '日支' + Z[2] + '的本气是偏印' + (hurt ? hurtWhy : '，没被财伤'), 1);
    else if (zg[1] === '偏印') add('ge', hurt ? 8 : 30, '偏印格', '月支' + Z[1] + '的本气是偏印' + (hurt ? hurtWhy : '，没被财伤'), 1);
    else if (pyAt.length) add('py', hurt ? 5 : 15, '偏印', pyAt.join('、') + '是偏印' + (hurt ? hurtWhy : '，没被财伤'), 1);
    const zi = (z, s) => ZL.some(x => x.z === z && zg[x.i] === s);
    if (zi('辰', '偏印')) add('chenPY', 15, '辰为偏印', '辰是龙，又是你的偏印：最强偏印', 1);
    else if (zi('辰', '正印')) add('chenZY', 8, '辰为正印', '辰是龙，又是你的正印', 1);
    if (zi('戌', '偏印')) add('xuPY', 10, '戌为偏印', '戌主虚空，又是你的偏印', 1);
    else if (zi('戌', '正印')) add('xuZY', 5, '戌为正印', '戌主虚空，又是你的正印', 1);
    if (zi('丑', '偏印') || zi('未', '偏印')) add('cwPY', 6, '丑未为偏印', '丑是和尚、未是道士，又是你的偏印', 1);
    for (const z of ['巳', '申']) {
      const what = z === '巳' ? '巳是蛇、是散仙' : '申是神，通高维';
      if (zi(z, '偏印')) add(z + 'PY', 12, z + '为偏印', what + '，又是你的偏印', 1);
      else if (zi(z, '正印')) add(z + 'ZY', 8, z + '为正印', what + '，又是你的正印', 1);
    }
    // 十神组合（天干透出的、地支本气都算）
    const all = [...[0, 1, 3].filter(i => tg[i]).map(i => tg[i]), ...zg];
    const cnt = s => all.filter(x => x === s).length;
    if (cnt('偏印') && cnt('食神')) add('xiao', 8, '枭神夺食', '偏印、食神都有', 1);
    if (cnt('偏印') && cnt('伤官')) add('shangPY', 8, '伤官配偏印', '伤官、偏印都有', 1);
    else if (cnt('伤官') && cnt('正印') >= 2) add('shangZY', 5, '伤官配正印', '伤官配' + cnt('正印') + '个正印', 1);
    if (cnt('偏印') && cnt('七杀')) add('shayin', 6, '杀印相生', '七杀、偏印都有', 1);
    if (Z.includes('卯') && Z.includes('酉')) {
      const x = ZL.find(x => (x.z === '卯' || x.z === '酉') && zg[x.i] === '偏印');
      if (x) add('maoyou', 8, '卯酉冲带偏印', '卯酉相冲，' + x.z + '又是你的偏印', 1);
    }

    // 二、地支的土
    const tus = [['辰', 10, '辰是龙'], ['戌', 8, '戌主虚空'], ['丑', 4, '丑是和尚'], ['未', 4, '未是道士']].filter(t => Z.includes(t[0]));
    if (tus.length) add('tu', Math.min(18, tus.reduce((a, t) => a + t[1], 0)), '地支的土', tus.map(t => t[2]).join('，'));

    // 三、神煞
    const hgY = [1, 2, 3].filter(i => Z[i] && Z[i] === huagai(Z[0]));
    const hgD = [0, 1, 3].filter(i => Z[i] && Z[i] === huagai(Z[2]));
    if (hgY.length && hgD.length) add('hg2', 25, '年日双华盖', '年支、日支查出来都有华盖');
    else if (hgY.length || hgD.length) add('hg', 10, '华盖', (hgY.length ? '年支' + Z[0] : '日支' + Z[2]) + '查出华盖在' + (hgY.length ? hgY : hgD).map(i => POS[i] + '支').join('、'));
    const kw = kongwang(P[2]);
    const hgAt = [...new Set([...hgY, ...hgD])];
    if (hgAt.some(i => kw.includes(Z[i]))) add('hgKong', 8, '华盖逢空亡', '华盖' + hgAt.filter(i => kw.includes(Z[i])).map(i => Z[i])[0] + '落在空亡里');
    if (SHILING.includes(P[2])) add('shiling', 12, '十灵日', P[2] + '日是十灵日，聪明有灵气');
    if (sh.has('太极贵人')) add('taiji', 4, '太极贵人', '命里带太极贵人');
    if (sh.has('天乙贵人')) add('tianyi', 4, '天乙贵人', '命里带天乙贵人');
    const hasHg = hgY.length > 0 || hgD.length > 0;
    for (const [k, n, s] of [['guchen', 4, '孤辰'], ['guasu', 4, '寡宿'], ['tongzi', 3, '童子煞']]) if (sh.has(s)) add(k, n, s, '命里带' + s);
    const lone = [hasHg, sh.has('孤辰'), sh.has('寡宿'), sh.has('童子煞')].filter(Boolean).length;
    if (lone === 4) add('lone4', 15, '孤独星拉满', '华盖、孤辰、寡宿、童子煞四颗全有');
    else if (lone === 3) add('lone3', 6, '孤独星三颗', '华盖、孤辰、寡宿、童子煞有三颗');
    if (sh.has('魁罡日')) add('kuigang', 8, '魁罡', P[2] + '日是魁罡日');
    if (Z.includes('戌') && Z.includes('亥')) add('tianmen', 8, '戌亥天门', '地支戌、亥都在：戌亥是天门');
    if (Z.includes('辰') && Z.includes('巳')) add('dihu', 8, '辰巳地户', '地支辰、巳都在：辰巳是地户');
    if (has4 && yy(G[2]) && yy(G[3])) add('yin', 5, '日时皆阴干', '日干' + G[2] + '、时干' + G[3] + '都是阴干');

    // 四、癸：通鬼神
    if (dm === '癸') add('gui', 10, '日主癸', '日主是癸水，癸通鬼神');
    else if (G.includes('癸')) add('gui', 6, '天干有癸', '天干透出癸水，癸通鬼神');
    const gp = [2, 3, 1].find(i => P[i] === '癸丑' || P[i] === '癸未');
    if (gp !== undefined) add('guiZhu', { 2: 15, 3: 10, 1: 6 }[gp], POS[gp] + '柱' + P[gp], P[gp] === '癸丑' ? '癸是鬼、丑是墓：从坟里爬出来的鬼' : '癸是鬼、未是道士');
    if (Z.includes('子')) add('zi', 6, '地支有子水', '子是癸水的地支');

    // 五、运：本命定底子，大运流年定什么时候开窍。
    // 现在走偏印运 +20（大运点火），以前走过偏印运 +8（开过窍），现在走土运 +5，今年流年是偏印 +8
    const year = opts.year || new Date().getFullYear();
    const isPY = gz => shishen(dm, gz[0]) === '偏印' || shishen(dm, BQ[gz[1]]) === '偏印';
    const pyWhere = gz => shishen(dm, gz[0]) === '偏印' ? '天干' : '地支';
    let dyNow = null;
    const timeline = [];
    if (opts.dayun && opts.dayun.length) {
      dyNow = opts.dayun.filter(d => d.startYear <= year).pop() || null;
      if (dyNow) {
        const span = '（' + dyNow.startYear + '–' + (dyNow.startYear + 9) + '）';
        if (isPY(dyNow.gz)) { add('dyPY', 20, '正走偏印运', '现在走' + dyNow.gz + '运' + span + '：' + pyWhere(dyNow.gz) + '是偏印，正在开窍', 1); dyNow.kind = '偏印运'; }
        else if ('戊己'.includes(dyNow.gz[0]) || '辰戌丑未'.includes(dyNow.gz[1])) { add('dyTu', 5, '正走土运', '现在走' + dyNow.gz + '运' + span + '：土运'); dyNow.kind = '土运'; }
        dyNow.span = span;
        const past = opts.dayun.filter(d => d.startYear < dyNow.startYear && isPY(d.gz));
        if (!dyNow.kind || dyNow.kind !== '偏印运') if (past.length) add('dyPast', 8, '走过偏印运', '以前走过' + past.map(d => d.gz).join('、') + '偏印运，开过窍', 1);
      }
      // 开窍时间表：这辈子的偏印大运（虚岁 90 以前）
      const by = opts.birthYear;
      for (const d of opts.dayun) {
        if (by && d.startYear - by >= 90) break;
        if (!isPY(d.gz)) continue;
        const end = d.startYear + 9;
        timeline.push({ gz: d.gz, from: d.startYear, to: end, age: by ? [d.startYear - by + 1, end - by + 1] : null, state: end < year ? '开过了' : d.startYear <= year ? '正在开' : '还没到' });
      }
    }
    const ln = GAN[((year - 4) % 10 + 10) % 10] + ZHI[((year - 4) % 12 + 12) % 12];
    if (isPY(ln)) add('ln', 8, '今年流年偏印', year + '年' + ln + '：' + pyWhere(ln) + '是偏印', 1);

    items.sort((a, b) => b.n - a.n);
    const score = items.reduce((a, x) => a + x.n, 0);
    const benming = score - items.filter(x => /^(dyPY|dyPast|dyTu|ln)$/.test(x.key)).reduce((a, x) => a + x.n, 0);
    const wuShare = score ? items.filter(x => x.wu).reduce((a, x) => a + x.n, 0) / score : 0;
    // 隐藏款：总分 112 以上；或者本命已经有 71 分（第五档），现在又正走偏印运
    const gate = benming >= 71 && dyNow && dyNow.kind === '偏印运';
    const t = gate ? 0 : TIERS.findIndex(x => score >= x.min);
    const hasZY = [...tg, ...zg].includes('正印');
    const school = t === 0 ? '' : (t === 6 ? hasZY : wuShare >= WU_CUT[t]) ? '悟性派' : '体质派';
    const card = t === 0 ? 0 : (t - 1) * 2 + 1 + (school === '悟性派' ? 0 : 1);
    const permille = RANK.length ? RANK[Math.min(score, RANK.length - 1)] : 0;
    const rank = Math.min(99.9, permille / 10);

    // 宜忌：按八字挑一版
    const seed = GAN.indexOf(G[2]) + (has4 ? ZHI.indexOf(Z[3]) : 0) + GAN.indexOf(G[1]);
    const C = CARDS[card];
    return {
      pillars: P, has4, dm, tg, zg,
      items, score, benming, gate, tier: TIERS[t], tierIndex: t, school, card, cardInfo: C,
      rank, talent: TIERS[t].talent, wuShare,
      yi: C.y[seed % C.y.length], ji: C.j[(seed + 1) % C.j.length],
      dyNow, timeline, ln, cai, yin, hurt,
    };
  }

  const api = { GAN, ZHI, BQ, GAN_WX, CARDS, TIERS, WU_CUT, parse, judge, shishen, shensha };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Xuanxue = api;
})(typeof window !== 'undefined' ? window : globalThis);
