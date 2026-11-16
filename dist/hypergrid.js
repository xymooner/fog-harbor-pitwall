/* The Fog Harbor invitational pairs WEC cars with the fictional gallery drivers.
 * Team IDs and race coefficients also identify and reproduce existing saved races.
 * A lower speed value reduces lap time; higher wetSkill reduces the rain penalty.
 * Lower care and effort reduce tyre wear and fatigue; load applies to the right rear.
 */
(function (scope) {
  'use strict';

  const frontHybrid = '后轴发动机驱动，前轴电机按规则介入';
  const rearHybrid = '后轮驱动，后轴混动';
  const entries = [
    {
      id:'arco', number:'6', name:'Porsche Penske Motorsport', driver:'汉娜·克罗尔', style:'直道末端择机进攻',
      brand:'Porsche', mark:'porsche', model:'Porsche 963', category:'LMDh', engine:'4.6 L 双涡轮增压 V8', layout:rearHybrid,
      source:'https://newsroom.porsche.com/en/press-kits/le-mans-2023/The-Porsche-963-banks-on-powerful-DNA-from-RS-Spyder-and-918-Spyder-.html',
      sideView:'https://www.fiawec.com/en/car/2025/6',
      story:'汉娜第一次替雾港的 6 号车收尾时，前一班只留给她一句“前车守内线”。她把交车时最想听的三个问题写在计时板背面。从那场起，新人也得照着那块板给她交班。',
      paddock:'维修区练交接时，有人把对手每圈的走线背得滚瓜烂熟。汉娜扶着他坐进车里，扣好肩带，又把计时板放回护墙。刚才在墙上看得清清楚楚的那个空隙，从座舱里只剩半个车头宽。',
      radioLines:[
        {speaker:'driver', trigger:'dryPush', text:'收到，干胎还有余量。直道末端那一下我自己找刹车点。'},
        {speaker:'engineer', trigger:'pushFatigue', text:'汉娜，连续追了三圈以上，疲劳也上来了。报一下你还想推几圈。'}
      ],
      strength:'基础配速快，干地开阔路段适合争位置。', weakness:'连续追击时疲劳积累较快，接近换胎窗口要留余力。',
      trait:'干地单圈快，连续追击易疲劳', speed:-0.23, wetSkill:0.62, care:1.02, load:1.03, effort:1.08, plan:[14,26]
    },
    {
      id:'meridian', number:'16', name:'Meridian GT', driver:'妮娜·贝兰迪', style:'雨战稳健',
      brand:'Ferrari', mark:'ferrari', model:'Ferrari 499P', category:'LMH', engine:'3.0 L 双涡轮增压 V6', layout:frontHybrid,
      source:'https://www.fia.com/news/wec-ferrari-499p-hypercar-breaks-cover',
      specSource:'https://assets.lemans.org/explorer/pdf/courses/2023/24-heures-du-mans/infos-course/liste-engages-24h-infos-course.pdf#page=71',
      story:'Meridian 最早在俱乐部耐力赛里只有一把雨伞。下雨时，机械师站在维修区口，车手在无线电里补报看不见的两个区段。妮娜进队后沿用了这份分工，16 号的雨情表上一直留着三格。',
      paddock:'第一次雾港雨测结束，妮娜拿着扳手就往车头走。机械师把笔递给她，请她先把哪个弯能踩油写下来。她在三个区段旁各画了一道水痕，最后一个弯画了两遍。',
      radioLines:[
        {speaker:'driver', trigger:'wetRun', text:'三个区段都湿透了。雨胎温度合适，出弯敢给油。给我一圈，我可以试着追。'},
        {speaker:'engineer', trigger:'dryingWet', text:'一区的干线出来了，三区还有水。妮娜，顾一下雨胎，回站前再报一次三区。'}
      ],
      strength:'三段都有积水，雨胎已进工作温度且余量充足时，妮娜可以试一圈追击。她的湿地配速受积水影响相对较小。', weakness:'整套轮胎消耗偏快，长雨段也要盯余量。',
      trait:'雨中稳健，长段耗胎偏快', speed:0.06, wetSkill:0.94, care:1.06, load:1.03, effort:0.97, plan:[15,25]
    },
    {
      id:'kessel', number:'64', name:'Kestrel Racing', driver:'玛拉·芬克', style:'偏早换胎',
      brand:'BMW', mark:'bmw', model:'BMW M Hybrid V8', category:'LMDh', engine:'4.0 L 双涡轮增压 V8', layout:rearHybrid,
      source:'https://www.bmw-m.com/en/fastlane/motorsport/race-cars/bmw-m-hybrid-v8.html',
      specSource:'https://newsroom.bmwgroup.com/global/the-heart-of-the-bmw-m-hybrid-v8-p663-eight-cylinder-hybrid-turbo-engine-drives-the-lmdh-prototype',
      story:'Kestrel 租过的第一间车库只够停一台车，模拟器架在隔壁办公室。玛拉常抱着电脑往返两边，给每次试车只留一道题。升到邀请赛后，64 号赛车的测试单还沿用那种一页只改一项的格式。',
      paddock:'早餐时玛拉借来三只碟子当赛段，把半勺水倒在中间那只。轮胎师刚要递雨胎的牌子，她用勺柄敲了敲两边的干碟子，说还得问问开车的人。',
      radioLines:[
        {speaker:'engineer', trigger:'dryStint', text:'右后比右前还多，玛拉。干地这一段可以照现在的节奏跑。'},
        {speaker:'driver', trigger:'s2Ahead', text:'二号区段光头胎已经踩进水里了，一区还浅些。把雨胎准备好。'}
      ],
      strength:'右后胎负荷较低，干地长段可以维持均衡配速。', weakness:'车手在积水段丢时较多，雨区扩大时应尽早评估换胎。',
      trait:'右后胎负荷低，积水时易丢秒', speed:-0.07, wetSkill:0.49, care:0.98, load:0.97, effort:1.01, plan:[14,24]
    },
    {
      id:'atlas', number:'31', name:'Atlas Sport', driver:'伊内丝·维达尔', style:'延长首段',
      brand:'Alpine', mark:'alpine', model:'Alpine A424', category:'LMDh', engine:'3.4 L 单涡轮增压 V6', layout:rearHybrid,
      source:'https://www.alpine-cars.co.uk/fia-wec/a424.html',
      story:'Atlas 刚来雾港时经费紧，第一套练习胎要从早晨一直用到午饭。伊内丝靠这套旧胎替车组跑出了整本长距离记录。后来有人赞助新胎，工程师还是会留一套磨过的给她做对照。',
      paddock:'莫德来借秒表，看见妹妹在胎架上给每套胎写了一个出站圈数。她随手遮住一个，让伊内丝猜。伊内丝瞄了一眼旁边胶带揭过两次的印子，连那天午饭吃晚了都说中了。',
      radioLines:[
        {speaker:'driver', trigger:'longStint', text:'这套过了十圈，四条胎都还剩六成以上。先留我在外面，把这个长段跑完。'},
        {speaker:'engineer', trigger:'closeAhead', text:'伊内丝，前车在一秒六以内。下一圈盯它出弯，咱们的基础圈速很难一下子追回这个差距。'}
      ],
      strength:'四轮磨耗慢，路况稳定时可以多留一圈。', weakness:'基础单圈偏慢，追同胎种的前车需要更长时间。',
      trait:'轮胎适合长段，基础配速较慢', speed:0.15, wetSkill:0.72, care:0.89, load:1.01, effort:0.97, plan:[16,26]
    },
    {
      id:'vela', number:'52', name:'Vela Racing', driver:'泰丝·纳瓦罗', style:'激进进攻',
      brand:'Cadillac', mark:'cadillac', model:'Cadillac V-Series.R', category:'LMDh', engine:'5.5 L 自然吸气 V8', layout:rearHybrid,
      source:'https://www.cadillac.com/racing/wec',
      specSource:'https://news.cadillac.com/newsroom.detail.html/Pages/news/us/en/2023/jan/0112-lmdh.html',
      story:'Vela 的第一批雾港参赛者白天都得上班，只订得起晚场测试。泰丝替大家把每个难找的刹车点录成了语音。如今 52 号进了邀请赛，守夜的机械师还用第一盘录音给新人认赛道。',
      paddock:'有次新人放出一段很漂亮的快圈，问泰丝该留哪几秒。她把游标往后拖，停在下一圈的后胎温度上。两段录音从此挨着存，一段叫“怎么追”，另一段叫“追完以后”。',
      radioLines:[
        {speaker:'driver', trigger:'dryPush', text:'干胎有余量。这一圈我来压，冲线时把右后温度念给我听。'},
        {speaker:'engineer', trigger:'hotRightRear', text:'泰丝，右后超过工作温度了。下一圈出弯给油缓一点，把这条胎带回来。'}
      ],
      strength:'基础配速快，胎况良好时适合争夺空档。', weakness:'右后胎负荷偏高，连续进攻时要观察温度和余量。',
      trait:'基础配速快，右后胎负担重', speed:-0.21, wetSkill:0.61, care:1.02, load:1.11, effort:1.03, plan:[15,25]
    },
    {
      id:'warspite', number:'27', name:'Warspite Racing', driver:'莫德·维达尔', style:'顺滑控胎',
      brand:'Peugeot', mark:'peugeot', model:'Peugeot 9X8', category:'LMH', engine:'2.6 L 双涡轮增压 V6', layout:frontHybrid,
      source:'https://peugeot-sport.com/wp-content/uploads/2024/11/fiche-technique-2024-9x8-1.pdf',
      story:'Warspite 最早带着 W27 在雾港跑 GT3。换到 9X8 的第一次长测，莫德请原班轮胎工留下，把右后胎每五圈的余量写在旧计时板上。那块板跟着 27 号一起搬进了邀请赛车库。',
      paddock:'伊内丝过来还秒表时，看见姐姐的四只旧胎排得整整齐齐，便把右后胎滚到了最左边。莫德正跟人说话，伸手把磨得最薄的那只滚回原位，连头都没回。',
      radioLines:[
        {speaker:'driver', trigger:'longStint', text:'这套跑够十圈了。四条胎都还有六成，我再留一圈。妹妹的圈速等会儿报，先报右后。'},
        {speaker:'engineer', trigger:'rrWorn', text:'莫德，右后余量到四成半以下了，比右前还少。出弯别急着给满油。'}
      ],
      strength:'莫德的控胎能降低四轮磨耗，长段可保留进站选择。', weakness:'右后胎承受四轮中最大的负荷，追击前先看这条胎。',
      trait:'顺滑控胎，右后胎负荷最高', speed:0.01, wetSkill:0.72, care:0.93, load:1.14, effort:0.96, plan:[15,26]
    },
    {
      id:'vector', number:'81', name:'TF Sport', driver:'乔·布鲁克斯', style:'车流中守线',
      brand:'Corvette', mark:'corvette', profile:'gt-corvette-81', model:'Corvette Z06 GT3.R', category:'LMGT3', engine:'5.5 L 自然吸气 V8', layout:'中置发动机，后轮驱动',
      source:'https://www.chevrolet.com/motorsports/corvette-racing',
      specSource:'https://corvetteracing.com/vehicle-info/',
      sideView:'https://www.fiawec.com/en/car/2025/81',
      story:'乔头一回把 81 号开进雾港邀请赛，就请原型车手来听自己的车载录音。两边听到的提示常常晚半拍。那次碰头以后，这支雾港车组把“后车离多远”列成单独一项，每次先报间隔，再报车号。',
      paddock:'泰丝替乔在后视镜的照片上点了两下。乔只认得前面那台车的灯，放大以后才找到后面露出的一角。第二天 81 号的挡风玻璃上贴着张便签，上面只写了一个“几台”。',
      radioLines:[
        {speaker:'driver', trigger:'closeBehind', text:'后车不到一秒，我看到了。我守这条线，你盯它后面还有谁。'},
        {speaker:'engineer', trigger:'usedSet', text:'最薄的那条胎剩不到一半了，乔。把最好的一次追击留给进站前。'}
      ],
      strength:'基础配速和湿地适应性都靠前，可以在雨中发起短攻。', weakness:'耗胎偏高，准备进站前再集中追击更合适。',
      trait:'雨中短段快，轮胎消耗大', speed:-0.10, wetSkill:0.82, care:1.10, load:1.05, effort:1.04, plan:[15,24]
    },
    {
      id:'north', number:'83', name:'Northline', driver:'八木澄', style:'耐力节奏',
      brand:'Toyota', mark:'toyota', model:'Toyota TR010 HYBRID', category:'LMH', engine:'3.5 L 双涡轮增压 V6', layout:frontHybrid,
      source:'https://media.toyota.co.uk/new-look-toyota-racing-mark-a-hybrid-milestone/',
      story:'Northline 以前替俱乐部车队做长距离测试。车队第一次拿到雾港正赛名额时，澄把练习单折掉了最快圈那一栏，只留下首圈和最后一圈。83 号每次试车收工，两组数字至今都要一起念。',
      paddock:'一本红皮簿子被落在工程车里。轮胎师想凭笔迹认领，翻了几页却发现每一页的右半边都换个人写。澄来取本子的时候，顺手请他在今天那页补上收车时的四个胎温。',
      radioLines:[
        {speaker:'engineer', trigger:'gapAhead', text:'澄，前车已经在三秒以外。先盯分段差，咱们追回来得花几圈。'},
        {speaker:'driver', trigger:'lateReserve', text:'到后段了，我手上还有劲。四条胎也都过半，把前后间隔报给我，我还能追。'}
      ],
      strength:'相同配速下疲劳上升较慢，后段仍能安排追击。', weakness:'基础单圈偏慢，前车拉开后很难在一两圈内追回。',
      trait:'长段体力佳，基础配速较慢', speed:0.13, wetSkill:0.68, care:0.96, load:1.02, effort:0.84, plan:[16,25]
    }
  ];

  for (const entry of entries) {
    Object.freeze(entry.plan);
    entry.radioLines.forEach(Object.freeze);
    Object.freeze(entry.radioLines);
    Object.freeze(entry);
  }
  scope.HyperGrid = Object.freeze({
    entries:Object.freeze(entries),
    seasonSource:'https://www.fiawec.com/en/car/2026'
  });

  function timingCar(brand, model, profile, mark) {
    const prefix = brand + ' ';
    const displayModel = model.startsWith(prefix) ? model.slice(prefix.length) : model;
    return Object.freeze({brand, model, displayModel, profile, mark});
  }

  const invitationalCars = new Map(entries.map(({brand, model, mark, profile}) =>
    [model, timingCar(brand, model, profile || 'hyper-' + mark, mark)]));

  // The same fictional GT3 teams contest both full-distance and sprint races.
  // Their timing snapshots carry team IDs; the original W27 is Warspite's own car.
  const gtCars = new Map([
    ['arco', timingCar('Aston Martin', 'Aston Martin Vantage GT3', 'gt-aston', 'aston')],
    ['meridian', timingCar('Ferrari', 'Ferrari 296 GT3', 'gt-ferrari', 'ferrari')],
    ['kessel', timingCar('BMW', 'BMW M4 GT3 EVO', 'gt-bmw', 'bmw')],
    ['atlas', timingCar('Porsche', 'Porsche 911 GT3 R', 'gt-porsche', 'porsche')],
    ['vela', timingCar('Corvette', 'Corvette Z06 GT3.R', 'gt-corvette', 'corvette')],
    ['warspite', timingCar('Warspite', 'W27 GT3', 'gt-warspite', null)],
    ['vector', timingCar('McLaren', 'McLaren 720S GT3 Evo', 'gt-mclaren', 'mclaren')],
    ['north', timingCar('Lexus', 'Lexus RC F GT3', 'gt-lexus', 'lexus')]
  ]);

  function forStanding(car) {
    const identity = car.model ? invitationalCars.get(car.model) : gtCars.get(car.id);
    return identity || {brand:'', model:car.model || '', displayModel:car.model || '', profile:null, mark:null};
  }

  scope.PitwallCars = Object.freeze({forStanding});
})(typeof window !== 'undefined' ? window : globalThis);
