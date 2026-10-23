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

  // 分档：10-22 起分数线固定不再按比例重划（每次重划，加了宽松的规则大家一起涨、线也跟着涨，谷雨说「越来越紧缩」）。
  // 10-23 谷雨要 100 分以上细分（100、110、120、130 各一档，她说 147 和 100 完全是两个档），
  // 又嫌下面三档人太多「有点打击人」，所以下面收窄、中间放宽：第三档（45）以上算有天赋，约七成
  const TIERS = [
    { min: 130, n: '隐藏款', talent: true },
    { min: 120, n: '第八档', talent: true },
    { min: 110, n: '第七档', talent: true },
    { min: 100, n: '第六档', talent: true },
    { min: 80, n: '第五档', talent: true },
    { min: 60, n: '第四档', talent: true },
    { min: 45, n: '第三档', talent: true },
    { min: 30, n: '第二档', talent: false },
    { min: 0, n: '第一档', talent: false },
  ];
  // 每档分两派：分数里十神那一路（偏印、印星组合）占得多的是悟性派，神煞地支那一路占得多的是体质派。
  // 切线是该档悟性占比的中位数（校准.js 算的），所以每档两派约一半一半。
  // 第一档大多一分十神分都没有，改看盘里有没有正印（正规学问、讲逻辑），有正印的约一半
  const WU_CUT = [null, 0.54, 0.534, 0.528, 0.529, 0.481, 0.348, 0.235, null];

  // 牌：0 隐藏款，之后每档 [悟性派, 体质派]；art 是插画文件 art/NN.webp 的编号（10-23 插了四张新牌，老牌的图不改名）
  const CARDS = [
    { n: '天选玄学圣体', art: '00', d: '你不是在学，是在想起来。',
      y: ['开个直播间给全网算', '把这张牌设成头像', '收徒'], j: ['低调', '免费给人算', '假装自己不懂'] },
    { n: '祖师奶奶追着喂饭', art: '01', d: '口诀看一眼就会，还嫌书上写得啰嗦。',
      y: ['翻开一本没读过的命书', '熬夜排盘', '给闺蜜看大运'], j: ['浪费天赋', '学完不复盘', '跟祖师奶奶顶嘴'] },
    { n: '老天奶给你开了专线', art: '02', d: '别人还在求签，你已经接到电话了。',
      y: ['相信第一反应', '记下今晚的梦', '去山里走走'], j: ['挂老天奶的电话', '跟直觉对着干', '在人多的地方久待'] },
    { n: '出道即出师', art: '13', d: '刚入门就有人来拜你为师，你自己都还没反应过来。',
      y: ['开一门小课', '把笔记整理成讲义', '收第一个徒弟'], j: ['谦虚过头', '只学不教', '把绝招藏着不说'] },
    { n: '天眼开了一半', art: '14', d: '一只眼睛看人间，一只眼睛看那边，切换自如。',
      y: ['相信一闪而过的画面', '去安静的山里待一天', '记下奇怪的巧合'], j: ['熬夜刷手机', '在人多的地方硬撑', '把看到的到处说'] },
    { n: '玄学课代表', art: '15', d: '全班的笔记都抄你的，老师讲到一半会看你一眼。',
      y: ['帮同学排盘', '坐第一排', '把口诀编成顺口溜'], j: ['借笔记不还', '课上偷懒', '只顾帮别人算忘了自己'] },
    { n: '宇宙给你发私信', art: '16', d: '别人在等快递，你在等宇宙回消息，而且总能等到。',
      y: ['睡前许个愿', '留意 11:11 这样的数字', '把灵感记进备忘录'], j: ['已读不回', '怀疑自己的直觉', '手机静音错过信号'] },
    { n: '2倍速玄学直觉', art: '03', d: '别人学一节课，你十分钟就会了。',
      y: ['一天学完一章', '开 2 倍速听课', '给自己排个盘'], j: ['慢慢来', '只看不练', '光听不问'] },
    { n: '第六感准到朋友害怕', art: '04', d: '你一说「我有种预感」，全桌都安静了。',
      y: ['说出你的预感', '替朋友挑日子', '抽一张塔罗'], j: ['乌鸦嘴', '预言别人的坏事', '替前任算复合'] },
    { n: '有慧根，就差个师父', art: '05', d: '天赋在，缺一个人带你入门。',
      y: ['拜师', '认真记笔记', '多问老师一句'], j: ['自学走火入魔', '三天打鱼两天晒网', '信网上的速成班'] },
    { n: '梦比天气预报还准', art: '06', d: '做过的梦，过两天总有一件成真。',
      y: ['床头放个本子记梦', '早点睡', '留意梦里的提示'], j: ['熬夜', '把噩梦当真', '睡前刷恐怖片'] },
    { n: '越学越灵', art: '07', d: '慢热型选手，书翻到第三遍，突然就通了。',
      y: ['把口诀再背一遍', '多看几个案例', '每天排一个盘'], j: ['急', '跟学霸比进度', '学一半就放弃'] },
    { n: '偶尔显灵', art: '08', d: '灵感一阵一阵的，准起来自己都吓一跳。',
      y: ['抓住灵感那一下', '随身带个本子', '找个安静的地方坐坐'], j: ['逼自己显灵', '当众表演', '灵感来了不记下'] },
    { n: '理论满分，实战随缘', art: '09', d: '口诀背得比谁都熟，一上手就开始猜。',
      y: ['多看真人的盘', '算完先对答案', '找个搭子互相练'], j: ['背完口诀就开算', '给陌生人铁口直断', '收钱'] },
    { n: '玄学气氛组', art: '10', d: '天赋差一口气，热情满分，课上问得最多的就是你。',
      y: ['坐第一排', '替大家举手提问', '给老师鼓掌'], j: ['冷场', '一个人闷头算', '信网上十块钱的测算'] },
    { n: '可能是个麻瓜', art: '11', d: '别人靠感觉，你靠逻辑，算完大家都来找你核对。',
      y: ['相信科学', '替大家核对答案', '做个表格'], j: ['硬算', '凭感觉下结论', '替别人做决定'] },
    { n: '玄学绝缘体', art: '12', d: '天赋没点在这儿，所以你学会的每一招都是真本事。',
      y: ['靠自己', '睡个好觉', '多学几招'], j: ['迷信', '乱买转运珠', '还没学就放弃'] },
  ];

  // 排名：天赋值 s 对应「超过百分之几的人」（千分比，下标是天赋值，0～160，校准.js 生成）
  const RANK = [0,0,0,0,0,1,1,1,1,2,3,3,4,8,10,12,15,17,22,26,30,36,44,51,57,64,74,83,93,100,109,120,132,141,152,163,175,185,197,210,224,238,252,264,277,290,305,319,333,349,361,375,390,403,418,433,447,461,474,488,502,517,530,544,560,573,585,598,610,623,636,647,661,673,685,697,707,720,732,742,753,762,772,781,791,799,808,818,825,834,842,849,857,863,871,877,883,889,895,901,906,911,915,920,924,929,932,936,940,944,947,949,952,955,957,959,961,964,966,968,969,971,973,975,977,978,980,981,983,984,985,986,987,989,989,990,991,991,992,993,994,994,994,995,996,996,996,997,997,997,997,998,998,998,998,998,999,999,999,999,999];

  // 灵力面板：每项由哪些加分项组成；STAR_CUT 是 2、3、4、5 颗星要的分数（校准.js 按随机盘的分布定的）
  const STATS = [
    ['悟性', /^(zuo|ge|py|chenPY|chenZY|xuPY|xuZY|cwPY|cwZY|巳PY|巳ZY|申PY|申ZY|xiao|shangPY|shangZY|shayin|maoyou)$/],
    ['灵感', /^(shiling|kuigang|yin|taiji|tianyi)$/],
    ['孤独值', /^(hg|hg2|hgKong|guchen|guasu|tongzi|lone3|lone4)$/],
    ['鬼神缘', /^(gui|guiZhu|zi|tianmen|dihu|tu)$/],
    ['开窍运', /^(dyPY|dyPast|ln|dyTu)$/],
  ];
  // 大约一星三成、五星一成；悟性四成人是 0 分，所以一星多一些；开窍运 20 分以上就是正走偏印运，给满星
  const STAR_CUT = { 悟性: [1, 21, 33, 48], 灵感: [8, 13, 16, 20], 孤独值: [4, 10, 14, 23], 鬼神缘: [8, 14, 18, 26], 开窍运: [5, 8, 13, 20] };

  // 鉴定员批注的台词：按加分项，每项几版。{rz} 日柱 {dy} 现在的大运 {ln} 今年流年 {past} 走过的偏印运 {why} 这一项的说明 {pos} 年月日时
  const COMMENT = {
    zuo: ['偏印坐在你的日支上，悟性就睡在你枕边，半夜醒来都在开窍。', '自坐偏印：别人要去庙里求的悟性，你出厂就自带。'],
    ge: ['月令是偏印，偏印格的人天生爱钻冷门学问，越没人懂的你越来劲。', '偏印当令，悟性是你的出厂设置，不是后天补的课。'],
    py: ['盘里有偏印，看书总能看到字缝里去。', '偏印在，你学东西不走正门，专从侧门溜进去，还溜得最快。'],
    chenPY: ['辰是龙，偏偏又是你的偏印：最强偏印，龙都在给你打工。', '辰龙当你的偏印，这是玄学圈的 VIP 座位。'],
    chenZY: ['辰龙是你的正印，祖师奶奶给你留了一个正位。'],
    xuPY: ['戌主虚空，又是你的偏印，你的脑子自带一根连着宇宙的网线。'],
    xuZY: ['戌是虚空，又是你的正印，形而上的东西你听一遍就懂。'],
    cwPY: ['丑是和尚、未是道士，你的偏印坐在寺庙道观里，天生带点仙气。'],
    cwZY: ['丑是和尚、未是道士，又是你的正印，寺庙道观给你留了一个座位。'],
    巳PY: ['巳是蛇、是散仙，又是你的偏印，前世大概在山里修过几百年。'],
    巳ZY: ['巳是散仙，又是你的正印，修行这件事你有前世的底子。'],
    申PY: ['申是神，又是你的偏印，高维世界给你留了一条内线。'],
    申ZY: ['申是神，又是你的正印，神明给你开了一扇正门。'],
    xiao: ['偏印撞上食神，枭神夺食，一钻进玄学就忘了吃饭。', '枭神夺食：饭可以不吃，盘一定要排完。'],
    shangPY: ['伤官配偏印，脑子快、嘴又毒，算得准还说得狠。', '伤官配偏印，一边悟一边说，天生适合开直播讲玄学。'],
    shangZY: ['伤官配正印，聪明又有分寸，讲玄学讲得像上公开课。'],
    shayin: ['七杀生偏印，压力越大悟性越高，被逼一逼就开窍。', '杀印相生：别人被压垮的时候，你在偷偷长功力。'],
    maoyou: ['卯酉相冲又带偏印，灵感是一阵一阵撞出来的。'],
    tu: ['地支{why}：玄学人的地基你已经打好了。', '{why}，一般搞玄学的人，盘里都有土。'],
    hg2: ['年支、日支都查出华盖，双华盖的人，独处的时候灵感最多。', '双华盖：热闹是别人的，灵感是你的。'],
    hg: ['命带华盖，艺术和玄学两条路你都走得通。', '华盖在身，一个人待着的时候最灵。'],
    hgKong: ['华盖逢空亡，古书说宜僧道，你适合当那个看得最清的旁观者。'],
    shiling: ['{rz}日是十灵日，老师刚开口你就猜到下一句了。', '十灵日出生，第六感是出厂配置。'],
    kuigang: ['{rz}日是魁罡，脑子硬、判断快，算起来不拖泥带水。'],
    taiji: ['太极贵人在命，天生对神秘的东西好奇，越玄越想搞懂。'],
    tianyi: ['天乙贵人护着你，学玄学总能遇到肯教你的人。'],
    guchen: ['命里带孤辰，偶尔的孤独，是灵感进门的时候。'],
    guasu: ['命里带寡宿，一个人的夜晚，最容易接到信号。'],
    tongzi: ['命带童子煞，从小就比别人敏感，这份敏感就是天线。'],
    lone4: ['华盖、孤辰、寡宿、童子煞四颗全有，孤独星拉满：你不是不合群，是频道不一样。'],
    lone3: ['孤独星有三颗，在人群里你总像在走神，其实是在接收信号。'],
    tianmen: ['地支戌、亥都在，戌亥是天门，你家门口就开着一扇天门。'],
    dihu: ['地支辰、巳都在，辰巳是地户，地底下的消息你也收得到。'],
    yin: ['日干、时干都是阴干，你对看不见的东西特别敏感。'],
    gui: ['癸水通鬼神，你做的梦常常比现实先到。', '盘里有癸水，第六感比别人多一根天线。'],
    guiZhu癸丑: ['{pos}柱癸丑，从坟里爬出来的鬼，阴间也有你的熟人。'],
    guiZhu癸未: ['{pos}柱癸未，癸是鬼、未是道士，鬼都跟着道士修行，你也差不到哪去。'],
    zi: ['地支有子水，子是癸水的家，你的直觉常常半夜上线。'],
    dyPY: ['现在走{dy}偏印运，正在开窍，这十年学玄学事半功倍。', '{dy}运是偏印运，大运给你开了天眼，抓紧这十年。'],
    dyPast: ['以前走过{past}偏印运，开过窍的人，底子一直都在。'],
    ln: ['今年{ln}是你的偏印流年，灵感 buff 叠满，抓紧学。'],
    dyTu: ['现在走{dy}土运，土是玄学人的地基，正适合打底子。'],
  };

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
    else if (zi('辰', '正印')) add('chenZY', 10, '辰为正印', '辰是龙，又是你的正印', 1);
    if (zi('戌', '偏印')) add('xuPY', 15, '戌为偏印', '戌主虚空，又是你的偏印', 1);
    else if (zi('戌', '正印')) add('xuZY', 10, '戌为正印', '戌主虚空，又是你的正印', 1);
    // 土做印星都加分（10-23 谷雨：土为印要加分，偏印加更多）；丑未为正印原来不加，现在补上
    if (zi('丑', '偏印') || zi('未', '偏印')) add('cwPY', 10, '丑未为偏印', '丑是和尚、未是道士，又是你的偏印', 1);
    else if (zi('丑', '正印') || zi('未', '正印')) add('cwZY', 6, '丑未为正印', '丑是和尚、未是道士，又是你的正印', 1);
    for (const z of ['巳', '申']) {
      const what = z === '巳' ? '巳是蛇、是散仙' : '申是神，通高维';
      if (zi(z, '偏印')) add(z + 'PY', 12, z + '为偏印', what + '，又是你的偏印', 1);
      else if (zi(z, '正印')) add(z + 'ZY', 8, z + '为正印', what + '，又是你的正印', 1);
    }
    // 十神组合（天干透出的、地支本气都算）
    const all = [...[0, 1, 3].filter(i => tg[i]).map(i => tg[i]), ...zg];
    const cnt = s => all.filter(x => x === s).length;
    // 食神三个以上按伤官算（10-23 谷雨：食神超过两个，一般按伤官来算）
    const shiMany = cnt('食神') >= 3, shang = cnt('伤官') + (shiMany ? cnt('食神') : 0);
    if (cnt('偏印') && cnt('食神') && !shiMany) add('xiao', 8, '枭神夺食', '偏印、食神都有', 1);
    if (cnt('偏印') && shang) add('shangPY', 8, '伤官配偏印', (shiMany && !cnt('伤官') ? '食神' + cnt('食神') + '个，按伤官算；' : '') + '伤官、偏印都有', 1);
    else if (shang && cnt('正印') >= 2) add('shangZY', 5, '伤官配正印', '伤官配' + cnt('正印') + '个正印', 1);
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
    // 偏印运坐财：偏印在天干、地支是财，或者偏印在地支、天干是财——被财破了，分数减半（10-23 谷雨：不是不算，是扣分）
    const pyCai = gz => { const a = shishen(dm, gz[0]), z = shishen(dm, BQ[gz[1]]); return (a === '偏印' && isCai(z)) || (z === '偏印' && isCai(a)); };
    let dyNow = null, pastPY = '';
    const timeline = [];
    if (opts.dayun && opts.dayun.length) {
      dyNow = opts.dayun.filter(d => d.startYear <= year).pop() || null;
      if (dyNow) {
        const span = '（' + dyNow.startYear + '–' + (dyNow.startYear + 9) + '）';
        if (isPY(dyNow.gz)) {
          const broken = pyCai(dyNow.gz);
          add('dyPY', broken ? 10 : 20, '正走偏印运', '现在走' + dyNow.gz + '运' + span + '：' + pyWhere(dyNow.gz) + '是偏印，正在开窍' + (broken ? '；但坐财，被财破了一半' : ''), 1);
          dyNow.kind = '偏印运'; dyNow.broken = broken;
        }
        else if ('戊己'.includes(dyNow.gz[0]) || '辰戌丑未'.includes(dyNow.gz[1])) { add('dyTu', 5, '正走土运', '现在走' + dyNow.gz + '运' + span + '：土运'); dyNow.kind = '土运'; }
        dyNow.span = span;
        const past = opts.dayun.filter(d => d.startYear < dyNow.startYear && isPY(d.gz));
        pastPY = past.map(d => d.gz).join('、');
        const pastOk = past.some(d => !pyCai(d.gz));
        if (!dyNow.kind || dyNow.kind !== '偏印运') if (past.length) add('dyPast', pastOk ? 8 : 4, '走过偏印运', '以前走过' + pastPY + '偏印运，开过窍' + (pastOk ? '' : '；但坐财，被财破了一半'), 1);
      }
      // 开窍时间表：这辈子的偏印大运（虚岁 90 以前）
      const by = opts.birthYear;
      for (const d of opts.dayun) {
        if (by && d.startYear - by >= 90) break;
        if (!isPY(d.gz)) continue;
        const end = d.startYear + 9;
        timeline.push({ gz: d.gz, from: d.startYear, to: end, broken: pyCai(d.gz), age: by ? [d.startYear - by + 1, end - by + 1] : null, state: end < year ? '开过了' : d.startYear <= year ? '正在开' : '还没到' });
      }
    }
    const ln = GAN[((year - 4) % 10 + 10) % 10] + ZHI[((year - 4) % 12 + 12) % 12];
    if (isPY(ln)) add('ln', pyCai(ln) ? 4 : 8, '今年流年偏印', year + '年' + ln + '：' + pyWhere(ln) + '是偏印' + (pyCai(ln) ? '，但坐财' : ''), 1);

    items.sort((a, b) => b.n - a.n);
    const score = items.reduce((a, x) => a + x.n, 0);
    const benming = score - items.filter(x => /^(dyPY|dyPast|dyTu|ln)$/.test(x.key)).reduce((a, x) => a + x.n, 0);
    const wuShare = score ? items.filter(x => x.wu).reduce((a, x) => a + x.n, 0) / score : 0;
    // 隐藏款：总分 130 以上；或者本命已经有 71 分，现在又正走偏印运（坐财被破的不算）
    const gate = benming >= 71 && dyNow && dyNow.kind === '偏印运' && !dyNow.broken;
    const t = gate ? 0 : TIERS.findIndex(x => score >= x.min);
    const hasZY = [...tg, ...zg].includes('正印');
    const last = TIERS.length - 1;
    const school = t === 0 ? '' : (t === last ? hasZY : wuShare >= WU_CUT[t]) ? '悟性派' : '体质派';
    const card = t === 0 ? 0 : (t - 1) * 2 + 1 + (school === '悟性派' ? 0 : 1);
    const permille = RANK.length ? RANK[Math.min(score, RANK.length - 1)] : 0;
    const rank = Math.min(99.9, permille / 10);

    // 宜忌、批注：按八字挑一版
    const seed = GAN.indexOf(G[2]) + (has4 ? ZHI.indexOf(Z[3]) : 0) + GAN.indexOf(G[1]);
    const C = CARDS[card];

    // 灵力面板：五项各 1～5 颗星
    const stats = STATS.map(([n, re]) => {
      const v = items.filter(x => re.test(x.key)).reduce((a, x) => a + x.n, 0);
      return { n, v, star: 1 + STAR_CUT[n].filter(c => v >= c).length };
    });

    // 鉴定员批注：分数最高、有台词的三项，各说一句
    const fill = (t, x) => t.replace('{rz}', P[2]).replace('{dy}', dyNow ? dyNow.gz : '').replace('{ln}', ln).replace('{past}', pastPY).replace('{why}', x.why).replace('{pos}', x.label.slice(0, 1));
    const said = [];
    for (const x of items) {
      const lines = COMMENT[x.key === 'guiZhu' ? 'guiZhu' + P.find(p => p === '癸丑' || p === '癸未') : x.key];
      if (!lines) continue;
      said.push(fill(lines[(seed + said.length) % lines.length], x));
      if (said.length === 3) break;
    }
    const comment = said.length ? said.join('') : '盘里暂时没检出什么灵力，不过开窍时间表上写着它什么时候来。';

    // 拜师指南：生我者为印，印就是师父；同阴阳是偏印（教冷门绝学），异阴阳是正印（教正统功夫）。我生者为食伤，可以收作徒弟
    const W = '木火土金水', wi = wx(dm);
    const yinWx = W[(wi + 4) % 5], kidWx = W[(wi + 1) % 5];
    const gansOf = w => GAN.split('').filter(g => GAN_WX[g] === w);
    const [pyG, zyG] = gansOf(yinWx).sort((a, b) => (yy(a) === yy(dm) ? 0 : 1) - (yy(b) === yy(dm) ? 0 : 1));
    const master = { dm: dm + GAN_WX[dm], yinWx, py: pyG, zy: zyG, kid: gansOf(kidWx), kidWx };
    return {
      pillars: P, has4, dm, tg, zg,
      items, score, benming, gate, tier: TIERS[t], tierIndex: t, school, card, cardInfo: C,
      rank, talent: TIERS[t].talent, wuShare,
      yi: C.y[seed % C.y.length], ji: C.j[(seed + 1) % C.j.length],
      dyNow, timeline, ln, cai, yin, hurt,
      stats, comment, master,
    };
  }

  const api = { GAN, ZHI, BQ, GAN_WX, CARDS, TIERS, WU_CUT, STATS, STAR_CUT, parse, judge, shishen, shensha };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Xuanxue = api;
})(typeof window !== 'undefined' ? window : globalThis);
