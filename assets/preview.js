(() => {
 const $=s=>document.querySelector(s);let context='clean',state='',calendarState={},calendarChoices={};
 const docs={
  "clean": [
    "Security",
    "管理 Safari 的广告、弹窗、跟踪器、恶意网站和挖矿内容拦截，并进入 Calendar Clean、SafeSMS 和 SafeCall。",
    [],
    "保护范围是 Safari 内容拦截；只有系统扩展启用且所选规则成功生效，才显示保护开启。",
    [
      "进入主界面后默认打开 Security。点击单项开关→保存并更新对应保护；未完成系统设置时进入教程。更新失败保留旧配置，重试最近修改。",
      "首页主开关在开启时进入关闭确认，全关时开启；中央盾牌在部分开启时打开管理、全开时打开关闭确认、未设置时打开教程。取消保持原配置。",
      "五项开启数为0、1–4、5时分别对应关闭、部分、全部开启；系统授权和配置更新成功后才确认保护生效，未知不能算已开启。",
      "点击 Setup Guide 查看设置教程；点击 Calendar Clean、SafeSMS、SafeCall进入对应功能，返回保留配置。",
      "点击 Settings 打开独立设置页，提供 Membership、Change Passcode、About、Privacy Policy 和 Terms of Use；返回回来源页面。"
    ],
    [
      [
        "待设置",
        "显示设置入口；五项保护在完成设置前不显示已生效。"
      ],
      [
        "保护状态",
        "根据实际生效的五项配置显示关闭、部分开启或全部开启。"
      ],
      [
        "更新中",
        "显示处理中，暂不可重复修改。"
      ],
      [
        "更新失败",
        "保留上次成功配置，可重试；无法确认系统状态时显示未知。"
      ],
      [
        "管理与关闭确认",
        "管理面板提供单项、全部开启与全部关闭；关闭前允许确认或取消。"
      ]
    ]
  ],
  "web": [
    "Browsing Protection",
    "指导用户在系统设置启用 Safari 内容拦截。",
    [],
    "",
    [
      "进入从第1步开始；点击分页或左右滑动切换；步骤号为当前序号/4，前台每2.2秒轮播。离开或进入后台停止，减少动态时不自动播放。",
      "按步骤找到 Apps→Safari→Extensions→本应用并开启。点击教程图片不改变系统设置。",
      "返回回来源页面；Open Settings成功后返回Clean顶部，失败留在教程重试。",
      "回到应用后重新确认扩展和规则状态；浏览教程或点打开设置本身不代表保护已开启。"
    ],
    [
      [
        "教程",
        "四步图片、目标位置提示、分页与 Open Settings。"
      ],
      [
        "打开设置",
        "按钮处理中，避免重复点击。"
      ],
      [
        "打开失败",
        "保留当前步骤，显示重试。"
      ]
    ]
  ],
  "sms": [
    "SafeSMS",
    "管理陌生 SMS/MMS 的本地分类规则，并指导用户在系统信息应用查看结果。",
    [],
    "系统启用状态无法由本页直接确认；分类范围为陌生SMS/MMS，不包含iMessage。",
    [
      "Get Started进入设置教程；Filter Rules进入规则页；Where to Find Messages进入查看指引；返回Clean。",
      "至少一类规则开启时显示Rules enabled，两类都关时显示Rules off；它表示规则配置，不表示系统扩展已经启用。",
      "适用短信到达时按已保存规则分类，结果由系统信息应用展示；关闭两类规则后放行。",
      "规则保存后保留，重新进入继续使用；设置入口用于指导用户手动选择过滤器。"
    ],
    [
      [
        "首次使用",
        "用途介绍与 Get Started。"
      ],
      [
        "规则已配置",
        "显示规则开启或关闭，可进入 Filter Rules 和查看指引。"
      ],
      [
        "配置异常",
        "保留上次成功规则，提供错误反馈与重试。"
      ]
    ]
  ],
  "sms-rules": [
    "Filter Rules",
    "分别管理可疑短信与推广短信的分类规则。",
    [],
    "",
    [
      "切换规则→保存成功后更新SafeSMS首页；失败重试最近修改；返回保留已保存配置。",
      "可疑短信依据组合线索判断，例如诱导领奖、账户紧急处理配合外链或索要付款、密码、验证码；普通链接、单个关键词或正常验证码不单独判为垃圾。",
      "推广短信依据优惠、销售等组合内容分类；两类同时命中优先归为可疑短信。",
      "无命中或相应规则关闭时放行；内容不足或无法完成判断时保留未知结果。分类后短信仍保留在系统信息应用中。"
    ],
    [
      [
        "规则列表",
        "两类独立开关及分类说明；全部关闭时提示未选择分类。"
      ],
      [
        "保存中",
        "暂时禁用重复修改。"
      ],
      [
        "保存失败",
        "恢复上次成功值，保留重试入口。"
      ]
    ]
  ],
  "sms-find": [
    "Message Guide",
    "指导用户在系统信息应用查看过滤分类与处理误判。",
    [],
    "本页不读取短信历史、过滤数量或系统内操作结果。",
    [
      "按1–3顺序进入系统信息应用查看分类；分类为空时无需操作。",
      "误判时使用系统提供的恢复或移回操作；本页不代替系统移动短信。",
      "Done或返回回SafeSMS，保留规则。"
    ],
    [
      [
        "查看指引",
        "展示打开Messages、进入Filters、选择分类三个步骤。"
      ]
    ]
  ],
  "call": [
    "SafeCall",
    "管理用户指定的阻止号码，并查看来电过滤设置状态。",
    [],
    "此功能不提供实际拦截次数或通话历史。",
    [
      "进入或从系统设置返回后重新查询；失败点击Try Again重查。",
      "Block List进入号码名单；Open Settings进入教程；返回Clean。",
      "系统启用、名单保存和名单同步分别确认；空名单不表示已经阻止任何号码。"
    ],
    [
      [
        "状态查询",
        "显示查询中，保留设置入口。"
      ],
      [
        "已启用或未启用",
        "根据实际状态显示；可查看Block List或打开设置教程。"
      ],
      [
        "无法确认",
        "显示未知及重试，保留名单。"
      ]
    ]
  ],
  "call-list": [
    "Block List",
    "查看并管理手动添加的阻止号码。",
    [],
    "",
    [
      "Add Number进入输入页；返回SafeCall保留已保存名单。",
      "Edit→Remove→确认后保存并同步；取消保持原名单。删除最后一个号码也要同步空名单。",
      "等待设置时先开启扩展再重试；同步失败重试最新名单，不能把本地保存当作系统已加载。",
      "号码按规范国际格式去重，每个有效号码只保留一次；名单变化不生成拦截次数。"
    ],
    [
      [
        "空名单",
        "显示添加号码入口。"
      ],
      [
        "号码列表",
        "显示保存的号码；Edit进入移除模式，Done结束编辑。"
      ],
      [
        "移除确认",
        "展示目标号码，允许Remove或Cancel。"
      ],
      [
        "同步中",
        "显示处理中，避免重复新增或移除。"
      ],
      [
        "同步结果",
        "成功后显示已同步；未启用或失败时保留名单与重试，说明旧名单可能仍生效。"
      ]
    ]
  ],
  "call-add": [
    "Add Number",
    "输入国家区号和电话号码，校验后加入阻止名单。",
    [],
    "",
    [
      "选择区号后输入号码；以+开头的完整国际号码使用其自带区号，其他号码拼接所选区号。空格、括号与连字符不影响重复判断。",
      "输入要求区号1–3位且首位非0，完整号码为+后7–15位数字；这只检查格式，不证明号码真实可拨通。",
      "Add Number校验并保存；返回Block List放弃未提交输入，已保存号码保持。"
    ],
    [
      [
        "输入",
        "地区、号码和添加按钮；空输入不可提交，Other可自填区号。"
      ],
      [
        "输入错误",
        "格式错误或重复号码时保留输入并提示修改。"
      ],
      [
        "保存结果",
        "成功回名单并开始同步；保存失败留在输入页重试。"
      ]
    ]
  ],
  "sms-guide": [
    "SafeSMS · 设置教程",
    "指导用户在系统设置完成SafeSMS所需设置。",
    [],
    "",
    [
      "进入从第1步开始；步骤号为当前序号/4，每2.2秒轮播。点击分页或左右滑动切换；后台、离开及减少动态时停止自动播放。",
      "按路径Apps→Messages→Unknown & Spam→选择过滤器手动完成设置；教程图片与分页本身不授予权限。",
      "返回回SafeSMS；打开设置失败时留在教程，可重试。",
      "返回后保留短信规则配置；打开设置不代表过滤器已经启用。"
    ],
    [
      [
        "教程",
        "四步图片、分页与Open Settings。"
      ],
      [
        "打开设置",
        "避免重复点击；失败时保留当前步骤并允许重试。"
      ]
    ]
  ],
  "call-guide": [
    "SafeCall · 设置教程",
    "指导用户在系统设置完成SafeCall所需设置。",
    [],
    "",
    [
      "进入从第1步开始；步骤号为当前序号/4，每2.2秒轮播。点击分页或左右滑动切换；后台、离开及减少动态时停止自动播放。",
      "按路径Apps→Phone→Call Blocking & Identification→开启扩展手动完成设置；教程图片与分页本身不授予权限。",
      "返回回SafeCall；打开设置失败时留在教程，可重试。",
      "从系统设置返回后重新查询来电过滤状态；无法确认时显示未知，可重试。"
    ],
    [
      [
        "教程",
        "四步图片、分页与Open Settings。"
      ],
      [
        "打开设置",
        "避免重复点击；失败时保留当前步骤并允许重试。"
      ]
    ]
  ],
  "calendar-guide": [
    "Calendar Clean · 权限教程",
    "指导用户在系统设置完成Calendar Clean所需设置。",
    [],
    "",
    [
      "进入从第1步开始；步骤号为当前序号/4，每2.2秒轮播。点击分页或左右滑动切换；后台、离开及减少动态时停止自动播放。",
      "按路径Privacy & Security→Calendars→本应用→Full Access手动完成设置；教程图片与分页本身不授予权限。",
      "返回回Calendar Clean；打开设置失败时留在教程，可重试。",
      "从系统设置返回后重新确认日历权限，由用户再次发起扫描；权限不足时保留说明和设置入口。"
    ],
    [
      [
        "教程",
        "四步图片、分页与Open Settings。"
      ],
      [
        "打开设置",
        "避免重复点击；失败时保留当前步骤并允许重试。"
      ]
    ]
  ],
  "calendar": [
    "Calendar Clean",
    "检查过去90天内日历事件中的链接、推广和重复线索，由用户确认要删除的事件。",
    [],
    "90天按日历日还是固定小时计算仍待确定。规则命中是复核线索，不等于事件必然有害；真实日历操作以系统授权与回执为准。",
    [
      "Scan Calendar先检查授权；允许后扫描，以扫描开始时间为截止排除未来事件。拒绝时去设置，返回后重新确认，由用户再次扫描。",
      "已检查数是本轮完成检查的事件数；总数已知时进度=已检查数÷总数×100%，未知总量只显示处理中。取消或扫描中返回停止本轮，重新扫描重新读取。",
      "点击分类只筛选展示并保留跨分类选择；Select All只选择当前分类可删除项，再点取消当前分类选择。一个事件多条线索只计1次。",
      "点击正文进详情，选择或返回后保留列表筛选；选择数为跨分类可删除事件数，零选择时删除不可用。",
      "Delete Selected显示具体日期和日历；取消保留选择，确认仅删除选定发生项。删除中防重复提交；内容变化需重新确认，已不存在项不算本次删除。",
      "删除数仅计算成功提交的事件，成功项从结果移除；失败项保留并只对未完成项重试。查看剩余回列表，Done回Clean更新剩余数量。"
    ],
    [
      [
        "准备扫描",
        "显示范围、分类与Scan Calendar；进入页面不自动请求权限。"
      ],
      [
        "授权说明",
        "扫描时请求完整访问；拒绝后提供设置入口，系统限制时显示不可用原因。"
      ],
      [
        "扫描中",
        "显示已检查数量与进度，可取消。"
      ],
      [
        "扫描结果",
        "显示匹配列表、分类、选择与删除；无事件与有事件但无匹配分别说明。"
      ],
      [
        "事件详情",
        "显示标题、日期、所属日历、重复规则与命中原因；只读事件可查看但不能选择删除。"
      ],
      [
        "删除确认与结果",
        "确认具体事件及仅本次发生；成功显示实际删除数，部分失败保留失败项重试。"
      ],
      [
        "失败或取消",
        "说明原因，提供重新扫描或设置入口；失败不当作空结果。"
      ]
    ]
  ],
  "test": [
    "Test",
    "集中提供三项性能测试与Link、QR Code、Wi-Fi和Device四项安全检查。",
    [],
    "",
    [
      "点击卡片进入对应功能，返回回Test。各项测试与安全检查结果独立。",
      "Speed摘要取下载Mbps，CPU取多核M ops/s，Display取平均FPS；完成后更新，失败或未完成不覆盖上次结果。",
      "清空某项历史后仅该项恢复Not tested，缺失数据不填0或算安全。"
    ],
    [
      [
        "工具列表",
        "显示各项入口；没有完成记录时显示Not tested。"
      ],
      [
        "最近结果",
        "三项性能卡分别展示最近一次完整结果。"
      ]
    ]
  ],
  "speed": [
    "Speed",
    "依次测量延迟、抖动、下载、上传和网页响应，并展示分阶段速度曲线。",
    [],
    "缺失或无效测量不显示为0或安全；正式测速服务、测量时长、延迟/抖动统计口径、网页响应起止与显示精度仍待确定。",
    [
      "进入自动开始。下载和上传横轴为本阶段经过的秒数，纵轴为Mbps；下载切上传从0秒开始新曲线，阶段结束后冻结对应曲线。",
      "每秒采集新增有效传输字节数与实际时间窗秒数。速率Mbps=新增有效字节数×8÷实际时间窗秒数÷1,000,000；速度升高曲线上移、降低下移。",
      "无样本、请求失败、取消或切网导致的无效区间留空并断开连线；只有有效时间窗确实传输了0字节才画0。",
      "阶段结果Mbps=有效总字节数×8÷总有效耗时秒数÷1,000,000。延迟、抖动、网页响应独立显示ms，不加入Mbps曲线；进度依据实际任务完成情况。",
      "Test Again开启新一轮；返回或进入历史停止当前测试。历史详情保留当次结果和时间；返回回历史。仅完整结果保存，超50条移除最旧记录。",
      "Clear History确认后只清空Speed；取消保留，保存失败不得报保存完成。"
    ],
    [
      [
        "测试中",
        "显示当前阶段；未测指标留空，下载和上传分别显示独立Mbps曲线。"
      ],
      [
        "完整结果",
        "展示五项指标，可重测或查看历史。"
      ],
      [
        "历史记录",
        "按完成时间展示最近50条，点击查看详情；清空需确认且仅影响本项。"
      ],
      [
        "失败或取消",
        "停止采样，保留错误和Retry；未完成结果不保存。"
      ]
    ]
  ],
  "cpu": [
    "CPU Test",
    "先测单核再测多核，展示处理速度、峰值、耗时和工作任务。",
    [],
    "不同工作任务的分数不能直接比较；工作负载、采样窗口、峰值范围与结果聚合方法仍待确定。",
    [
      "进入自动开始；切换单核/多核时重新绘制当前阶段曲线；返回、进入历史或后台时停止本轮，重试重新开始。",
      "M ops/s表示每秒完成的百万次约定操作，=有效操作数÷有效秒数÷1,000,000；Elapsed单位秒，Peak为有效采样峰值。工作负载、采样窗口、峰值范围与结果聚合仍待确定。",
      "完成结果保存并更新首页多核值；历史按时间从新到旧最多50条，详情不重新测量。清空只影响CPU且需确认，取消保留；保存失败提供重试，不提示保存完成。"
    ],
    [
      [
        "测试中",
        "按单核、多核阶段展示曲线；未完成指标等待结果。"
      ],
      [
        "完整结果",
        "展示单核、多核、Peak、Elapsed与Workload，可重测。"
      ],
      [
        "历史",
        "最近50条完整记录，可查看详情或确认清空。"
      ],
      [
        "失败或停止",
        "可重试，未完成结果不保存。"
      ]
    ]
  ],
  "display": [
    "Display Test",
    "展示帧率、屏幕刷新率能力、平均帧率、帧间隔与耗时。",
    [],
    "刷新率能力与实际帧率分别显示；采样窗口、平均方法及可变刷新率处理仍待确定。",
    [
      "进入自动开始；返回、进入历史或后台停止本轮；重测清空当前过程并重新采样。",
      "FPS按有效帧数÷实际秒数计算；曲线随有效帧率升降。屏幕最高刷新率Hz与实测FPS分开，读取不到时显示Unavailable。",
      "平均帧率、帧间隔和耗时使用同一轮有效测量；采样窗口、平均方法及可变刷新率处理待确定，不凭固定数字推断设备上限。",
      "完整结果保存后首页更新平均FPS；历史按完成时间最多50条。清空仅影响Display，取消保持原记录；失败不覆盖完整旧结果。"
    ],
    [
      [
        "测试中",
        "按有效采样更新曲线，未测指标等待结果。"
      ],
      [
        "完整结果",
        "展示FPS、Hz、平均值、帧间隔ms和耗时s，可重测。"
      ],
      [
        "历史",
        "最近50条完整记录，可查看详情或确认清空。"
      ],
      [
        "失败或停止",
        "提供重试，不保存未完成结果。"
      ]
    ]
  ],
  "link": [
    "Link Check",
    "检查输入网址的域名信誉，帮助判断已知风险。",
    [],
    "仅检查域名信誉，不代表网页内容、重定向及所有风险均已检查。",
    [
      "输入完整http/https网址并提交；最多8192字符。查询完成即显示结果，不自动打开目标网址。",
      "命中风险名单时提示风险；未命中只能表示当前来源未报告，过期或不可用时显示无法判断。",
      "日期是信誉数据的来源日期；数据超过有效期时提示无法判断，不以旧数据作当前安全保证。正式更新频率与有效期仍待确定。",
      "Check Again重新查询；返回Test结束本次查看，结果不加入性能历史。"
    ],
    [
      [
        "输入",
        "网址与Check Link；无效地址提示修改并保留输入。"
      ],
      [
        "检查中",
        "显示处理中，避免重复提交。"
      ],
      [
        "检查结果",
        "展示风险、未发现已知风险或无法判断，并说明域名、来源和日期。"
      ],
      [
        "失败",
        "保留重试入口，不能把查询失败显示为安全。"
      ]
    ]
  ],
  "qr": [
    "QR Code",
    "通过相机或选图读取二维码；网址继续检查，其他内容供查看与复制。",
    [],
    "",
    [
      "进入申请相机；Upload Image选择图片，取消保留原结果，选中新图后停止取景并解析。单图最多20MB、2400万像素，超限提示换图。",
      "识别成功停止取景；有效http/https网址自动执行Link Check，其他内容仅展示，不执行其指令。网址风险、未知与未发现已知风险按来源独立判断。",
      "Copy成功提示Copied，失败可手动复制；Scan Again重新取景，Check Again重查网址。",
      "返回或后台释放相机；前台由用户点击重扫。相机设置指引本身不授予权限。"
    ],
    [
      [
        "取景",
        "显示相机窗口和上传入口；无法使用相机时仍可上传。"
      ],
      [
        "读取中",
        "显示处理状态，避免重复提交。"
      ],
      [
        "结果",
        "网址展示独立信誉结论，其他内容提供Copy。"
      ],
      [
        "失败或暂停",
        "拒绝授权、无二维码、读图失败或后台暂停时提示原因，可重扫或换图。"
      ]
    ]
  ],
  "wifi": [
    "Wi-Fi Check",
    "分别检查加密连接、HTTPS降级与内容完整性。",
    [],
    "结论仅适用于本次受控测试连接；正式测试服务与判定口径仍待确定。",
    [
      "进入或Check Again发起本轮检查；重复提交在处理中不可用；返回Test结束查看。",
      "任一项有风险则提示风险；无风险但有缺失项时提示无法完成；只有所有项有有效通过结果才能说明本轮未发现已知风险。",
      "缺失数据不算通过，也不换算安全百分比；更换网络后重新检查。"
    ],
    [
      [
        "检查中",
        "三项独立等待与更新结果。"
      ],
      [
        "检查结果",
        "展示每项通过、风险或Unavailable；风险说明原因与建议。"
      ],
      [
        "未连接或失败",
        "显示原因与Retry，已读结果保持独立。"
      ]
    ]
  ],
  "device": [
    "Device Security",
    "分别查看系统版本和锁屏密码状态。",
    [],
    "系统版本更新情况由系统设置确认；无法读取设备状态时不生成安全结论。",
    [
      "进入或Check Again重新查询；一项缺失不影响另一项的有效结果，也不能被当作安全。",
      "系统版本按读取到的完整文本显示，不转成安全评分；密码明确设置才显示Enabled，明确未设置显示Not set，其他情况为Unavailable。",
      "Settings guide查看操作路径；Back to results返回并重新查询；返回Test。"
    ],
    [
      [
        "检查中",
        "两项独立等待结果。"
      ],
      [
        "检查结果",
        "版本文本与Enabled/Not set；读不到的项目单独显示Unavailable。"
      ],
      [
        "设置指引",
        "展示系统更新和密码设置路径，可返回结果。"
      ],
      [
        "失败",
        "说明无法读取，提供Retry。"
      ]
    ]
  ],
  "vault": [
    "Vault",
    "使用中性六位密码入口打开对应相册，管理照片与视频。",
    [],
    "只有验证成功才能查看对应内容；锁定后再次访问需要重新验证。保存失败保留已有资料，不以空目录替代读取失败。",
    [
      "密码固定六位数字，圆点随输入数量0–6变化；Delete删除末位，输入完整才能提交，确认不一致重新输入。备用密码不能与主密码相同；跳过后进入主相册。",
      "相同解锁入口按输入密码打开各自内容；右上锁、切离Vault或进入后台时锁定，重新查看需验证。连续5次错误后等待30秒再试；成功后清零。",
      "每相册数量为成功保存的照片和视频条数，每项计1；新建相册为0，导入成功后更新，失败不增加。不同密码对应的相册内容和数量各自独立。",
      "新建或改名去除首尾空白；名称最多60字符，同一空间不允许忽略大小写后的重名。取消不修改；保存成功才更新列表。",
      "Add Media选择相册和图片/视频，每项最多40MB；合格项保存后显示，失败可重试；取消不修改原媒体。锁定会结束未提交操作，已保存内容保留。",
      "相册返回列表保留已保存内容；视频按实际媒体时长显示进度，播放时推进、暂停时停止，拖动进度可定位。"
    ],
    [
      [
        "首次设置",
        "介绍→Two Ways In→主密码设置与确认；可选设置不同备用密码或跳过。"
      ],
      [
        "锁定与解锁",
        "六位输入；验证中避免重复操作，错误可重试，成功只打开匹配密码的内容。"
      ],
      [
        "相册列表",
        "显示名称、封面与媒体数量，可新建相册、导入或锁定。"
      ],
      [
        "相册内容",
        "显示照片/视频，空相册可Add Media；菜单可改名。"
      ],
      [
        "新建、改名与导入",
        "校验后保存；失败保留旧内容并提示重试，部分文件跳过时说明。"
      ]
    ]
  ],
  "privacy": [
    "Privacy",
    "提供照片隐私扫描、遮盖编辑和照片信息清理。",
    [],
    "",
    [
      "点击入口开始新任务；副本返回父流程，处理中返回取消处理；退出有照片的任务需确认放弃，重入为空。只处理用户选择的照片，保留原图和已保存副本。",
      "选图与读取权限以系统实际允许的范围为准，不能据选择一张图片推断已获整个相册权限。"
    ],
    [
      [
        "功能入口",
        "Privacy Scan、Auto Redact、Metadata Clean三个工具。"
      ]
    ]
  ],
  "scan": [
    "Privacy Scan",
    "使用 OCR 定位照片中的文字和数字，在识别到的敏感内容（如电话号码、邮箱、证件号、车牌号）上自动添加遮盖框。用户可逐张复核、调整后导出副本，原图不变。",
    [],
    "各检测类型分别确认是否完成；任一类型未完成不能报告全部未发现。识别可能遗漏，用户应复核候选并可手工补充遮盖。",
    [
      "选择最多12张静态照片，每张最多20MB、2400万像素；选择后点Scan Photos。取消文件选择保留原批次；新批次有可读照片才替换旧照片、遮盖、确认和输出；全部无效保留当前工作。",
      "照片分组优先级为Confirmed→Found→No findings→Incomplete。用户确认优先；未确认且有候选归Found，即使部分类型未完成仍需复核；只有支持的检测项目均完成且零候选才归No findings；零候选且任一类型未完成归Incomplete。",
      "每张照片只计一次，四组数量之和等于本批接受的照片总数；Incomplete 5表示5张照片，不是5个隐私项。被跳过文件不计入，接受但读图失败的照片计入Incomplete。确认不代表所有类型都检查成功。",
      "点分组→单张复核；编辑后撤销该照片的确认，需再次Confirm Photo；返回询问Discard Edits或Keep Editing；放弃清除当前照片编辑并回批次，其他照片不变。手工遮盖不受自动识别类型限制。",
      "扫描和导出中的i of N表示本轮正在处理第i张、共N张；重试单张时N=1。取消停止本轮，已完成结果保留，未完成照片不能变成无发现。",
      "导出数量以成功生成的副本为准：一张为PNG，多张打包ZIP；部分失败仍可保存成功副本，返回照片重试。Save保存副本，Done回照片；原图不变。",
      "重新识别前复核已有手工遮盖，识别后需重新确认；读图失败时可重试或重新选择照片。重新选择批次后重新扫描。"
    ],
    [
      [
        "待选图",
        "显示Choose Photos。"
      ],
      [
        "已选图",
        "展示照片预览与Scan Photos。"
      ],
      [
        "扫描中",
        "显示正在处理的照片序号，可取消；暂不可编辑。"
      ],
      [
        "扫描结果",
        "照片归入Found、No findings、Incomplete、Confirmed；数字表示照片张数，可打开对应分组复核。"
      ],
      [
        "单图复核",
        "进入复核时默认选中第一个遮盖框，可直接移动、缩放或移除；Confirm Photo确认当前照片。"
      ],
      [
        "导出",
        "仅导出已确认照片；显示准备进度、成功副本和失败张数，可保存或返回重试。"
      ],
      [
        "失败或取消",
        "保留已完成内容与错误说明；可读照片仍可手工复核，无法读取时重试或换图。"
      ]
    ]
  ],
  "redact": [
    "Auto Redact",
    "识别照片中的敏感内容（如电话号码、邮箱、证件号、车牌号），自动添加遮盖框。确认后生成打码副本，原图不变。",
    [],
    "任一检测类型未完成都不能据零候选判定没有隐私信息；用户可手工补充遮盖。",
    [
      "选一张照片后自动识别；最多20MB、2400万像素。Change Photo选择可读新图后替换旧图；取消或全部无效保留原编辑。",
      "点击框是选中；拖动新增或移动，拖动角部缩放；Remove Cover移除选中框，Undo撤销上步修改。任何修改使旧输出失效，保存前重新复核。",
      "Save Copy将当前遮盖写入原尺寸PNG像素；成功后保存副本，Done回编辑；失败保留原图和编辑，可重试。",
      "重新识别后复核当前遮盖；返回询问Discard Edits或Keep Editing；放弃后回Privacy，重入从选图开始，原图和已保存副本保留。"
    ],
    [
      [
        "待选图",
        "Choose Photo选择一张图片。"
      ],
      [
        "识别中",
        "显示处理状态，可取消。"
      ],
      [
        "编辑",
        "识别完成后默认选中第一个遮盖框；点Add Cover则选中新加的框，可以直接移动或缩放。"
      ],
      [
        "副本结果",
        "展示生成副本与保存入口；Done返回编辑。"
      ],
      [
        "失败或取消",
        "显示原因，可换图、重试或手工处理可读照片。"
      ]
    ]
  ],
  "metadata": [
    "Metadata Clean",
    "查看照片中的位置、相机、镜头和拍摄时间等信息，并生成移除这些信息的副本。",
    [],
    "仅处理可读取的静态图片信息；副本准备成功不等于已经保存到系统相册。",
    [
      "选择最多12张静态照片，每张最多20MB、2400万像素；选图后自动读取。Change Photos选择可读新批次后替换；取消或全部无效保留当前批次。",
      "Camera由读到的品牌/型号组成；时间来自照片记录，位置显示实际经纬度并保留5位小数。缺失字段不补造，0经纬度是有效值而非未知。",
      "Clean N Photos中的N是有可清理字段且读取成功的照片数，N为0时不提供清理操作；i of N表示当前处理照片序号。",
      "生成副本后再次检查可清理字段；仍有字段则该图失败。成功副本数与失败张数分别统计，Removed列表是成功副本已移除字段名的汇总，不代表每张都含所有字段。",
      "单张保存PNG、多张ZIP，保留原像素尺寸；Save保存副本，Done回照片。读取失败可重试该图，导出失败可返回再试；原文件不被改写。"
    ],
    [
      [
        "待选图",
        "Choose Photos选择照片。"
      ],
      [
        "读取中",
        "显示正在读取的照片序号，可取消。"
      ],
      [
        "读取结果",
        "只展示实际读到的字段；无可清理字段与读取失败分别说明。"
      ],
      [
        "清理中",
        "处理有可清理字段且读取成功的照片，可取消。"
      ],
      [
        "副本结果",
        "展示成功副本与已移除字段；部分失败分别提示，可保存成功项或返回重试。"
      ],
      [
        "失败或取消",
        "保留原图、已读结果及错误，可重试或重新选图。"
      ]
    ]
  ]
};
 docs['calendar-guide']=["Calendar Clean · 权限教程", "指导用户在系统设置完成Calendar Clean所需设置。", [], "", ["进入从第1步开始；步骤号为当前序号/4，每2.2秒轮播。点击分页或左右滑动切换；后台、离开及减少动态时停止自动播放。", "按路径Privacy & Security→Calendars→本应用→Full Access手动完成设置；教程图片与分页本身不授予权限。", "返回回Calendar Clean；打开设置失败时留在教程，可重试。", "从系统设置返回后重新确认日历权限，由用户再次发起扫描；权限不足时保留说明和设置入口。"], [["教程", "四步图片、分页与Open Settings。"], ["打开设置", "避免重复点击；失败时保留当前步骤并允许重试。"]]];
 docs.settings=['Settings','会员入口置顶；下方按用途分组。',[],'', ['会员入口打开价格页；Change Passcode 打开密码验证；Privacy Policy 与 Terms of Use 分别打开独立页面。','返回恢复上一个页面。未设过密码时，先进入 Vault 设置。'],[['会员','可查看周会员价格与权益。'],['更改密码','验证原密码后修改该密码对应的保险箱；不显示另一套密码或相册是否存在。']]];
 docs['privacy-policy']=['Privacy Policy','说明网页预览的照片处理和 Vault 会话。',[],'',['阅读后可返回 Settings。'],[['照片','在浏览器中处理，保存时下载副本。'],['Vault','仅保持在当前页面会话，刷新或关闭页面会结束。']]];
 docs['terms-of-use']=['Terms of Use','展示网页预览的使用说明。',[],'',['阅读后可返回 Settings。'],[['会员','可查看价格，不发生扣费或开通订阅。'],['遮盖','分享前复核副本并补足漏遮。']]];
 docs.membership=['Membership','展示周会员的权益与价格。',[],'', ['返回 Settings。'],[['权益','Safari 广告拦截、照片打码、私密保险箱。'],['价格','首周 $0.99，此后每周 $9.99；每周自动续订，可随时取消。']]];
 docs.about=['About','展示应用名称。',[],'',['返回 Settings。'],[['应用','SecurityCenter。']]];
 docs['settings-passcode-verify']=['输入当前密码','使用六位数字密码验证。',[],'',['输入满六位后继续。返回 Settings 放弃修改。'],[['无效密码','提示重试；连续五次错误后等待 30 秒。']]];
 docs['settings-passcode-new']=['输入新密码','新密码由六位数字组成。',[],'',['不能使用任何已设置的密码；输入后进入确认。'],[['返回','回到当前密码验证。']]];
 docs['settings-passcode-confirm']=['确认新密码','再次输入新密码，确认并保存后才生效。',[],'',['两次输入不一致时可重新输入。返回上一步不保存。'],[['保存成功','返回 Settings；旧密码失效，原媒体及另一套密码不变。'],['保存失败','旧密码仍可使用，不改动原有媒体。']]];
 const left=document.createElement('aside'),right=document.createElement('aside');left.className='preview-panel preview-left';right.className='preview-panel preview-right';left.setAttribute('aria-label','状态调试');right.setAttribute('aria-label','功能需求');document.body.append(left,right);

 function click(s){const b=$(s);if(b&&!b.disabled)b.click();}
 function btn(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{try{action();}catch(e){state=e.message;draw();}};left.querySelector('.debug-buttons').append(b);}
 function draw(){const d=docs[context]||docs.clean;left.hidden=false;left.innerHTML='<h2>状态切换</h2><div class="debug-buttons"></div>';right.innerHTML='<h2>'+d[0]+'</h2><p class="spec-purpose"></p><h3>页面展示</h3><table class="spec-states"><thead><tr><th scope="col">状态</th><th scope="col">展示内容</th>'+ (d[5].some(r=>r.length>2)?'<th scope="col">iOS 原生行为</th>':'') +'</tr></thead><tbody></tbody></table><h3>交互流程</h3><ol class="spec-interactions"></ol><p class="spec-boundary"></p>';right.querySelector('.spec-purpose').textContent=d[1];d[5].forEach(row=>{const tr=document.createElement('tr');row.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});right.querySelector('.spec-states tbody').append(tr);});d[4].forEach(t=>{const li=document.createElement('li');li.textContent=t;right.querySelector('.spec-interactions').append(li);});right.querySelector('.spec-boundary').textContent=d[3];

 if(['clean','web','calendar','calendar-guide','sms','sms-guide','sms-rules','sms-find','call','call-guide','call-list','call-add'].includes(context)){const note=document.createElement('p');note.className='preview-fixture-note';note.textContent='演示状态与本地样例；不读取日历、短信或通话。';left.append(note);}
 if(context==='calendar'){
 const {stage,permission}=calendarState;
 const add=(id,label)=>btn(label,()=>window.calendarPreview.fixture(id));
 const choice=(label,options)=>{const field=document.createElement('label');field.textContent=label;const select=document.createElement('select');select.setAttribute('aria-label',label);select.style.cssText='display:block;width:100%;min-height:38px;margin-top:6px;padding:8px;border:1px solid #dbe6e0;border-radius:10px;background:white;font:inherit';const prompt=new Option('请选择模拟条件','');prompt.disabled=true;prompt.selected=true;select.add(prompt);options.forEach(([value,text])=>select.add(new Option(text,value)));select.value=calendarChoices[label]||'';select.onchange=()=>{calendarChoices[label]=select.value;window.calendarPreview.fixture(select.value);};field.append(select);left.querySelector('.debug-buttons').append(field);};
 if(['ready','denied','restricted'].includes(stage)){
  if(stage==='ready')add('restricted','模拟系统限制');
  if(stage!=='ready'||permission!=='notDetermined')add('reset-permission','重试首次授权（模拟）');
  if(stage==='ready'&&permission==='fullAccess'){
   choice('下次扫描的模拟条件',[['content','恢复扫描样例'],['empty-calendar','范围内无事件'],['empty','无匹配']]);
  }
 }
 if(stage==='detail')add('readonly','切换此事件可写 / 只读（模拟）');
 const fixtureNote=document.createElement('p');fixtureNote.className='preview-fixture-note';fixtureNote.textContent=calendarState.fixtureNote||'';left.append(fixtureNote);
 left.hidden=!left.querySelector('.debug-buttons button,.debug-buttons select');return;}
 if(context==='clean'){
 btn('模拟系统扩展已启用',()=>window.previewApp.web('off'));
 btn('模拟系统扩展未启用',()=>window.previewApp.web('setup'));
 }
 else if(context==='sms'){btn('首次设置（模拟）',()=>window.smsController.debug('off'));}
 else if(context==='call'){const c=window.callController;[['welcome','首次设置（模拟）'],['off','模拟系统扩展关闭'],['on','模拟系统扩展开启']].forEach(([s,l])=>btn(l,()=>c.debug(s)));}
 else if(context==='call-list'){[['waiting','系统扩展未启用']].forEach(([s,l])=>btn(l,()=>window.callController.debug(s)));}
 else {left.hidden=true;}
 left.hidden=!left.querySelector('.debug-buttons button,.debug-buttons select');
 }
 const performancePage=document.querySelector('#test-detail');if(performancePage)new MutationObserver(()=>{if(['speed','cpu','display'].includes(context))left.hidden=!!performancePage.querySelector('.test-history-list');}).observe(performancePage,{childList:true,subtree:true});
 window.addEventListener('test-preview-mode',e=>{left.querySelector('.test-sample-label')?.remove();if(e.detail.sample){const label=document.createElement('p');label.className='preview-state test-sample-label';label.textContent='当前为样例演示';left.querySelector('h2').after(label);}});
 window.addEventListener('load',()=>{if(context==='clean')draw();});
 window.addEventListener('preview-context',e=>{context=e.detail.key;state=e.detail.state||'';if(context==='calendar'){if(calendarState.stage!==e.detail.stage)calendarChoices={};calendarState=e.detail;}draw();});draw();
})();
